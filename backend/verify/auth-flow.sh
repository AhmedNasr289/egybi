#!/usr/bin/env bash
# The account endpoints, end to end, against a throwaway SQLite database.
#
# Starts PHP's built-in server on site/, signs two users up and walks every
# account action through curl, then reads the database directly to prove a
# deletion removed every row it should. No PHP on the authoring workstation,
# so this runs in CI only (Verify (browser), static half).
#
# What it guards: the server half of sign-up and sign-in (auth.php), and the
# 2026-11-09 additions: saved trips and places, export, account deletion.
# Exit 1 on the first wrong answer, printing what came back.
set -uo pipefail

PORT=8794
BASE="http://127.0.0.1:$PORT"
WORK=$(mktemp -d)
DB="$WORK/auth.sqlite"
JAR_A="$WORK/a.jar"; JAR_B="$WORK/b.jar"
fails=0

php -m | grep -qi '^pdo_sqlite$' || { echo "FAIL: PHP has no pdo_sqlite, cannot run"; exit 2; }

HKEY=ci-health-key-0123456789abcdef
# With no SMTP configured, send_mail() and the reset path write one line per
# email to site/auth/_private/mail.log. The checks below count those lines, so
# the folder must exist (file_put_contents is silenced and would fail quietly).
MAILDIR=site/auth/_private; MAILLOG=$MAILDIR/mail.log
MADE_MAILDIR=0; [ -d "$MAILDIR" ] || { mkdir -p "$MAILDIR"; MADE_MAILDIR=1; }
: > "$MAILLOG"
AUTH_DB_DRIVER=sqlite AUTH_SQLITE_PATH="$DB" AUTH_SECURE_COOKIE=0 APP_URL="$BASE" ANALYTICS_KEY="$HKEY" \
  php -S "127.0.0.1:$PORT" -t site >"$WORK/server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$WORK"; rm -f "$MAILLOG"; [ "$MADE_MAILDIR" = 1 ] && rmdir "$MAILDIR" 2>/dev/null' EXIT
for i in $(seq 1 50); do curl -fsS -o /dev/null "$BASE/auth/auth.php?action=me" && break; sleep 0.1; done

