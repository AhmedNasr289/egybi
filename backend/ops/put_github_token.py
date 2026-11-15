"""Save the EgyBI daily-refresh GitHub token into AWS SSM, for Ahmed to run.

    python backend\\ops\\put_github_token.py

It asks for the token with the input hidden. It checks with GitHub that the
token can read the egybi repo, and refuses a token GitHub rejects. Only then
does it store the token as an SSM SecureString (/egybi/github-token,
alias/aws/ssm) in the personal account. The token is never printed, logged or
written to disk; only its SSM version number is shown.

The AWS session comes from the forex project's personal_sso.py, which refuses
any account but 526741671869. If the sign-in has expired, run:
    python C:\\dev\\forex-trading\\deploy\\aws\\personal_sso.py login
"""
from __future__ import annotations

import getpass
import json
import sys
import urllib.error
import urllib.request

ACCOUNT = "526741671869"
REGION = "eu-central-1"
NAME = "/egybi/github-token"
REPO = "AhmedNasr289/egybi"
SSO_DIR = r"C:\dev\forex-trading\deploy\aws"


def github_ok(token: str) -> tuple[bool, str]:
    """Can this token read the repo's main branch? Returns (ok, reason)."""
    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/git/ref/heads/main", headers={
        "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "egybi-token-setup"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            sha = json.loads(r.read())["object"]["sha"]
        return True, f"GitHub accepted the token (main is at {sha[:7]})"
    except urllib.error.HTTPError as e:
        code = e.code
        e.close()
        why = {401: "the token is wrong or expired", 403: "the token lacks access",
               404: "the token cannot see the egybi repository"}.get(code, "unexpected answer")
        return False, f"GitHub refused the token: HTTP {code} ({why})"


def main() -> int:
    sys.path.insert(0, SSO_DIR)
    try:
        import personal_sso
        s = personal_sso.session()
        acct = s.client("sts").get_caller_identity()["Account"]
    except Exception as e:
        print(f"AWS sign-in is not ready ({type(e).__name__}). Run:")
        print(r"    python C:\dev\forex-trading\deploy\aws\personal_sso.py login")
        return 2
    if acct != ACCOUNT:
        print(f"Refusing: signed in to account {acct}, not {ACCOUNT}.")
        return 2

    token = getpass.getpass("Paste the GitHub token (it will not show), then press Enter: ").strip()
    if not token.startswith(("github_pat_", "ghp_")):
        print("That does not look like a GitHub token (it should start with github_pat_). Nothing was saved.")
        return 1
    ok, reason = github_ok(token)
    print(reason)
    if not ok:
        print("Nothing was saved.")
        return 1

    r = s.client("ssm", region_name=REGION).put_parameter(
        Name=NAME, Value=token, Type="SecureString", KeyId="alias/aws/ssm", Tier="Standard",
        Overwrite=True, Description="EgyBI daily refresh: fine-grained GitHub token (egybi only)")
    del token
    print(f"Saved to SSM {NAME} in {REGION} (version {r['Version']}). Tell Claude the token is in.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
