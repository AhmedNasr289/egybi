<?php
/**
 * EgyBI — Travellers' notes API (Round 4, R4-2a, 2026-11-16). JSON only.
 *
 * Read (anyone):
 *   GET  ?action=list[&site=giza][&before=<created_at>]   published notes, newest first, 20 a page
 * Signed in (session cookie + X-CSRF header + same origin):
 *   GET  ?action=mine                                     your notes, any status
 *   POST action=create  {sites:[keys], place, month:'YYYY-MM', body}
 *   POST action=delete  {id}                              your own note only
 *   POST action=helpful {id}                              once per account; toggles off on a second press
 *   POST action=report  {id, reason}                      once per account; 3 reports hide a note
 * Moderator (the analytics key, compared with hash_equals):
 *   GET  ?action=queue&key=…                             queued and hidden notes
 *   POST action=moderate {key, id, act: publish|hide|delete}
 *
 * Rules: see auth/notes_lib.php. Writing needs a verified email (a Google
 * sign-in is verified). A new account's first notes wait for review.
 */
declare(strict_types=1);
require __DIR__ . '/../auth/lib.php';
require __DIR__ . '/../auth/notes_lib.php';

if (!notes_enabled()) json_out(false, ['message' => 'Travellers\' notes are not open yet.', 'disabled' => true], 404);

$db = auth_db();
notes_ensure_schema($db);
$action = (string)($_GET['action'] ?? (body()['action'] ?? ''));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$select = 'SELECT n.*, u.display_name FROM notes n JOIN users u ON u.id = n.user_id';

/** A signed-in, verified writer for a POST: same origin, session, CSRF. Returns the user row. */
function notes_writer(PDO $db): array
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    require_same_origin();
    $s = current_session();
    if (!$s) json_out(false, ['message' => 'Sign in first.'], 401);
    require_csrf($s);
    $u = current_user();
    if (!$u) json_out(false, ['message' => 'Sign in first.'], 401);
    return $u;
}