# call JAR METHOD ACTION [JSON] [extra curl args...] -> prints "STATUS BODY"
call() {
  local jar=$1 method=$2 action=$3 data=${4:-}; shift 4 2>/dev/null || shift $#
  local args=(-s -o "$WORK/body" -w '%{http_code}' -b "$jar" -c "$jar" -X "$method"
              -H 'Content-Type: application/json' "$@")
  [ -n "$data" ] && args+=(--data "$data")
  local code; code=$(curl "${args[@]}" "$BASE/auth/auth.php?action=$action")
  echo "$code $(cat "$WORK/body")"
}
expect() {  # expect NAME WANT_STATUS GOT [must-contain]
  local name=$1 want=$2 got=$3 needle=${4:-}
  local code=${got%% *}
  if [ "$code" != "$want" ] || { [ -n "$needle" ] && [[ "$got" != *"$needle"* ]]; }; then
    echo "FAIL  $name: wanted $want${needle:+ containing $needle}, got: ${got:0:300}"; fails=$((fails+1))
  else
    echo "ok    $name"
  fi
}
field() { php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j[$argv[1]] ?? "";' "$1"; }
sql() { php -r '$d=new PDO("sqlite:".$argv[1]); echo $d->query($argv[2])->fetchColumn();' "$DB" "$1"; }

A='{"email":"a@example.org","password":"correct horse battery"}'
B='{"email":"b@example.org","password":"another long secret"}'

expect "sign up A"                200 "$(call "$JAR_A" POST signup "$A")" '"ok":true'
expect "sign up B"                200 "$(call "$JAR_B" POST signup "$B")" '"ok":true'
tok=$(sql "SELECT token FROM auth_tokens WHERE kind='verify' ORDER BY rowid LIMIT 1")
expect "verify A's email"         200 "$(call "$JAR_A" GET "verify&token=$tok")" 'verified'
expect "wrong password refused"   401 "$(call "$JAR_A" POST login '{"email":"a@example.org","password":"nope nope nope"}')"
r=$(call "$JAR_A" POST login "$A"); expect "sign in A" 200 "$r" '"csrf"'
CA=$(echo "${r#* }" | field csrf)
r=$(call "$JAR_B" POST login "$B"); expect "sign in B" 200 "$r" '"csrf"'
CB=$(echo "${r#* }" | field csrf)
expect "me shows A"               200 "$(call "$JAR_A" GET me)" 'a@example.org'
grep -qi 'httponly' "$JAR_A" 2>/dev/null || [ "$(grep -c '#HttpOnly_' "$JAR_A")" -gt 0 ] \
  && echo "ok    session cookie is HttpOnly" || { echo "FAIL  session cookie is not HttpOnly"; fails=$((fails+1)); }

TRIP='{"title":"Cairo and Luxor","data":{"days":[{"place":"giza"},{"place":"karnak"}]}}'
expect "save without CSRF refused" 403 "$(call "$JAR_A" POST trips-save "$TRIP")"
expect "cross-site save refused"   403 "$(call "$JAR_A" POST trips-save "$TRIP" -H "X-CSRF: $CA" -H 'Sec-Fetch-Site: cross-site')"
r=$(call "$JAR_A" POST trips-save "$TRIP" -H "X-CSRF: $CA"); expect "A saves a trip" 200 "$r" '"id"'
TA=$(echo "${r#* }" | field id)
r=$(call "$JAR_B" POST trips-save '{"title":"B trip","data":{"days":[]}}' -H "X-CSRF: $CB"); expect "B saves a trip" 200 "$r" '"id"'
TB=$(echo "${r#* }" | field id)
expect "A cannot delete B's trip"  404 "$(call "$JAR_A" POST trips-delete "{\"id\":\"$TB\"}" -H "X-CSRF: $CA")"
expect "A cannot rename B's trip"  404 "$(call "$JAR_A" POST trips-save "{\"id\":\"$TB\",\"title\":\"x\",\"data\":{}}" -H "X-CSRF: $CA")"
expect "A lists only A's trip"     200 "$(call "$JAR_A" GET trips-list)" 'Cairo and Luxor'
[[ "$(call "$JAR_A" GET trips-list)" != *"B trip"* ]] && echo "ok    B's trip not in A's list" || { echo "FAIL  A sees B's trip"; fails=$((fails+1)); }
expect "empty title refused"       422 "$(call "$JAR_A" POST trips-save '{"title":"","data":{}}' -H "X-CSRF: $CA")"
expect "save a place"              200 "$(call "$JAR_A" POST places-toggle '{"place":"giza"}' -H "X-CSRF: $CA")" '"saved":true'
expect "unsave it"                 200 "$(call "$JAR_A" POST places-toggle '{"place":"giza"}' -H "X-CSRF: $CA")" '"saved":false'
expect "save it again"             200 "$(call "$JAR_A" POST places-toggle '{"place":"karnak"}' -H "X-CSRF: $CA")" '"saved":true'
expect "bad place key refused"     422 "$(call "$JAR_A" POST places-toggle '{"place":"../etc"}' -H "X-CSRF: $CA")"
# The Papyrus from the account page: a verified account subscribes with one
# press and no confirmation email; an unverified one is refused, because then
# nobody would have proven the address.
expect "newsletter starts off"     200 "$(call "$JAR_A" GET newsletter-status)" '"state":"none"'
expect "newsletter without CSRF"   403 "$(call "$JAR_A" POST newsletter-set '{"on":true}')"
expect "newsletter needs true/false" 422 "$(call "$JAR_A" POST newsletter-set '{"on":"yes"}' -H "X-CSRF: $CA")"
expect "verified A subscribes"     200 "$(call "$JAR_A" POST newsletter-set '{"on":true}' -H "X-CSRF: $CA")" '"state":"subscribed"'
row=$(sql "SELECT confirmed || '/' || unsubscribed || '/' || (length(token) > 0) FROM newsletter_subscribers WHERE email='a@example.org'")
[ "$row" = "1/0/1" ] && echo "ok    A's row is confirmed, live, with an unsubscribe token" || { echo "FAIL  A's newsletter row is $row, wanted 1/0/1"; fails=$((fails+1)); }
expect "unverified B is refused"   403 "$(call "$JAR_B" POST newsletter-set '{"on":true}' -H "X-CSRF: $CB")" 'Confirm your email'
n=$(sql "SELECT COUNT(*) FROM newsletter_subscribers WHERE email='b@example.org'")
[ "$n" = 0 ] && echo "ok    no newsletter row for unverified B" || { echo "FAIL  unverified B got a newsletter row"; fails=$((fails+1)); }
expect "A unsubscribes"            200 "$(call "$JAR_A" POST newsletter-set '{"on":false}' -H "X-CSRF: $CA")" '"state":"none"'
[ "$(sql "SELECT unsubscribed FROM newsletter_subscribers WHERE email='a@example.org'")" = 1 ] \
  && echo "ok    A's row is marked unsubscribed" || { echo "FAIL  A's row is not marked unsubscribed"; fails=$((fails+1)); }
expect "A subscribes again"        200 "$(call "$JAR_A" POST newsletter-set '{"on":true}' -H "X-CSRF: $CA")" '"state":"subscribed"'
r=$(call "$JAR_A" GET export); expect "export has the trip" 200 "$r" 'Cairo and Luxor'
expect "export has the place"      200 "$r" 'karnak'
expect "export has the newsletter" 200 "$r" '"newsletter":"subscribed"'

expect "delete without confirm"    422 "$(call "$JAR_A" POST delete-account "{\"password\":\"correct horse battery\"}" -H "X-CSRF: $CA")"
expect "delete, wrong password"    403 "$(call "$JAR_A" POST delete-account '{"password":"wrong","confirm":"DELETE"}' -H "X-CSRF: $CA")"
expect "delete without CSRF"       403 "$(call "$JAR_A" POST delete-account '{"password":"correct horse battery","confirm":"DELETE"}')"
AID=$(sql "SELECT id FROM users WHERE email='a@example.org'")
expect "delete A"                  200 "$(call "$JAR_A" POST delete-account '{"password":"correct horse battery","confirm":"DELETE"}' -H "X-CSRF: $CA")" 'deleted'
for t in users:id user_trips:user_id user_saved_places:user_id sessions:user_id auth_tokens:user_id; do
  n=$(sql "SELECT COUNT(*) FROM ${t%%:*} WHERE ${t#*:}='$AID'")
  [ "$n" = 0 ] && echo "ok    no ${t%%:*} rows left for A" || { echo "FAIL  $n ${t%%:*} rows left for A"; fails=$((fails+1)); }
done
expect "A is signed out"           200 "$(call "$JAR_A" GET me)" '"user":null'
expect "A cannot sign in again"    401 "$(call "$JAR_A" POST login "$A")"
expect "B's trip survives"         200 "$(call "$JAR_B" GET trips-list)" 'B trip'

# ---- 2026-11-15 security pass ---------------------------------------------
check() {  # check NAME GOT WANT
  if [ "$2" = "$3" ]; then echo "ok    $1"; else echo "FAIL  $1: got '$2', wanted '$3'"; fails=$((fails+1)); fi
}
phpdb() { AUTH_DB_DRIVER=sqlite AUTH_SQLITE_PATH="$DB" APP_URL="$BASE" php -r "$1"; }
mailcount() { grep -c "$1" "$MAILLOG" 2>/dev/null || true; }

# Reset emails are capped per ADDRESS (3 an hour), not only per IP, and the
# reply never changes, so the cap reveals nothing.
r1=$(call "$JAR_B" POST request-reset '{"email":"b@example.org"}')
for i in 2 3 4; do r=$(call "$JAR_B" POST request-reset '{"email":"b@example.org"}'); done
ru=$(call "$JAR_B" POST request-reset '{"email":"nobody@example.org"}')
check "4 reset requests send 3 emails"          "$(mailcount 'RESET b@example.org')" 3
check "the reply over the cap is unchanged"     "$r" "$r1"
check "an unknown address gets the same reply"  "$ru" "$r1"

# Google sign-in linking an existing account (google_link_account). An account
# whose email was never verified may be a squatter's: its password is removed
# and every session ends. A verified account keeps its password; its sessions
# still end.
C='{"email":"c@example.org","password":"squatter password 1"}'
D='{"email":"d@example.org","password":"owner password one"}'
JAR_C="$WORK/c.jar"; JAR_D="$WORK/d.jar"
expect "sign up C (unverified)"   200 "$(call "$JAR_C" POST signup "$C")" '"ok":true'
expect "sign up D"                200 "$(call "$JAR_D" POST signup "$D")" '"ok":true'
DID=$(sql "SELECT id FROM users WHERE email='d@example.org'")
tok=$(sql "SELECT token FROM auth_tokens WHERE kind='verify' AND user_id='$DID'")
expect "verify D's email"         200 "$(call "$JAR_D" GET "verify&token=$tok")" 'verified'
expect "sign in C"                200 "$(call "$JAR_C" POST login "$C")" '"csrf"'
expect "sign in D"                200 "$(call "$JAR_D" POST login "$D")" '"csrf"'
phpdb 'require "site/auth/lib.php"; $db = auth_db(); $st = $db->prepare("SELECT * FROM users WHERE email=?"); $st->execute(["c@example.org"]); google_link_account($db, $st->fetch(), "sub-c");'
phpdb 'require "site/auth/lib.php"; $db = auth_db(); $st = $db->prepare("SELECT * FROM users WHERE email=?"); $st->execute(["d@example.org"]); google_link_account($db, $st->fetch(), "sub-d");'
check "unverified account: password removed"   "$(sql "SELECT pass_hash FROM users WHERE email='c@example.org'")" 'google-only-no-password'
check "unverified account: now verified"       "$(sql "SELECT email_verified FROM users WHERE email='c@example.org'")" 1
expect "the squatter's session is gone"  200 "$(call "$JAR_C" GET me)" '"user":null'
expect "the squatter's password fails"   401 "$(call "$JAR_C" POST login "$C")"
expect "D's old session is gone"         200 "$(call "$JAR_D" GET me)" '"user":null'
expect "verified D keeps the password"   200 "$(call "$JAR_D" POST login "$D")" '"csrf"'

# The Papyrus form: one reply whatever the address's state, at most one
# confirmation email per address per day, a way back in after unsubscribing,
# and an IP hash salted with app_secret rather than the public '|egybi'.
nl() { curl -s -X POST -H 'Content-Type: application/json' --data "{\"email\":\"$1\"}" "$BASE/api/newsletter.php"; }
n1=$(nl n@example.org); n2=$(nl n@example.org)
check "the same reply for a new and a known address" "$n2" "$n1"
case "$n1" in *'"ok":true'*) echo "ok    the newsletter form answers ok";; *) echo "FAIL  newsletter form: $n1"; fails=$((fails+1));; esac
check "two sign-ups in a day send one email" "$(mailcount 'TO=n@example.org SUBJ=Confirm')" 1
literal=$(php -r 'echo substr(hash("sha256", "127.0.0.1|egybi"), 0, 16);')
stored=$(sql "SELECT ip_hash FROM newsletter_subscribers WHERE email='n@example.org'")
[ -n "$stored" ] && [ "$stored" != "$literal" ] && echo "ok    the stored IP hash is not the public-salt one" \
  || { echo "FAIL  stored ip_hash '$stored' (public-salt value '$literal')"; fails=$((fails+1)); }
