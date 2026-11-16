<?php
/**
 * EgyBI — Travellers' notes: storage and rules (Round 4, R4-2a, 2026-11-16).
 *
 * Signed-in, email-verified readers write short notes about a visit; anyone can
 * read the published ones. The endpoint is site/api/notes.php; this file holds
 * the schema and the rules both it and account deletion/export rely on.
 *
 * Safety, by construction:
 *  - every query is a prepared statement;
 *  - text is stored as plain text and the API returns it as JSON strings, so a
 *    page must render it with textContent (the interface PR does, and a browser
 *    check proves an injected <script> stays text);
 *  - only a display name is ever published, never an email address;
 *  - a new account's first notes wait for moderation; three reports hide a note.
 */
declare(strict_types=1);

/** On since the interface shipped (R4-2b). Set to false to switch the API off without removing it. */
const NOTES_LIVE = true;
const NOTES_BODY_MIN = 30;
const NOTES_BODY_MAX = 2000;
const NOTES_PLACE_MAX = 80;
const NOTES_MAX_SITES = 3;
const NOTES_PER_DAY = 5;          // per account
const NOTES_PER_DAY_IP = 20;      // per address
const NOTES_TRUSTED_AFTER = 2;    // published notes before new ones publish without review
const NOTES_HIDE_AT_REPORTS = 3;  // verified accounts, from at least two addresses
const NOTES_HIDE_MIN_ADDRESSES = 2;
const NOTES_DELETES_PER_DAY = 30;         // per account
const NOTES_HELPFUL_PER_DAY = 60;         // per account
const NOTES_HELPFUL_PER_DAY_IP = 300;     // per address
const NOTES_REPORTS_PER_DAY = 20;         // per account
const NOTES_REPORTS_PER_DAY_IP = 40;      // per address
const NOTES_REPORT_REASONS = ['spam', 'wrong', 'unkind', 'personal', 'other'];

function notes_enabled(): bool
{
    return NOTES_LIVE || getenv('NOTES_ENABLED') === '1';
}

/** The 18 measured visit sites, read from the same data file the visit pages use. */
function notes_sites(): array
{
    static $keys = null;
    if ($keys !== null) return $keys;
    $keys = [];
    $f = __DIR__ . '/../data/visit-climate.json';
    $j = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    foreach (($j['sites'] ?? []) as $s) {
        if (isset($s['key']) && is_string($s['key'])) $keys[] = $s['key'];
    }
    return $keys;
}

function notes_ensure_schema(PDO $db): void
{
    static $done = false;
    if ($done) return;
    $done = true;
    $my = auth_cfg()['driver'] === 'mysql';
    $stmts = $my ? [
        "CREATE TABLE IF NOT EXISTS notes (
           id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, sites VARCHAR(120) NOT NULL,
           place_text VARCHAR(80) NOT NULL, visited_month VARCHAR(7) NOT NULL, body TEXT NOT NULL,
           status VARCHAR(12) NOT NULL, helpful_count INT NOT NULL DEFAULT 0,
           created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32) NOT NULL,
           PRIMARY KEY (id), KEY idx_notes_status (status, created_at), KEY idx_notes_user (user_id)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS note_helpful (
           note_id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, created_at VARCHAR(32) NOT NULL,
           PRIMARY KEY (note_id, user_id), KEY idx_nh_user (user_id)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS note_reports (
           note_id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, reason VARCHAR(200) NOT NULL,
           ip_hash VARCHAR(64) NOT NULL DEFAULT '', resolved TINYINT NOT NULL DEFAULT 0,
           created_at VARCHAR(32) NOT NULL, PRIMARY KEY (note_id, user_id), KEY idx_nr_user (user_id)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS note_audit (
           id VARCHAR(32) NOT NULL, note_id VARCHAR(32) NOT NULL, action VARCHAR(24) NOT NULL,
           at VARCHAR(32) NOT NULL, PRIMARY KEY (id), KEY idx_na_note (note_id)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    ] : [
        "CREATE TABLE IF NOT EXISTS notes (
           id TEXT PRIMARY KEY, user_id TEXT NOT NULL, sites TEXT NOT NULL, place_text TEXT NOT NULL,
           visited_month TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL,
           helpful_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
        "CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)",
        "CREATE TABLE IF NOT EXISTS note_helpful (
           note_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL,
           PRIMARY KEY (note_id, user_id))",
        "CREATE TABLE IF NOT EXISTS note_reports (
           note_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT NOT NULL,
           ip_hash TEXT NOT NULL DEFAULT '', resolved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
           PRIMARY KEY (note_id, user_id))",
        "CREATE TABLE IF NOT EXISTS note_audit (
           id TEXT PRIMARY KEY, note_id TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL)",
        "CREATE INDEX IF NOT EXISTS idx_nh_user ON note_helpful(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_nr_user ON note_reports(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_na_note ON note_audit(note_id)",
    ];
    foreach ($stmts as $s) $db->exec($s);
    // A note_reports table created by the first shape (R4-2a, before the
    // security review) lacks these two columns; CREATE IF NOT EXISTS would
    // never add them, so add them here. Additive only.
    $cols = $my ? array_column($db->query('SHOW COLUMNS FROM note_reports')->fetchAll(), 'Field')
                : array_column($db->query('PRAGMA table_info(note_reports)')->fetchAll(), 'name');
    if (!in_array('ip_hash', $cols, true)) {
        $db->exec($my ? "ALTER TABLE note_reports ADD COLUMN ip_hash VARCHAR(64) NOT NULL DEFAULT ''"
                      : "ALTER TABLE note_reports ADD COLUMN ip_hash TEXT NOT NULL DEFAULT ''");
    }
    if (!in_array('resolved', $cols, true)) {
        $db->exec($my ? 'ALTER TABLE note_reports ADD COLUMN resolved TINYINT NOT NULL DEFAULT 0'
                      : 'ALTER TABLE note_reports ADD COLUMN resolved INTEGER NOT NULL DEFAULT 0');
    }
}

