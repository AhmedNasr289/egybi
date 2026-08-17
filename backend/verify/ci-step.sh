#!/usr/bin/env bash
# Run one checker, keep what it said, and record that it failed.
#
# Verify (browser) runs seventeen checkers with `if: always()`, so a red run
# names no step in its summary and its failure alert said only "the workflow
# failed". Issue #54 collected three days of that — the diagnosis existed, in a
# log somebody had to go and open, while the alert carried none of it. Every
# checker here already prints the page and the finding; the whole fix is to not
# throw that away.
#
#   ci-step.sh tap-targets node backend/verify/tap-targets.js
#
# Writes the output to $VERIFY_LOG_DIR/<name>.log (uploaded as an artifact) and,
# on failure, appends <name> to $VERIFY_LOG_DIR/FAILED so the collect step knows
# which logs to read without having to guess from GitHub's step statuses.
#
# set -o pipefail is load-bearing: without it the exit status of `cmd | tee` is
# tee's, which is always 0, and every failing checker would turn the run green.
# This project has already proven that in both directions.
set -o pipefail

name="$1"; shift
: "${VERIFY_LOG_DIR:=${RUNNER_TEMP:-/tmp}/verify-logs}"
mkdir -p "$VERIFY_LOG_DIR"

"$@" 2>&1 | tee "$VERIFY_LOG_DIR/$name.log"
status=$?

if [ "$status" -ne 0 ]; then
  printf '%s\n' "$name" >> "$VERIFY_LOG_DIR/FAILED"
fi
exit "$status"