# Unsubscribe, and let a day pass (drop the confirm-allowance rows): signing up
# again sends a new link, and that link brings the address back.
phpdb 'require "site/auth/lib.php"; $db = auth_db();
  $db->prepare("UPDATE newsletter_subscribers SET confirmed=1, unsubscribed=1 WHERE email=?")->execute(["n@example.org"]);
  $db->prepare("DELETE FROM auth_attempts WHERE action=?")->execute(["nl-confirm"]);'
n3=$(nl n@example.org)
check "rejoining gets the same reply"            "$n3" "$n1"
check "rejoining after a day sends a new link"   "$(mailcount 'TO=n@example.org SUBJ=Confirm')" 2
ntok=$(sql "SELECT token FROM newsletter_subscribers WHERE email='n@example.org'")
curl -s -o /dev/null "$BASE/api/newsletter.php?action=confirm&e=n%40example.org&t=$ntok"
check "the confirm link re-subscribes"           "$(sql "SELECT confirmed || '/' || unsubscribed FROM newsletter_subscribers WHERE email='n@example.org'")" '1/0'

# The keyed health check reports whether app_secret is a real secret. This
# server runs on the built-in default, so it must say false. app_secret_ok()
# itself is checked against the default, the sample placeholder, a short value
# and a long random one.
expect "health without the key gives no detail" 200 "200 $(curl -s "$BASE/auth/auth.php?action=health")" '{"ok":true}'
expect "keyed health: default secret is not ok" 200 "200 $(curl -s "$BASE/auth/auth.php?action=health&key=$HKEY")" '"app_secret_ok":false'
secret_ok() { APP_SECRET="$1" php -r 'require "site/auth/lib.php"; echo app_secret_ok() ? "yes" : "no";'; }
LONG=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
for case in "no|" "no|dev-only-insecure-secret-change-me" "no|PASTE_A_LONG_RANDOM_STRING_HERE" "no|short-but-real" "yes|$LONG"; do
  want=${case%%|*}; val=${case#*|}
  got=$(secret_ok "$val")
  if [ "$got" = "$want" ]; then echo "ok    app_secret_ok('${val:0:12}...') = $want"
  else echo "FAIL  app_secret_ok('${val:0:12}...') = $got, wanted $want"; fails=$((fails+1)); fi
done

if grep -qiE 'fatal|warning|deprecated' "$WORK/server.log"; then
  echo "FAIL  PHP printed errors:"; grep -iE 'fatal|warning|deprecated' "$WORK/server.log" | head -10; fails=$((fails+1))
fi
[ "$fails" -eq 0 ] && { echo "account flow: every step answered as expected"; exit 0; }
echo "account flow: $fails step(s) wrong"; exit 1
