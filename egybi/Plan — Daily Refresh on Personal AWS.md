# Plan: the daily refresh on the personal AWS account

Written 2026-11-15 after a read-only check of the personal AWS account (526741671869, pinned through `deploy/aws/personal_sso.py`, which refuses any other account). Nothing has been created yet. Every resource below needs Ahmed's yes first, with its free limit named.

## What the check found

| Question | Answer (measured 15 Nov) |
|---|---|
| Account plan | **PAID**, active, $0 credits left (`freetier:GetAccountPlanState`) |
| Free offers on the account | 10, every one **"Always Free"**. There is no 12-month offer. |
| Free-tier-eligible EC2 instance types in eu-central-1 | **none** (`DescribeInstanceTypes`, filter `free-tier-eligible=true`) |
| Budgets | one: "My Monthly Cost Budget", $20 a month. No $1 alert. |
| November cost so far | $1.3375, mostly the Identity Center KMS key (see the forex project's notes) |
| Lambda use so far this month | 60,487 GB-s of the 400,000 always free (forecast 120,974) |
| Scheduled invocations | 16,719 of the 14,000,000 always free |
| CloudWatch alarms | about 3.3 of the 10 always free |
| EC2 | no instances, no Elastic IPs; the default VPC has no IPv6 |

## Decision: no runner server

A self-hosted GitHub runner on EC2 is **not free on this account**. No instance type is free-tier-eligible, so a t3.micro would bill from its first hour, plus about $3.60 a month for its public IPv4 address. A free-sized instance also could not run the browser sweep, because Chromium over 182 pages needs more than 1 GB of memory. Rejected.

## What the account can do for free: run the daily refresh itself

The price and FX refreshes are standard-library Python plus this repo's own modules. They import nothing from pip, which was checked script by script. So AWS Lambda's stock Python runtime can run the **same scripts** the GitHub workflows run, with nothing to install.

What that buys:

1. **On time.** EventBridge Scheduler starts it at 07:20 UTC, against GitHub's 6 to 9 hours late. This replaces the Hostinger cron plan (round 1 item 1), which then needs no hPanel step.
2. **Independent of GitHub Actions minutes.** The daily data keeps flowing when the repo is private and the month's minutes are spent. A day with no PR then costs Actions nothing.
3. **One less thing on the workstation.** The 13:30 and 17:30 Cairo manual refresh task can stand down for good.

### How one run works

1. Read the GitHub token from SSM Parameter Store (a SecureString).
2. Download the tarball of `main` at its current commit from GitHub's API into `/tmp`, about 10 MB.
3. Run the workflow's own steps, unchanged: `fetch_prices.py`, the stale-data check, `static-audit.py`, `build_prices_pages.py`, `build_food_prices.py` and `sitemap_lastmod.py`. FX runs `fetch_fx.py` and `build_currency_story.py` the same way.
4. Compare the files with the tarball. If nothing changed, stop.
5. Otherwise make one commit through GitHub's Git Data API, with the same message the workflow uses (`[skip ci]`). Update `main` only if it still points at the commit that was downloaded. If `main` moved, start again from the new tip, which is the same rule `push-with-regenerate.sh` follows: generated files are rebuilt, never merged.
6. Ping IndexNow with the changed URLs, as the workflow does.
7. On any failure, open or comment on a GitHub issue, as `notify-failure` does. There is no email, so nothing is sent in Ahmed's name.
8. Every step's time limit is the smaller of 10 minutes and the time left before Lambda's 15-minute limit, minus 45 seconds kept back. A run that is running out of time stops and opens the alert, rather than being killed silently. A failed IndexNow ping after a good commit is logged, not treated as a failure.

The GitHub schedules stay as a backup. If the Lambda has already refreshed, a later GitHub run finds nothing changed and commits nothing.

### Resources and their free limits

| Resource | Use | Always-free limit | Expected use |
|---|---|---|---|
| AWS Budgets: $1 cost alert | warns before anything costs money | budgets without actions are free | 1 budget |
| IAM role for the function | read one SSM parameter, write its own logs | IAM is free | 1 role |
| Lambda function `egybi-daily-refresh` (Python 3.12, arm64, 1024 MB, 15 min timeout, no automatic retry) | the run above | 400,000 GB-s and 1M requests a month | about 2 runs a day × about 90 s × 1 GB = about 5,500 GB-s a month (1.4%) |
| EventBridge Scheduler: 2 schedules (prices 07:20 UTC, FX 07:26 UTC) | starts it on time | 14,000,000 invocations a month | about 60 |
| CloudWatch log group, 14-day retention | the run logs | 5 GB ingest and storage | under 10 MB |
| SSM parameter `/egybi/github-token` (Standard, SecureString) | the token | Standard parameters are free | 1 |

**One honest exception.** Each run decrypts the token once with the free `aws/ssm` key. The account is already past KMS's 20,000 free requests this month (73,030 by 15 November, from the forex bot decrypting its secrets on every call). So these 60 decrypts cost about **$0.0002 a month**. Fixing the forex bot to cache its secrets would bring KMS back under the free 20,000 and make both projects $0. That is a separate change in the forex project.

### Steps, in order

| # | Who | Step | Prove | Roll back |
|---|---|---|---|---|
| 1 | Claude, after a yes | Create the $1 budget alert | `budgets:DescribeBudgets` lists it | delete the budget |
| 2 | Ahmed | Create a fine-grained GitHub token: egybi only; Contents read and write, Issues read and write; one-year expiry | — | revoke it on GitHub |
| 3 | Ahmed | AWS console → Systems Manager → Parameter Store → Create parameter: name `/egybi/github-token`, tier Standard, type SecureString, key `alias/aws/ssm`; paste the token. Claude never sees it. | Claude reads only that the parameter exists, never the value | delete the parameter |
| 4 | Claude, PR | Add `backend/ops/lambda_refresh/` (handler, deploy script, tests against a fake GitHub API) and a Changelog entry; CI green | Test (pipeline) green | close the PR |
| 5 | Ahmed's yes | Merge the PR | main green | revert |
| 6 | Claude, after a yes | `python backend/ops/deploy_lambda_refresh.py --apply` deploys the two roles, the function, the log group and both schedules. The schedules are created **disabled**. | the script's status shows each resource, schedules `DISABLED` | `--remove` |
| 7 | Claude | One manual test run with dry-run on (no commit): `--dry-run prices`, then `--dry-run fx` | the log shows each step and "would commit N files" | — |
| 8 | Ahmed's yes | The first live run, `python backend/ops/deploy_lambda_refresh.py --run prices` and then `--run fx`. It pushes to main, so it is a live change. | commit on main, live `prices-today.json` equals main by blob hash | revert the commit |
| 9 | Claude | `--enable-schedules`, then watch the next two scheduled mornings | runs created by 07:30 UTC, data dated today before 09:00 UTC | disable the two schedules |

### Order against going private

Step 4 needs CI. Once the repo is private, CI stops until 1 December, because November's private minutes are used up. So:

- **Option A (recommended):** stay public until steps 4–8 are done (about a day after the token exists), then make the repo private. The daily data never stops.
- **Option B:** go private straight after #113. The workstation task keeps the daily data going, and the Lambda is built from 1 December.

## Not done here

- PR CI (Verify (browser)) has no free home on this account. It stays on GitHub-hosted runners, so in November a private repo cannot merge anything. AWS CodeBuild's free 100 build minutes a month (still to be confirmed as always free) would cover about two full sweeps. That is too few to rely on.
- Nothing here sends email. Failures surface as GitHub issues, the same way they do now.
