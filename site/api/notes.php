<?php
/**
 * EgyBI — Travellers' notes API (Round 4, R4-2a, 2026-11-16; hardened R4-2b). JSON only.
 *
 * Read (anyone):
 *   GET  ?action=list[&site=giza][&before=<created_at>~<id>]   published notes, newest first, 20 a page
 * Signed in (session cookie + X-CSRF header + same origin):
 *   GET  ?action=mine                                     your notes, any status (latest 200)
 *   POST action=create  {sites:[keys], place, month:'YYYY-MM', body}
 *   POST action=delete  {id}                              your own note only
 *   POST action=helpful {id}                              verified accounts; toggles off on a second press
 *   POST action=report  {id, reason}                      verified accounts; not your own note; once each
 * Moderator (the analytics key, from the X-Mod-Key header or a POST body,
 * never from the URL, compared with hash_equals):
 *   GET  ?action=queue                                    queued, hidden and reported notes (latest 500)
 *   POST action=moderate {key, id, act: publish|hide|delete}
 *
 * Abuse rules (R4-2b security review, 2026-11-16):
 *   - every write is limited per account AND per address;
 *   - reports hide a note only when NOTES_HIDE_AT_REPORTS verified accounts on
 *     at least two different addresses report it, and never a trusted author's
 *     note (that goes to the review queue instead);
 *   - a moderator's publish resolves the reports rather than deleting them, so
 *     the same accounts cannot hide the note again;
 *   - database errors answer as JSON, never as an HTML error page.
 * Rules and limits: see auth/notes_lib.php.
 */
declare(strict_types=1);
require __DIR__ . '/../auth/lib.php';
require __DIR__ . '/../auth/notes_lib.php';

if (!notes_enabled()) json_out(false, ['message' => 'Travellers\' notes are not open yet.', 'disabled' => true], 404);

/** A signed-in writer for a POST: same origin, session, CSRF. Returns the user row. */
function notes_writer(): array
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    require_same_origin();
    $s = current_session();
    if (!$s) json_out(false, ['message' => 'Sign in first.'], 401);
    require_csrf($s);
    $u = current_user();
    if (!$u) json_out(false, ['message' => 'Sign in first.'], 401);
    // Day-old abuse counters go on every write, not only at the next sign-in,
    // so the privacy page's "deleted once they are a day old" holds on a quiet site.
    prune_expired();
    return $u;
}

function notes_need_verified(array $u): void
{
    if ((int)$u['email_verified'] !== 1) {
        json_out(false, ['message' => 'Confirm your email first — the link is in your inbox. Signing in with Google needs no confirmation.'], 403);
    }
}

