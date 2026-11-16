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
AUTH_DB_DRIVER=sqlite AUTH_SQLITE_PATH="$DB" AUTH_SECURE_COOKIE=0 APP_URL="$BASE" ANALYTICS_KEY="$HKEY" NOTES_ENABLED=1 \
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
# The reset link itself, on a database where Google sign-in has never run (no
# google_sub column yet): the reset clears google_sub, so it must create the
# column first rather than throw.
rtok=$(sql "SELECT token FROM auth_tokens WHERE kind='reset' ORDER BY rowid DESC LIMIT 1")
expect "a reset link sets a new password"  200 "$(call "$JAR_B" POST reset "{\"token\":\"$rtok\",\"password\":\"brand new secret 1\"}")" 'Password updated'
expect "B signs in with the new password"  200 "$(call "$JAR_B" POST login '{"email":"b@example.org","password":"brand new secret 1"}')" '"csrf"'

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
# ---- Travellers' notes (Round 4, R4-2a, 2026-11-16) --------------------------
# api/notes.php end to end: who may write, every abuse path, moderation,
# reports, helpful marks, and that deleting an account takes its notes with it.
# NOTES_LIVE is true from R4-2b; the server also sets NOTES_ENABLED=1 so this
# section runs on R4-2a alone. Four more sign-ups make 8: the 8-an-hour limit, exactly.
# Every rule from the R4-2b security review is exercised here, not only named.
ncall() {  # ncall JAR METHOD ACTION [JSON] [extra curl args...] -> "STATUS BODY"
  local jar=$1 method=$2 action=$3 data=${4:-}; shift 4 2>/dev/null || shift $#
  local args=(-s -o "$WORK/nbody" -w '%{http_code}' -b "$jar" -c "$jar" -X "$method"
              -H 'Content-Type: application/json' "$@")
  [ -n "$data" ] && args+=(--data "$data")
  local code; code=$(curl "${args[@]}" "$BASE/api/notes.php?action=$action")
  echo "$code $(cat "$WORK/nbody")"
}
JAR_E="$WORK/e.jar"; JAR_F="$WORK/f.jar"; JAR_G="$WORK/g.jar"; JAR_H="$WORK/h.jar"; JAR_N="$WORK/n.jar"
E='{"email":"e@example.org","password":"notes writer secret"}'
F='{"email":"f@example.org","password":"notes reader secret"}'
G='{"email":"g@example.org","password":"never verified secret"}'
H='{"email":"h@example.org","password":"notes second reader"}'
# D (d@example.org) is the verified account from the security pass; $D is defined there.
# Like the sign-in window below: earlier passes made sign-ups from this one IP,
# and four more would sit exactly on the 8-an-hour limit. The limit is tested
# in the security pass; here it would only make the notes section fragile.
sql "DELETE FROM auth_attempts WHERE action='signup'" >/dev/null
for who in E F G H; do
  eval "j=\$JAR_$who; body=\$$who"
  expect "sign up $who (notes)" 200 "$(call "$j" POST signup "$body")" '"ok":true'
done
for who in e f h; do
  uid=$(sql "SELECT id FROM users WHERE email='$who@example.org'")
  tok=$(sql "SELECT token FROM auth_tokens WHERE kind='verify' AND user_id='$uid'")
  up=$(echo "$who" | tr a-z A-Z); eval "j=\$JAR_$up"
  expect "verify $up's email" 200 "$(call "$j" GET "verify&token=$tok")" 'verified'