/**
 * Plain text in: control and format characters out, trimmed. Kept: newline,
 * tab, and the zero-width joiner and non-joiner, which emoji sequences and
 * Persian or Urdu writing need. Bidirectional overrides and isolates go, so a
 * note cannot reorder the text around it. Three or more blank lines become one.
 */
function notes_clean(string $s): string
{
    $s = str_replace("\r\n", "\n", $s);
    $s = preg_replace('/(?![\n\t\x{200C}\x{200D}])\p{C}/u', '', $s) ?? '';
    $s = preg_replace("/\n{3,}/", "\n\n", $s) ?? '';
    return trim($s);
}

/** Characters that are not whitespace: the minimum length counts these, so 28 newlines cannot pass it. */
function notes_visible_len(string $s): int
{
    $n = preg_match_all('/\S/u', $s);
    return $n === false ? -1 : $n;
}

/** Trusted: at least NOTES_TRUSTED_AFTER other published notes. Their new notes skip review, and reports send them to review instead of hiding them. */
function notes_author_trusted(PDO $db, string $userId, string $exceptNote = ''): bool
{
    $st = $db->prepare("SELECT COUNT(*) FROM notes WHERE user_id=? AND status='published' AND id<>?");
    $st->execute([$userId, $exceptNote]);
    return (int)$st->fetchColumn() >= NOTES_TRUSTED_AFTER;
}

/**
 * After a report: hide the note only when enough verified accounts, from at
 * least two different addresses, have open reports on it, and its author is
 * not trusted. A trusted author's reported note stays up and shows in the
 * moderation queue. Returns true when it hid the note.
 */
function notes_apply_reports(PDO $db, array $note): bool
{
    $st = $db->prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT ip_hash) AS ips FROM note_reports WHERE note_id=? AND resolved=0');
    $st->execute([$note['id']]);
    $r = $st->fetch();
    if ((int)$r['n'] < NOTES_HIDE_AT_REPORTS || (int)$r['ips'] < NOTES_HIDE_MIN_ADDRESSES) return false;
    if (notes_author_trusted($db, $note['user_id'], $note['id'])) return false;
    $up = $db->prepare("UPDATE notes SET status='hidden', updated_at=? WHERE id=? AND status='published'");
    $up->execute([now(), $note['id']]);
    if ($up->rowCount() === 0) return false;   // already hidden: log the hide once, not on every later report
    notes_audit($db, $note['id'], 'auto-hide');
    return true;
}

function notes_len(string $s): int
{
    $n = preg_match_all('/./su', $s);
    return $n === false ? -1 : $n;
}

/** What a reader may see of a note: never the author's id or email. */
function notes_public(array $r, ?string $viewer = null): array
{
    return [
        'id' => $r['id'],
        'name' => (string)($r['display_name'] ?? 'Traveller'),
        'sites' => array_values(array_filter(explode(',', (string)$r['sites']))),
        'place' => (string)$r['place_text'],
        'month' => (string)$r['visited_month'],
        'body' => (string)$r['body'],
        'helpful' => (int)$r['helpful_count'],
        'at' => (string)$r['created_at'],
        'mine' => $viewer !== null && $viewer === $r['user_id'],
        'marked' => $viewer !== null && !empty($r['marked_by']),
    ];
}

