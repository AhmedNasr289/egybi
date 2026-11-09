#!/usr/bin/env bash
# Decide what the browser sweep needs to run, before paying for it.
#
# Why this exists: on 2026-11-08 GitHub stopped starting jobs ("recent account
# payments have failed or your spending limit needs to be increased"). The
# private repo's 2,000 free minutes for the month were gone by the 7th:
# measured from job start/finish times, November had used 1,963 minutes, and
# Verify (browser) was 2,055 of the 2,366 minutes since 1 October. One run is
# about 38 minutes (mutate.py alone 17.5), and every change paid it twice:
# once on the pull request and again on the merge to main, although a
# `--merge` merge commit is byte-for-byte the tree the pull request already
# passed. With the minutes gone, the daily price and FX refreshes stop too.
#
# Two decisions, both written to $GITHUB_OUTPUT:
#   run=false    a push whose merge commit has exactly the tree of its second
#                parent (the PR head), when Verify (browser) already SUCCEEDED
#                on that head. Nothing new reaches main, so nothing new needs
#                checking.
#   mutate=false mutate.py tests the CHECKERS. It runs when a checker, this
#                workflow, this script, or a file mutate.py itself edits has
#                changed, and on every scheduled or manual run, so a page edit
#                that breaks one of its anchors is caught within a week.
#
# It fails OPEN: any error or missing input leaves run=true and mutate=true.
# A gate that skipped checks because it could not read the history would be
# the silent pass this repo keeps finding.
#
# Inputs (env): EVENT, BEFORE (push), REPO, GH_TOKEN.
# Local use: EVENT=push BEFORE=<sha> REPO=owner/name bash verify-gate.sh
# (GITHUB_OUTPUT unset prints the decision instead).
set -u

run=true
mutate=true
out="${GITHUB_OUTPUT:-/dev/stdout}"

say() { echo "verify-gate: $*"; }

finish() {
  echo "run=$run" >> "$out"
  echo "mutate=$mutate" >> "$out"
  say "run=$run mutate=$mutate"
  exit 0
}

case "${EVENT:-}" in
  schedule|workflow_dispatch)
    say "full sweep for a $EVENT run"
    finish ;;
  pull_request)
    # actions/checkout checks out refs/pull/N/merge: parent 1 is the base.
    from=$(git rev-parse -q --verify HEAD^1) || { say "no base parent; full sweep"; finish; }
    ;;
  push)
    from="${BEFORE:-}"
    if [ -z "$from" ] || [ "$from" = "0000000000000000000000000000000000000000" ] \
       || ! git cat-file -e "$from^{commit}" 2>/dev/null; then
      say "push without a usable 'before' commit; full sweep"
      finish
    fi
    ;;
  *)
    say "unknown event '${EVENT:-}'; full sweep"
    finish ;;
esac

# --- run: is this push a merge that adds nothing a PR run did not already see?
if [ "$EVENT" = "push" ] && head2=$(git rev-parse -q --verify HEAD^2); then
  if [ "$(git rev-parse HEAD^{tree})" = "$(git rev-parse "$head2^{tree}")" ]; then
    if [ -n "${REPO:-}" ] && passed=$(gh api \
         "repos/$REPO/actions/runs?head_sha=$head2&event=pull_request&status=success&per_page=50" \
         --jq '[.workflow_runs[] | select(.name == "Verify (browser)")] | length' 2>/dev/null) \
       && [ "${passed:-0}" -gt 0 ]; then
      run=false
      say "merge tree equals PR head ${head2:0:12}, whose sweep passed; skipping the repeat"
      mutate=false
      finish
    fi
    say "merge tree equals PR head ${head2:0:12}, but no passing sweep found for it; running"
  else
    say "merge tree differs from its PR head; running"
  fi
fi

# --- mutate: did anything the check-on-the-checks depends on change?
changed=$(git diff --name-only "$from" HEAD) || { say "cannot diff $from..HEAD; full sweep"; finish; }
mutate=false
while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$f" in
    backend/verify/*|.github/workflows/verify-browser.yml|.github/scripts/verify-gate.sh)
      mutate=true; say "mutate.py needed: $f changed"; break ;;
  esac
  # A file mutate.py edits: a change to it can move the text a case anchors on.
  if grep -qF -- "$f" backend/verify/mutate.py; then
    mutate=true; say "mutate.py needed: it edits $f"; break
  fi
done <<< "$changed"
[ "$mutate" = true ] || say "no checker or mutated file changed ($(printf '%s\n' "$changed" | grep -c .) files); mutate.py waits for the weekly run"
finish