done
EID=$(sql "SELECT id FROM users WHERE email='e@example.org'")
# The passes above already made 9 sign-ins from this one IP, and auth.php allows
# 10 per 15 minutes. Without this, F, G and D are refused with 429 and every
# later notes step runs signed out (run 43846913758). Let the window lapse in
# this throwaway database; the limit itself is tested in the security pass.
sql "DELETE FROM auth_attempts WHERE action='login'" >/dev/null
r=$(call "$JAR_E" POST login "$E"); expect "notes: sign in E" 200 "$r" '"csrf"'; CE=$(echo "${r#* }" | field csrf)
r=$(call "$JAR_F" POST login "$F"); expect "notes: sign in F" 200 "$r" '"csrf"'; CF=$(echo "${r#* }" | field csrf)
r=$(call "$JAR_G" POST login "$G"); expect "notes: sign in G (unverified)" 200 "$r" '"csrf"'; CG=$(echo "${r#* }" | field csrf)
note() { printf '{"sites":["giza"],"month":"2026-10","body":"%s"}' "$1"; }
LONG="We went at opening time and had the plateau almost to ourselves for an hour."
mod() { ncall "$JAR_N" POST moderate "{\"key\":\"$HKEY\",\"id\":\"$1\",\"act\":\"$2\"}"; }
queue() { ncall "$JAR_N" GET queue -H "X-Mod-Key: $HKEY"; }
public_has() {  # public_has NAME NOTE_ID yes|no
  local l; l=$(ncall "$JAR_N" GET list)
  if { [ "$3" = yes ] && [[ "$l" == *"$2"* ]]; } || { [ "$3" = no ] && [[ "$l" != *"$2"* ]]; }; then echo "ok    $1"
  else echo "FAIL  $1"; fails=$((fails+1)); fi
}

expect "notes: anyone can read the list"      200 "$(ncall "$JAR_N" GET list)" '"notes":[]'
expect "notes: signed out cannot write"       401 "$(ncall "$JAR_N" POST create "$(note "$LONG")")"
expect "notes: no CSRF token refused"         403 "$(ncall "$JAR_E" POST create "$(note "$LONG")")"
expect "notes: cross-site write refused"      403 "$(ncall "$JAR_E" POST create "$(note "$LONG")" -H "X-CSRF: $CE" -H 'Sec-Fetch-Site: cross-site')"
expect "notes: a foreign Origin refused"      403 "$(ncall "$JAR_E" POST create "$(note "$LONG")" -H "X-CSRF: $CE" -H 'Origin: https://evil.example')"
expect "notes: unverified email refused"      403 "$(ncall "$JAR_G" POST create "$(note "$LONG")" -H "X-CSRF: $CG")" 'Confirm your email'
expect "notes: too short refused"             422 "$(ncall "$JAR_E" POST create "$(note "Too short.")" -H "X-CSRF: $CE")"
expect "notes: blank lines do not count towards the length" 422 "$(ncall "$JAR_E" POST create '{"sites":["giza"],"body":"a\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nb"}' -H "X-CSRF: $CE")"
expect "notes: unknown site refused"          422 "$(ncall "$JAR_E" POST create '{"sites":["../etc"],"body":"'"$LONG"'"}' -H "X-CSRF: $CE")"
expect "notes: no place at all refused"       422 "$(ncall "$JAR_E" POST create '{"sites":[],"place":"","body":"'"$LONG"'"}' -H "X-CSRF: $CE")"
expect "notes: future month refused"          422 "$(ncall "$JAR_E" POST create '{"sites":["giza"],"month":"2999-01","body":"'"$LONG"'"}' -H "X-CSRF: $CE")"

XSS='<script>alert(1)</script> and a long enough honest note about Giza.'
r=$(ncall "$JAR_E" POST create "$(note "$XSS")" -H "X-CSRF: $CE"); expect "notes: E writes a note (queued)" 200 "$r" '"status":"queued"'
N1=$(echo "${r#* }" | field id)
check "notes: the script tag is stored as plain text" "$(sql "SELECT body FROM notes WHERE id='$N1'")" "$XSS"
public_has "notes: a queued note is not public" "$N1" no
expect "notes: queue needs the key"           404 "$(ncall "$JAR_N" GET queue -H 'X-Mod-Key: wrong-key-0123456789')"
expect "notes: the key in the URL is refused" 404 "$(ncall "$JAR_N" GET "queue&key=$HKEY")"
expect "notes: the moderator sees the queue"  200 "$(queue)" "$N1"
expect "notes: moderator publishes N1"        200 "$(mod "$N1" publish)"
r=$(ncall "$JAR_N" GET "list&site=giza"); expect "notes: N1 is public under Giza" 200 "$r" "$N1"
[[ "$r" != *"e@example.org"* && "$r" != *"$EID"* ]] && echo "ok    notes: the author's email and id are never published" || { echo "FAIL  notes: an email or user id is in the list"; fails=$((fails+1)); }
hdr=$(curl -s -D - -o /dev/null "$BASE/api/notes.php?action=list")
[[ "${hdr,,}" == *"content-type: application/json"* && "${hdr,,}" == *"nosniff"* ]] \
  && echo "ok    notes: the list is JSON with nosniff" || { echo "FAIL  notes: list headers: $hdr"; fails=$((fails+1)); }