function notes_find(PDO $db, string $id): ?array
{
    if ($id === '' || !ctype_xdigit($id)) return null;
    $st = $db->prepare('SELECT * FROM notes WHERE id=?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function notes_slow_down(): void
{
    json_out(false, ['message' => 'That is plenty for today — please come back tomorrow.'], 429);
}

try {
    $db = auth_db();
    notes_ensure_schema($db);
    $action = (string)($_GET['action'] ?? (body()['action'] ?? ''));
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $ignore = db_is_mysql() ? 'INSERT IGNORE' : 'INSERT OR IGNORE';

    switch ($action) {

    case 'list': {
        $site = (string)($_GET['site'] ?? '');
        $before = (string)($_GET['before'] ?? '');
        $viewer = current_session()['user_id'] ?? '';
        $where = ["n.status = 'published'"]; $args = [$viewer];
        if ($site !== '') {
            if (!in_array($site, notes_sites(), true)) json_out(false, ['message' => 'Unknown site.'], 422);
            // sites is a comma list of known keys only, so a delimited LIKE is exact.
            $where[] = "(',' || n.sites || ',') LIKE ?";
            $args[] = '%,' . $site . ',%';
        }
        if ($before !== '') {
            // Keyset cursor "created_at~id": two notes in the same second can no
            // longer straddle a page and lose one of them.
            if (!preg_match('/^(\d{4}-\d{2}-\d{2}T[\d:+\-Z]+)(?:~([a-f0-9]{1,64}))?$/', $before, $c)) {
                json_out(false, ['message' => 'Bad cursor.'], 422);
            }
            if (isset($c[2]) && $c[2] !== '') {
                $where[] = '(n.created_at < ? OR (n.created_at = ? AND n.id < ?))';
                array_push($args, $c[1], $c[1], $c[2]);
            } else {
                $where[] = 'n.created_at < ?'; $args[] = $c[1];
            }
        }
        $sql = 'SELECT n.*, u.display_name, h.user_id AS marked_by FROM notes n JOIN users u ON u.id = n.user_id'
             . ' LEFT JOIN note_helpful h ON h.note_id = n.id AND h.user_id = ?'
             . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY n.created_at DESC, n.id DESC LIMIT 20';
        if (db_is_mysql()) $sql = str_replace("(',' || n.sites || ',')", "CONCAT(',', n.sites, ',')", $sql);
        $st = $db->prepare($sql); $st->execute($args);
        $v = $viewer !== '' ? $viewer : null;
        json_out(true, ['notes' => array_map(fn($r) => notes_public($r, $v), $st->fetchAll()),
                        'sites' => notes_sites()]);
    }

    case 'mine': {
        $s = current_session();
        if (!$s) json_out(false, ['message' => 'Sign in first.'], 401);
        $st = $db->prepare('SELECT n.*, u.display_name FROM notes n JOIN users u ON u.id = n.user_id'
                         . ' WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 200');
        $st->execute([$s['user_id']]);
        json_out(true, ['notes' => array_map(fn($r) => notes_public($r, $s['user_id']) + ['status' => $r['status']], $st->fetchAll())]);
    }

    case 'create': {
        $u = notes_writer();
        notes_need_verified($u);
        $b = body();
        $text = notes_clean((string)($b['body'] ?? ''));
        if (notes_visible_len($text) < NOTES_BODY_MIN || notes_len($text) > NOTES_BODY_MAX) {
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
        if (!rate_ok_key('notes-u:' . $u['id'], 'note', NOTES_PER_DAY, 1440) || !rate_ok('note', NOTES_PER_DAY_IP, 1440)) notes_slow_down();
        $status = notes_author_trusted($db, $u['id']) ? 'published' : 'queued';
        $id = rid(16); $ts = now();
        $db->prepare('INSERT INTO notes (id,user_id,sites,place_text,visited_month,body,status,helpful_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
           ->execute([$id, $u['id'], implode(',', $sites), $place, $month, $text, $status, 0, $ts, $ts]);
        json_out(true, ['id' => $id, 'status' => $status,
                        'message' => $status === 'published' ? 'Your note is published.' : 'Thank you. Your note will appear once it is reviewed.']);
    }

    case 'delete': {
        $u = notes_writer();
        $note = notes_find($db, (string)(body()['id'] ?? ''));
        if (!$note || $note['user_id'] !== $u['id']) json_out(false, ['message' => 'Unknown note.'], 404);
        if (!rate_ok_key('notes-d:' . $u['id'], 'note-delete', NOTES_DELETES_PER_DAY, 1440)) notes_slow_down();
        with_tx($db, function (PDO $db) use ($note) {
            $db->prepare('DELETE FROM note_helpful WHERE note_id=?')->execute([$note['id']]);
            $db->prepare('DELETE FROM note_reports WHERE note_id=?')->execute([$note['id']]);
            $db->prepare('DELETE FROM notes WHERE id=?')->execute([$note['id']]);
            notes_audit($db, $note['id'], 'author-delete');
        });
        json_out(true, ['message' => 'Note deleted.']);
    }

    case 'helpful': {
        $u = notes_writer();
        notes_need_verified($u);
        $note = notes_find($db, (string)(body()['id'] ?? ''));
        if (!$note || $note['status'] !== 'published') json_out(false, ['message' => 'Unknown note.'], 404);
        if ($note['user_id'] === $u['id']) json_out(false, ['message' => 'You cannot mark your own note.'], 422);
        if (!rate_ok_key('notes-h:' . $u['id'], 'note-helpful', NOTES_HELPFUL_PER_DAY, 1440)
            || !rate_ok('note-helpful', NOTES_HELPFUL_PER_DAY_IP, 1440)) notes_slow_down();
        $on = with_tx($db, function (PDO $db) use ($note, $u, $ignore) {
            $has = $db->prepare('SELECT 1 FROM note_helpful WHERE note_id=? AND user_id=?');
            $has->execute([$note['id'], $u['id']]);
            if ($has->fetchColumn()) {
                $db->prepare('DELETE FROM note_helpful WHERE note_id=? AND user_id=?')->execute([$note['id'], $u['id']]);
                $on = false;
            } else {
                // IGNORE: a double press that races here marks once instead of failing.
                $db->prepare($ignore . ' INTO note_helpful (note_id,user_id,created_at) VALUES (?,?,?)')->execute([$note['id'], $u['id'], now()]);
                $on = true;
            }
            notes_recount_helpful($db, $note['id']);
            return $on;
        });
        $c = $db->prepare('SELECT helpful_count FROM notes WHERE id=?'); $c->execute([$note['id']]);
        json_out(true, ['helpful' => (int)$c->fetchColumn(), 'marked' => $on]);
    }

    case 'report': {
        $u = notes_writer();
        notes_need_verified($u);
        $b = body();
        $note = notes_find($db, (string)($b['id'] ?? ''));
        if (!$note || $note['status'] !== 'published') json_out(false, ['message' => 'Unknown note.'], 404);
        if ($note['user_id'] === $u['id']) json_out(false, ['message' => 'You cannot report your own note — you can delete it.'], 422);
        if (!rate_ok_key('notes-r:' . $u['id'], 'report', NOTES_REPORTS_PER_DAY, 1440)
            || !rate_ok('note-report', NOTES_REPORTS_PER_DAY_IP, 1440)) notes_slow_down();
        $reason = (string)($b['reason'] ?? '');
        if (!in_array($reason, NOTES_REPORT_REASONS, true)) $reason = 'other';
        with_tx($db, function (PDO $db) use ($note, $u, $reason, $ignore) {
            // Once per account per note, and a report a moderator resolved stays
            // resolved: the same accounts cannot hide a republished note again.
            $db->prepare($ignore . ' INTO note_reports (note_id,user_id,reason,ip_hash,resolved,created_at) VALUES (?,?,?,?,0,?)')
               ->execute([$note['id'], $u['id'], $reason, ip_hash(), now()]);
            notes_apply_reports($db, $note);
        });
        // The reply never says whether the note was hidden, so a reporter cannot
        // tell where the threshold sits.
        json_out(true, ['message' => 'Thank you — we will look at it.']);
    }

    case 'queue':
    case 'moderate': {
        // Never from the URL: a query string lands in access logs and history.
        $key = (string)($_SERVER['HTTP_X_MOD_KEY'] ?? ($method === 'POST' ? (body()['key'] ?? '') : ''));
        $ak = analytics_key();
        if (strlen($ak) < 16 || !hash_equals($ak, $key)) json_out(false, ['message' => 'Unknown action.'], 404);
        if ($action === 'queue') {
            $st = $db->query("SELECT n.*, u.display_name,
                                (SELECT COUNT(*) FROM note_reports r WHERE r.note_id = n.id AND r.resolved = 0) AS open_reports,
                                (SELECT GROUP_CONCAT(r.reason) FROM note_reports r WHERE r.note_id = n.id AND r.resolved = 0) AS reasons
                              FROM notes n JOIN users u ON u.id = n.user_id
                              WHERE n.status IN ('queued','hidden')
                                 OR EXISTS (SELECT 1 FROM note_reports r WHERE r.note_id = n.id AND r.resolved = 0)
                              ORDER BY n.created_at LIMIT 500");
            $rows = array_map(fn($r) => notes_public($r) + ['status' => $r['status'], 'reports' => (int)$r['open_reports'],
                                                           'reasons' => array_values(array_filter(explode(',', (string)$r['reasons'])))],
                              $st->fetchAll());
            json_out(true, ['notes' => $rows]);
        }
        if ($method !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
        $b = body();
        $msg = notes_moderate($db, (string)($b['id'] ?? ''), (string)($b['act'] ?? ''));
        if ($msg === 'Unknown note.' || $msg === 'Invalid id.') json_out(false, ['message' => 'Unknown note.'], 404);
        if ($msg === 'Unknown moderation action.') json_out(false, ['message' => $msg], 422);
        json_out(true, ['message' => $msg]);
    }

    default:
        json_out(false, ['message' => 'Unknown action.'], 404);
    }
} catch (Throwable $e) {
    error_log('[EgyBI notes] ' . $e);
    json_out(false, ['message' => 'Something went wrong. Please try again.'], 500);
}
