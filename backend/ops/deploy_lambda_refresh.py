"""Deploy backend/ops/lambda_refresh.py to the PERSONAL AWS account.

    python backend/ops/deploy_lambda_refresh.py                 # read-only: what exists, what would change
    python backend/ops/deploy_lambda_refresh.py --apply         # create/update; schedules stay DISABLED
    python backend/ops/deploy_lambda_refresh.py --dry-run prices  # invoke once with dry_run (writes nothing)
    python backend/ops/deploy_lambda_refresh.py --run prices      # ONE live run: commits to main (needs Ahmed's yes)
    python backend/ops/deploy_lambda_refresh.py --enable-schedules
    python backend/ops/deploy_lambda_refresh.py --budget 1      # a $LIMIT/month cost alert, same recipients as the existing budget
    python backend/ops/deploy_lambda_refresh.py --remove        # delete everything this script made

Credentials come only from the forex project's personal_sso.py, which refuses
any account but 526741671869 and the TP work account by name. Every resource is
inside AWS's always-free allowance; see egybi/Plan — Daily Refresh on Personal AWS.md.
The GitHub token is NOT handled here: Ahmed puts it in SSM himself, and this
script only checks that the parameter exists.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
import zipfile
from pathlib import Path

ACCOUNT = "526741671869"
REGION = "eu-central-1"
FUNCTION = "egybi-daily-refresh"
ROLE = "egybi-daily-refresh-role"
SCHED_ROLE = "egybi-daily-refresh-scheduler"
TOKEN_PARAM = "/egybi/github-token"
LOG_GROUP = f"/aws/lambda/{FUNCTION}"
SCHEDULES = {  # name: (cron in UTC, job) - a few minutes after the GitHub crons they back up
    "egybi-refresh-prices": ("cron(20 7 * * ? *)", "prices"),
    "egybi-refresh-fx": ("cron(26 7 * * ? *)", "fx"),
}
# For synchronous invokes. botocore's defaults (60 s read timeout, retries on a
# read timeout) would invoke the function AGAIN whenever a run took longer than
# a minute. One attempt, and wait as long as Lambda itself may run.
INVOKE_CONFIG = {"read_timeout": 910, "connect_timeout": 10, "retries": {"total_max_attempts": 1}}
HERE = Path(__file__).resolve().parent
SSO_DIR = Path(os.environ.get("EGYBI_PERSONAL_SSO_DIR", r"C:\dev\forex-trading\deploy\aws"))


def session():
    sys.path.insert(0, str(SSO_DIR))
    import personal_sso  # noqa: E402  (refuses every account but the personal one)
    s = personal_sso.session()
    acct = s.client("sts").get_caller_identity()["Account"]
    if acct != ACCOUNT:
        raise SystemExit(f"refusing account {acct}: only {ACCOUNT} is allowed")
    return s


def package() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(HERE / "lambda_refresh.py", "lambda_refresh.py")
    return buf.getvalue()


def exists(fn, *a, **k) -> bool:
    try:
        fn(*a, **k)
        return True
    except Exception as e:
        if "NotFound" in type(e).__name__ or "NoSuchEntity" in str(e) or "ResourceNotFound" in str(e) or "ParameterNotFound" in str(e):
            return False
        raise


def status(s) -> dict:
    iam, lam, sch = s.client("iam"), s.client("lambda", region_name=REGION), s.client("scheduler", region_name=REGION)
    ssm = s.client("ssm", region_name=REGION)
    out = {
        # Existence only. The value is never read here.
        "token_parameter": bool(ssm.describe_parameters(
            ParameterFilters=[{"Key": "Name", "Values": [TOKEN_PARAM]}])["Parameters"]),
        "role": exists(iam.get_role, RoleName=ROLE),
        "scheduler_role": exists(iam.get_role, RoleName=SCHED_ROLE),
        "function": exists(lam.get_function, FunctionName=FUNCTION),
    }
    for name in SCHEDULES:
        try:
            out[name] = sch.get_schedule(Name=name)["State"]
        except Exception as e:
            if "ResourceNotFound" not in type(e).__name__:
                raise
            out[name] = "absent"
    return out


def ensure_role(iam, name: str, service: str, policy: dict) -> str:
    trust = {"Version": "2012-10-17", "Statement": [
        {"Effect": "Allow", "Principal": {"Service": service}, "Action": "sts:AssumeRole"}]}
    if not exists(iam.get_role, RoleName=name):
        iam.create_role(RoleName=name, AssumeRolePolicyDocument=json.dumps(trust),
                        Description="EgyBI daily refresh (egybi repo, backend/ops)")
    iam.put_role_policy(RoleName=name, PolicyName="egybi-daily-refresh", PolicyDocument=json.dumps(policy))
    return iam.get_role(RoleName=name)["Role"]["Arn"]


def apply(s) -> None:
    iam, lam = s.client("iam"), s.client("lambda", region_name=REGION)
    logs, sch = s.client("logs", region_name=REGION), s.client("scheduler", region_name=REGION)
    fn_arn = f"arn:aws:lambda:{REGION}:{ACCOUNT}:function:{FUNCTION}"
    role = ensure_role(iam, ROLE, "lambda.amazonaws.com", {"Version": "2012-10-17", "Statement": [
        {"Effect": "Allow", "Action": "ssm:GetParameter",
         "Resource": f"arn:aws:ssm:{REGION}:{ACCOUNT}:parameter{TOKEN_PARAM}"},
        {"Effect": "Allow", "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
         "Resource": f"arn:aws:logs:{REGION}:{ACCOUNT}:log-group:{LOG_GROUP}:*"}]})
    sched_role = ensure_role(iam, SCHED_ROLE, "scheduler.amazonaws.com", {"Version": "2012-10-17", "Statement": [
        {"Effect": "Allow", "Action": "lambda:InvokeFunction", "Resource": fn_arn}]})
    try:
        logs.create_log_group(logGroupName=LOG_GROUP)
    except logs.exceptions.ResourceAlreadyExistsException:
        pass
    logs.put_retention_policy(logGroupName=LOG_GROUP, retentionInDays=14)

    env = {"Variables": {"EGYBI_REPO": "AhmedNasr289/egybi", "EGYBI_TOKEN_PARAM": TOKEN_PARAM}}
    if exists(lam.get_function, FunctionName=FUNCTION):
        lam.update_function_code(FunctionName=FUNCTION, ZipFile=package())
        lam.get_waiter("function_updated_v2").wait(FunctionName=FUNCTION)
        lam.update_function_configuration(FunctionName=FUNCTION, Role=role, Timeout=900, MemorySize=1024, Environment=env)
    else:
        for attempt in range(6):   # a new role takes a few seconds to be assumable
            try:
                lam.create_function(FunctionName=FUNCTION, Runtime="python3.12", Role=role,
                                    Handler="lambda_refresh.lambda_handler", Code={"ZipFile": package()},
                                    Timeout=900, MemorySize=1024, Architectures=["arm64"], Environment=env,
                                    Description="EgyBI daily price and FX refresh (repo backend/ops/lambda_refresh.py)")
                break
            except lam.exceptions.InvalidParameterValueException:
                if attempt == 5:
                    raise
                time.sleep(10)
    lam.get_waiter("function_active_v2").wait(FunctionName=FUNCTION)
    # One run per trigger: a failure alerts once; it is not retried into a second alert.
    lam.put_function_event_invoke_config(FunctionName=FUNCTION, MaximumRetryAttempts=0)

    for name, (cron, job) in SCHEDULES.items():
        args = dict(Name=name, ScheduleExpression=cron, ScheduleExpressionTimezone="UTC",
                    FlexibleTimeWindow={"Mode": "OFF"},
                    Target={"Arn": fn_arn, "RoleArn": sched_role, "Input": json.dumps({"job": job}),
                            "RetryPolicy": {"MaximumRetryAttempts": 0}})
        try:
            state = sch.get_schedule(Name=name)["State"]
            sch.update_schedule(State=state, **args)          # keep whatever state it is in
        except sch.exceptions.ResourceNotFoundException:
            sch.create_schedule(State="DISABLED", **args)     # new schedules start disabled


def invoke_config():
    from botocore.config import Config  # imported here so the tests need no botocore
    return Config(**INVOKE_CONFIG)


def invoke(s, job: str, dry: bool) -> dict:
    """One synchronous invocation, never retried. dry=False commits to main."""
    lam = s.client("lambda", region_name=REGION, config=invoke_config())
    r = lam.invoke(FunctionName=FUNCTION, InvocationType="RequestResponse", LogType="Tail",
                   Payload=json.dumps({"job": job, "dry_run": dry}))
    import base64
    print(base64.b64decode(r.get("LogResult", "")).decode(errors="replace"))
    result = r["Payload"].read().decode()
    print("result:", result, "| function error:", r.get("FunctionError"))
    return {"result": result, "error": r.get("FunctionError")}


def dry_run(s, job: str) -> dict:
    return invoke(s, job, dry=True)


def enable(s) -> None:
    sch = s.client("scheduler", region_name=REGION)
    for name in SCHEDULES:
        cur = sch.get_schedule(Name=name)
        keep = {k: cur[k] for k in ("ScheduleExpression", "ScheduleExpressionTimezone", "FlexibleTimeWindow", "Target")}
        sch.update_schedule(Name=name, State="ENABLED", **keep)


def budget(s, limit: str) -> None:
    b = s.client("budgets", region_name="us-east-1")
    existing = b.describe_budgets(AccountId=ACCOUNT).get("Budgets", [])
    name = f"EgyBI guard - ${limit} a month"
    if any(x["BudgetName"] == name for x in existing):
        print("budget already exists:", name); return
    subs = []
    for x in existing:
        for n in b.describe_notifications_for_budget(AccountId=ACCOUNT, BudgetName=x["BudgetName"]).get("Notifications", []):
            subs += b.describe_subscribers_for_notification(AccountId=ACCOUNT, BudgetName=x["BudgetName"],
                                                            Notification=n).get("Subscribers", [])
    subs = [dict(t) for t in {tuple(sorted(d.items())) for d in subs}]
    if not subs:
        raise SystemExit("no existing budget recipient to reuse; add the budget in the console instead")
    b.create_budget(AccountId=ACCOUNT,
                    Budget={"BudgetName": name, "BudgetLimit": {"Amount": limit, "Unit": "USD"},
                            "TimeUnit": "MONTHLY", "BudgetType": "COST"},
                    NotificationsWithSubscribers=[{"Notification": {
                        "NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN",
                        "Threshold": 100.0, "ThresholdType": "PERCENTAGE"}, "Subscribers": subs}])
    print("created budget:", name, "| recipients:", len(subs))


def remove(s) -> None:
    iam, lam = s.client("iam"), s.client("lambda", region_name=REGION)
    sch, logs = s.client("scheduler", region_name=REGION), s.client("logs", region_name=REGION)
    for name in SCHEDULES:
        try: sch.delete_schedule(Name=name)
        except sch.exceptions.ResourceNotFoundException: pass
    try: lam.delete_function(FunctionName=FUNCTION)
    except lam.exceptions.ResourceNotFoundException: pass
    for r in (ROLE, SCHED_ROLE):
        # Separately: a role whose policy is already gone must still be deleted.
        try: iam.delete_role_policy(RoleName=r, PolicyName="egybi-daily-refresh")
        except iam.exceptions.NoSuchEntityException: pass
        try: iam.delete_role(RoleName=r)
        except iam.exceptions.NoSuchEntityException: pass
    try: logs.delete_log_group(logGroupName=LOG_GROUP)
    except logs.exceptions.ResourceNotFoundException: pass


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--apply", action="store_true")
    g.add_argument("--dry-run", choices=["prices", "fx"])
    g.add_argument("--run", choices=["prices", "fx"], help="one LIVE run; it commits to main")
    g.add_argument("--enable-schedules", action="store_true")
    g.add_argument("--budget", metavar="USD")
    g.add_argument("--remove", action="store_true")
    a = ap.parse_args()
    s = session()
    if a.apply:
        apply(s)
    elif a.dry_run:
        dry_run(s, a.dry_run)
    elif a.run:
        invoke(s, a.run, dry=False)
    elif a.enable_schedules:
        enable(s)
    elif a.budget:
        budget(s, a.budget)
    elif a.remove:
        remove(s)
    print(json.dumps({"account": ACCOUNT, "region": REGION, **status(s)}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