[[ "$(ncall "$JAR_N" GET "list&site=karnak")" != *"$N1"* ]] && echo "ok    notes: N1 is not under Karnak" || { echo "FAIL  notes: N1 shown under Karnak"; fails=$((fails+1)); }

r=$(ncall "$JAR_E" POST create "$(note "$LONG two")" -H "X-CSRF: $CE"); N2=$(echo "${r#* }" | field id)
mod "$N2" publish >/dev/null
r=$(ncall "$JAR_E" POST create "$(note "$LONG three")" -H "X-CSRF: $CE"); expect "notes: after two approved, E publishes at once" 200 "$r" '"status":"published"'
N3=$(echo "${r#* }" | field id)
ncall "$JAR_E" POST create "$(note "$LONG four")" -H "X-CSRF: $CE" >/dev/null
ncall "$JAR_E" POST create "$(note "$LONG five")" -H "X-CSRF: $CE" >/dev/null
expect "notes: the sixth note in a day is refused" 429 "$(ncall "$JAR_E" POST create "$(note "$LONG six")" -H "X-CSRF: $CE")"

# ---- helpful marks
expect "notes: F marks N1 helpful"            200 "$(ncall "$JAR_F" POST helpful "{\"id\":\"$N1\"}" -H "X-CSRF: $CF")" '"helpful":1'
expect "notes: a second press takes it back"  200 "$(ncall "$JAR_F" POST helpful "{\"id\":\"$N1\"}" -H "X-CSRF: $CF")" '"helpful":0'
expect "notes: F marks it again"              200 "$(ncall "$JAR_F" POST helpful "{\"id\":\"$N1\"}" -H "X-CSRF: $CF")" '"helpful":1'
expect "notes: the list says F marked it"     200 "$(ncall "$JAR_F" GET list)" '"marked":true'
expect "notes: E cannot mark E's own note"    422 "$(ncall "$JAR_E" POST helpful "{\"id\":\"$N1\"}" -H "X-CSRF: $CE")"
expect "notes: an unverified account cannot mark" 403 "$(ncall "$JAR_G" POST helpful "{\"id\":\"$N1\"}" -H "X-CSRF: $CG")" 'Confirm your email'
expect "notes: helpful without CSRF refused"  403 "$(ncall "$JAR_F" POST helpful "{\"id\":\"$N1\"}")"
expect "notes: F cannot delete E's note"      404 "$(ncall "$JAR_F" POST delete "{\"id\":\"$N1\"}" -H "X-CSRF: $CF")"
public_has "notes: E's note survives F's attempt" "$N1" yes
# The per-address limit: fill this address's helpful bucket for the day, as
# 300 presses from other accounts on one network would, and the next is refused.
IPH=$(sql "SELECT ip_hash FROM auth_attempts WHERE action='note-helpful' AND ip_hash NOT LIKE 'notes-%' LIMIT 1")
[ -n "$IPH" ] && echo "ok    notes: helpful presses are counted per address" || { echo "FAIL  notes: no per-address helpful counter"; fails=$((fails+1)); }
sql "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<300) INSERT INTO auth_attempts (id, ip_hash, action, created_at) SELECT 'simulated' || x, '$IPH', 'note-helpful', strftime('%Y-%m-%dT%H:%M:%S', 'now') || '+00:00' FROM c" >/dev/null
expect "notes: the per-address helpful limit holds" 429 "$(ncall "$JAR_F" POST helpful "{\"id\":\"$N2\"}" -H "X-CSRF: $CF")"
sql "DELETE FROM auth_attempts WHERE id LIKE 'simulated%'" >/dev/null