function notes_find(PDO $db, string $id): ?array
{
    if ($id === '' || !ctype_xdigit($id)) return null;
    $st = $db->prepare('SELECT * FROM notes WHERE id=?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function notes_audit(PDO $db, string $noteId, string $what): void
{
    $db->prepare('INSERT INTO note_audit (id,note_id,action,at) VALUES (?,?,?,?)')
       ->execute([rid(16), $noteId, $what, now()]);
}

switch ($action) {

case 'list': {
    $site = (string)($_GET['site'] ?? '');
    $before = (string)($_GET['before'] ?? '');
    $where = ["n.status = 'published'"]; $args = [];
    if ($site !== '') {
        if (!in_array($site, notes_sites(), true)) json_out(false, ['message' => 'Unknown site.'], 422);
        // sites is a comma list of known keys only, so a delimited LIKE is exact.
        $where[] = "(',' || n.sites || ',') LIKE ?";
        $args[] = '%,' . $site . ',%';
    }
    if ($before !== '') {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}T[\d:+\-Z]+$/', $before)) json_out(false, ['message' => 'Bad cursor.'], 422);
        $where[] = 'n.created_at < ?'; $args[] = $before;
    }
    $sql = $select . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY n.created_at DESC LIMIT 20';
    if (db_is_mysql()) $sql = str_replace("(',' || n.sites || ',')", "CONCAT(',', n.sites, ',')", $sql);
    $st = $db->prepare($sql); $st->execute($args);
    $viewer = current_session()['user_id'] ?? null;
    json_out(true, ['notes' => array_map(fn($r) => notes_public($r, $viewer), $st->fetchAll()),
                    'sites' => notes_sites()]);
}

case 'mine': {
    $s = current_session();
    if (!$s) json_out(false, ['message' => 'Sign in first.'], 401);
    $st = $db->prepare($select . ' WHERE n.user_id=? ORDER BY n.created_at DESC');
    $st->execute([$s['user_id']]);
    json_out(true, ['notes' => array_map(fn($r) => notes_public($r, $s['user_id']) + ['status' => $r['status']], $st->fetchAll())]);
}

case 'create': {
    $u = notes_writer($db);
    if ((int)$u['email_verified'] !== 1) {
        json_out(false, ['message' => 'Confirm your email first — the link is in your inbox. Signing in with Google needs no confirmation.'], 403);
    }
    $b = body();
    $text = notes_clean((string)($b['body'] ?? ''));
    $n = notes_len($text);
    if ($n < NOTES_BODY_MIN || $n > NOTES_BODY_MAX) {
        json_out(false, ['message' => 'Write between ' . NOTES_BODY_MIN . ' and ' . NOTES_BODY_MAX . ' characters.'], 422);
    }
    $sites = $b['sites'] ?? [];
    if (!is_array($sites) || count($sites) > NOTES_MAX_SITES) json_out(false, ['message' => 'Pick up to 3 places.'], 422);
    $known = notes_sites();
    $sites = array_values(array_unique(array_map('strval', $sites)));
    foreach ($sites as $k) if (!in_array($k, $known, true)) json_out(false, ['message' => 'Unknown place.'], 422);
    $place = notes_clean((string)($b['place'] ?? ''));
    if (notes_len($place) > NOTES_PLACE_MAX) json_out(false, ['message' => 'Keep the place name under ' . NOTES_PLACE_MAX . ' characters.'], 422);
    if ($sites === [] && $place === '') json_out(false, ['message' => 'Say where it was: pick a place or type one.'], 422);
    $month = (string)($b['month'] ?? '');
    if ($month !== '') {
        if (!preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $month, $m) || (int)$m[1] < 1990 || $month > gmdate('Y-m')) {
            json_out(false, ['message' => 'The visit month must be a past or current month.'], 422);
        }
    }
    // Counted only for notes that pass every rule, so a typo does not use up the day.
    if (!rate_ok_key('notes-u:' . $u['id'], 'note', NOTES_PER_DAY, 1440) || !rate_ok('note', NOTES_PER_DAY_IP, 1440)) {
        json_out(false, ['message' => 'That is plenty for today — please come back tomorrow.'], 429);
    }
    $pub = $db->prepare("SELECT COUNT(*) FROM notes WHERE user_id=? AND status='published'");
    $pub->execute([$u['id']]);
    $status = ((int)$pub->fetchColumn() >= NOTES_TRUSTED_AFTER) ? 'published' : 'queued';
    $id = rid(16); $ts = now();
    $db->prepare('INSERT INTO notes (id,user_id,sites,place_text,visited_month,body,status,helpful_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
       ->execute([$id, $u['id'], implode(',', $sites), $place, $month, $text, $status, 0, $ts, $ts]);
    json_out(true, ['id' => $id, 'status' => $status,
                    'message' => $status === 'published' ? 'Your note is published.' : 'Thank you. Your note will appear once it is reviewed.']);
}

case 'delete': {
    $u = notes_writer($db);
    $note = notes_find($db, (string)(body()['id'] ?? ''));
    if (!$note || $note['user_id'] !== $u['id']) json_out(false, ['message' => 'Unknown note.'], 404);
    with_tx($db, function (PDO $db) use ($note) {
        $db->prepare('DELETE FROM note_helpful WHERE note_id=?')->execute([$note['id']]);
        $db->prepare('DELETE FROM note_reports WHERE note_id=?')->execute([$note['id']]);
        $db->prepare('DELETE FROM notes WHERE id=?')->execute([$note['id']]);
    });
    json_out(true, ['message' => 'Note deleted.']);
}

case 'helpful': {
    $u = notes_writer($db);
    $note = notes_find($db, (string)(body()['id'] ?? ''));
    if (!$note || $note['status'] !== 'published') json_out(false, ['message' => 'Unknown note.'], 404);
    if ($note['user_id'] === $u['id']) json_out(false, ['message' => 'You cannot mark your own note.'], 422);
    $on = with_tx($db, function (PDO $db) use ($note, $u) {
        $has = $db->prepare('SELECT 1 FROM note_helpful WHERE note_id=? AND user_id=?');
        $has->execute([$note['id'], $u['id']]);
        if ($has->fetchColumn()) {
            $db->prepare('DELETE FROM note_helpful WHERE note_id=? AND user_id=?')->execute([$note['id'], $u['id']]);
            $on = false;
        } else {
            $db->prepare('INSERT INTO note_helpful (note_id,user_id,created_at) VALUES (?,?,?)')->execute([$note['id'], $u['id'], now()]);
            $on = true;
        }
        notes_recount_helpful($db, $note['id']);
        return $on;
    });
    $c = $db->prepare('SELECT helpful_count FROM notes WHERE id=?'); $c->execute([$note['id']]);
    json_out(true, ['helpful' => (int)$c->fetchColumn(), 'marked' => $on]);
}

case 'report': {
    $u = notes_writer($db);
    if (!rate_ok_key('notes-r:' . $u['id'], 'report', 20, 1440)) json_out(false, ['message' => 'Too many reports today.'], 429);
    $b = body();
    $note = notes_find($db, (string)($b['id'] ?? ''));
    if (!$note || $note['status'] !== 'published') json_out(false, ['message' => 'Unknown note.'], 404);
    $reason = notes_clean((string)($b['reason'] ?? ''));
    if (notes_len($reason) > 200) $reason = (string)preg_replace('/^(.{200}).*$/su', '$1', $reason);
    $hidden = with_tx($db, function (PDO $db) use ($note, $u, $reason) {
        $has = $db->prepare('SELECT 1 FROM note_reports WHERE note_id=? AND user_id=?');
        $has->execute([$note['id'], $u['id']]);
        if (!$has->fetchColumn()) {
            $db->prepare('INSERT INTO note_reports (note_id,user_id,reason,created_at) VALUES (?,?,?,?)')
               ->execute([$note['id'], $u['id'], $reason, now()]);
        }
        $n = $db->prepare('SELECT COUNT(*) FROM note_reports WHERE note_id=?'); $n->execute([$note['id']]);
        if ((int)$n->fetchColumn() >= NOTES_HIDE_AT_REPORTS) {
            $db->prepare("UPDATE notes SET status='hidden', updated_at=? WHERE id=?")->execute([now(), $note['id']]);
            notes_audit($db, $note['id'], 'auto-hide');
            return true;
        }
        return false;
    });
    json_out(true, ['message' => 'Thank you — we will look at it.', 'hidden' => $hidden]);
}

case 'queue':
case 'moderate': {
    $key = (string)($_GET['key'] ?? (body()['key'] ?? ''));
    $ak = analytics_key();
    if (strlen($ak) < 16 || !hash_equals($ak, $key)) json_out(false, ['message' => 'Unknown action.'], 404);
    if ($action === 'queue') {
        $st = $db->query($select . " WHERE n.status IN ('queued','hidden') ORDER BY n.created_at");
        $rows = array_map(function ($r) use ($db) {
            $c = $db->prepare('SELECT COUNT(*) FROM note_reports WHERE note_id=?'); $c->execute([$r['id']]);
            return notes_public($r) + ['status' => $r['status'], 'reports' => (int)$c->fetchColumn()];
        }, $st->fetchAll());
        json_out(true, ['notes' => $rows]);
    }
    if ($method !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    $b = body();
    $note = notes_find($db, (string)($b['id'] ?? ''));
    if (!$note) json_out(false, ['message' => 'Unknown note.'], 404);
    $act = (string)($b['act'] ?? '');
    if ($act === 'publish' || $act === 'hide') {
        with_tx($db, function (PDO $db) use ($note, $act) {
            $db->prepare('UPDATE notes SET status=?, updated_at=? WHERE id=?')
               ->execute([$act === 'publish' ? 'published' : 'hidden', now(), $note['id']]);
            if ($act === 'publish') $db->prepare('DELETE FROM note_reports WHERE note_id=?')->execute([$note['id']]);
            notes_audit($db, $note['id'], $act);
        });
    } elseif ($act === 'delete') {
        with_tx($db, function (PDO $db) use ($note) {
            $db->prepare('DELETE FROM note_helpful WHERE note_id=?')->execute([$note['id']]);
            $db->prepare('DELETE FROM note_reports WHERE note_id=?')->execute([$note['id']]);
            $db->prepare('DELETE FROM notes WHERE id=?')->execute([$note['id']]);
            notes_audit($db, $note['id'], 'delete');
        });
    } else {
        json_out(false, ['message' => 'Unknown moderation action.'], 422);
    }
    json_out(true, ['message' => 'Done.']);
}

default:
    json_out(false, ['message' => 'Unknown action.'], 404);
}