/** Account deletion: a user's notes, and everyone's marks and reports on them, then their own marks and reports. */
function notes_delete_user(PDO $db, string $userId): void
{
    notes_ensure_schema($db);
    $ids = $db->prepare('SELECT id FROM notes WHERE user_id=?');
    $ids->execute([$userId]);
    foreach ($ids->fetchAll(PDO::FETCH_COLUMN) as $nid) {
        $db->prepare('DELETE FROM note_helpful WHERE note_id=?')->execute([$nid]);
        $db->prepare('DELETE FROM note_reports WHERE note_id=?')->execute([$nid]);
    }
    $db->prepare('DELETE FROM notes WHERE user_id=?')->execute([$userId]);
    // Their helpful marks on other people's notes go too, and those counts drop with them.
    $marked = $db->prepare('SELECT note_id FROM note_helpful WHERE user_id=?');
    $marked->execute([$userId]);
    $marked = $marked->fetchAll(PDO::FETCH_COLUMN);
    $db->prepare('DELETE FROM note_helpful WHERE user_id=?')->execute([$userId]);
    foreach ($marked as $nid) notes_recount_helpful($db, (string)$nid);
    $db->prepare('DELETE FROM note_reports WHERE user_id=?')->execute([$userId]);
    // The rate-limit records keyed on this account go too, not a day later.
    $db->prepare('DELETE FROM auth_attempts WHERE ip_hash IN (?,?,?,?)')
       ->execute(['notes-u:' . $userId, 'notes-r:' . $userId, 'notes-h:' . $userId, 'notes-d:' . $userId]);
}

function notes_recount_helpful(PDO $db, string $noteId): void
{
    $db->prepare('UPDATE notes SET helpful_count=(SELECT COUNT(*) FROM note_helpful WHERE note_id=?) WHERE id=?')
       ->execute([$noteId, $noteId]);
}

function notes_audit(PDO $db, string $noteId, string $what): void
{
    $db->prepare('INSERT INTO note_audit (id,note_id,action,at) VALUES (?,?,?,?)')
       ->execute([rid(16), $noteId, $what, now()]);
}

/**
 * The one moderation rule set, used by the JSON API and by moderate.php:
 * publish (clears its reports), hide, or delete (with its marks and reports).
 * Every action is logged in note_audit. Returns a short notice.
 */
function notes_moderate(PDO $db, string $id, string $act): string
{
    notes_ensure_schema($db);
    if ($id === '' || !ctype_xdigit($id)) return 'Invalid id.';
    $st = $db->prepare('SELECT id FROM notes WHERE id=?');
    $st->execute([$id]);
    if (!$st->fetchColumn()) return 'Unknown note.';
    if ($act === 'publish' || $act === 'hide') {
        with_tx($db, function (PDO $db) use ($id, $act) {
            $db->prepare('UPDATE notes SET status=?, updated_at=? WHERE id=?')
               ->execute([$act === 'publish' ? 'published' : 'hidden', now(), $id]);
            // Resolve, do not delete: the same reporters cannot hide it again.
            if ($act === 'publish') $db->prepare('UPDATE note_reports SET resolved=1 WHERE note_id=?')->execute([$id]);
            notes_audit($db, $id, $act);
        });
        return $act === 'publish' ? 'Published.' : 'Hidden.';
    }
    if ($act === 'delete') {
        with_tx($db, function (PDO $db) use ($id) {
            $db->prepare('DELETE FROM note_helpful WHERE note_id=?')->execute([$id]);
            $db->prepare('DELETE FROM note_reports WHERE note_id=?')->execute([$id]);
            $db->prepare('DELETE FROM notes WHERE id=?')->execute([$id]);
            notes_audit($db, $id, 'delete');
        });
        return 'Deleted.';
    }
    return 'Unknown moderation action.';
}

function notes_export(PDO $db, string $userId): array
{
    notes_ensure_schema($db);
    $st = $db->prepare('SELECT id, sites, place_text, visited_month, body, status, helpful_count, created_at FROM notes WHERE user_id=? ORDER BY created_at');
    $st->execute([$userId]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/** The marks and reports an account made on other people's notes, for its data export. */
function notes_export_marks(PDO $db, string $userId): array
{
    notes_ensure_schema($db);
    $h = $db->prepare('SELECT note_id, created_at FROM note_helpful WHERE user_id=? ORDER BY created_at');
    $h->execute([$userId]);
    $r = $db->prepare('SELECT note_id, reason, created_at FROM note_reports WHERE user_id=? ORDER BY created_at');
    $r->execute([$userId]);
    return ['helpful_marks' => $h->fetchAll(PDO::FETCH_ASSOC), 'reports' => $r->fetchAll(PDO::FETCH_ASSOC)];
}