# ---- reports: verified accounts, not your own note, two addresses, trusted authors reviewed
r=$(call "$JAR_D" POST login "$D"); CD=$(echo "${r#* }" | field csrf)
r=$(call "$JAR_H" POST login "$H"); expect "notes: sign in H" 200 "$r" '"csrf"'; CH=$(echo "${r#* }" | field csrf)
DID=$(sql "SELECT id FROM users WHERE email='d@example.org'")
r=$(ncall "$JAR_F" POST create "$(note "$LONG by F")" -H "X-CSRF: $CF"); NF=$(echo "${r#* }" | field id)
mod "$NF" publish >/dev/null
public_has "notes: F's first note is published by the moderator" "$NF" yes
expect "notes: E cannot report E's own note"  422 "$(ncall "$JAR_E" POST report "{\"id\":\"$N1\",\"reason\":\"spam\"}" -H "X-CSRF: $CE")"
expect "notes: an unverified account cannot report" 403 "$(ncall "$JAR_G" POST report "{\"id\":\"$N3\",\"reason\":\"spam\"}" -H "X-CSRF: $CG")" 'Confirm your email'
for who in F D H; do
  eval "j=\$JAR_$who; c=\$C$who"
  r=$(ncall "$j" POST report "{\"id\":\"$N3\",\"reason\":\"unkind\"}" -H "X-CSRF: $c")
  expect "notes: $who reports trusted E's N3" 200 "$r" 'Thank you'
done
[[ "$r" != *'"hidden"'* ]] && echo "ok    notes: a report reply never says whether the note was hidden" || { echo "FAIL  notes: the report reply leaks the threshold"; fails=$((fails+1)); }
sql "UPDATE note_reports SET ip_hash='simulated-second-address' WHERE note_id='$N3' AND user_id='$DID'" >/dev/null
ncall "$JAR_H" POST report "{\"id\":\"$N3\",\"reason\":\"unkind\"}" -H "X-CSRF: $CH" >/dev/null
public_has "notes: a trusted author's reported note stays up" "$N3" yes
r=$(queue); expect "notes: and goes to the review queue with its reasons" 200 "$r" '"reports":3'
[[ "$r" == *'"unkind"'* ]] && echo "ok    notes: the queue shows the reasons" || { echo "FAIL  notes: no reasons in the queue"; fails=$((fails+1)); }
for who in E D H; do
  eval "j=\$JAR_$who; c=\$C$who"
  ncall "$j" POST report "{\"id\":\"$NF\",\"reason\":\"spam\"}" -H "X-CSRF: $c" >/dev/null
done
public_has "notes: three reports from one address do not hide a note" "$NF" yes
check "notes: a second report by H counts once" "$(sql "SELECT COUNT(*) FROM note_reports WHERE note_id='$NF'")" 3
sql "UPDATE note_reports SET ip_hash='simulated-second-address' WHERE note_id='$NF' AND user_id='$DID'" >/dev/null
ncall "$JAR_H" POST report "{\"id\":\"$NF\",\"reason\":\"spam\"}" -H "X-CSRF: $CH" >/dev/null
public_has "notes: reports from two addresses hide an untrusted author's note" "$NF" no
expect "notes: the moderator sees it hidden"  200 "$(queue)" '"status":"hidden"'
expect "notes: moderator republishes NF"      200 "$(mod "$NF" publish)"
ncall "$JAR_E" POST report "{\"id\":\"$NF\",\"reason\":\"spam\"}" -H "X-CSRF: $CE" >/dev/null
ncall "$JAR_H" POST report "{\"id\":\"$NF\",\"reason\":\"spam\"}" -H "X-CSRF: $CH" >/dev/null
public_has "notes: the same reporters cannot hide a republished note" "$NF" yes
check "notes: republishing resolved the reports, it did not delete them" "$(sql "SELECT COUNT(*) FROM note_reports WHERE note_id='$NF' AND resolved=1")" 3
# moderate.php's own note buttons (a form POST, the key in the panel's URL)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST --data "key=$HKEY&id=$NF&act=note-hide" "$BASE/api/moderate.php?key=$HKEY")
[ "$code" = 302 ] || [ "$code" = 303 ] && echo "ok    notes: moderate.php hides a note" || { echo "FAIL  notes: moderate.php note-hide answered $code"; fails=$((fails+1)); }
check "notes: moderate.php's hide reached the database" "$(sql "SELECT status FROM notes WHERE id='$NF'")" hidden
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST --data "key=wrong-key-0123456789&id=$NF&act=note-publish" "$BASE/api/moderate.php?key=wrong-key-0123456789")
check "notes: moderate.php refuses a wrong key" "$code" 404
expect "notes: moderator publishes NF again"  200 "$(mod "$NF" publish)"
expect "notes: E marks F's note helpful"      200 "$(ncall "$JAR_E" POST helpful "{\"id\":\"$NF\"}" -H "X-CSRF: $CE")" '"helpful":1'

# ---- the author's own delete, the export, and account deletion
expect "notes: E deletes E's own N2"          200 "$(ncall "$JAR_E" POST delete "{\"id\":\"$N2\"}" -H "X-CSRF: $CE")"
public_has "notes: a deleted note is gone" "$N2" no
check "notes: an author's delete is logged" "$(sql "SELECT COUNT(*) FROM note_audit WHERE note_id='$N2' AND action='author-delete'")" 1
expect "notes: E sees E's own notes"          200 "$(ncall "$JAR_E" GET mine)" '"status":"published"'
r=$(call "$JAR_E" GET export)
expect "notes: export carries the notes"      200 "$r" "$N1"
[[ "$r" == *'"helpful_marks"'* && "$r" == *'"reports"'* && "$r" == *"$NF"* ]] \
  && echo "ok    notes: export carries E's marks and reports" || { echo "FAIL  notes: export lacks E's marks or reports"; fails=$((fails+1)); }
EID_R=$(sql "SELECT COUNT(*) FROM auth_attempts WHERE ip_hash LIKE 'notes-%:$EID'")
[ "$EID_R" -gt 0 ] && echo "ok    notes: E has abuse counters before deletion ($EID_R)" || { echo "FAIL  notes: no counters to delete"; fails=$((fails+1)); }
expect "notes: E deletes the account"         200 "$(call "$JAR_E" POST delete-account '{"password":"notes writer secret","confirm":"DELETE"}' -H "X-CSRF: $CE")" 'deleted'
check "notes: no notes left for E"            "$(sql "SELECT COUNT(*) FROM notes WHERE user_id='$EID'")" 0
check "notes: no marks left on E's notes"     "$(sql "SELECT COUNT(*) FROM note_helpful WHERE note_id IN ('$N1','$N2','$N3')")" 0
check "notes: no reports left on E's notes"   "$(sql "SELECT COUNT(*) FROM note_reports WHERE note_id IN ('$N1','$N2','$N3')")" 0
check "notes: E's own marks are gone"         "$(sql "SELECT COUNT(*) FROM note_helpful WHERE user_id='$EID'")" 0
check "notes: E's own reports are gone"       "$(sql "SELECT COUNT(*) FROM note_reports WHERE user_id='$EID'")" 0
check "notes: F's note lost E's mark"         "$(sql "SELECT helpful_count FROM notes WHERE id='$NF'")" 0
check "notes: E's abuse counters are gone"    "$(sql "SELECT COUNT(*) FROM auth_attempts WHERE ip_hash LIKE 'notes-%:$EID'")" 0
public_has "notes: E's notes left the list with the account" "$N1" no
expect "notes: the moderator deletes NF"      200 "$(mod "$NF" delete)"
check "notes: a moderator's delete takes the reports" "$(sql "SELECT COUNT(*) FROM note_reports WHERE note_id='$NF'")" 0

[ "$fails" -eq 0 ] && { echo "account flow: every step answered as expected"; exit 0; }
echo "account flow: $fails step(s) wrong"; exit 1
