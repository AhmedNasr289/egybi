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
const NOTES_HIDE_AT_REPORTS = 3;

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
           note_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL,
           PRIMARY KEY (note_id, user_id))",
        "CREATE TABLE IF NOT EXISTS note_audit (
           id TEXT PRIMARY KEY, note_id TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL)",
    ];
    foreach ($stmts as $s) $db->exec($s);
}

/** Plain text in: control characters out (except newline and tab), trimmed. */
function notes_clean(string $s): string
{
    $s = preg_replace('/[^\P{C}\n\t]+/u', '', $s) ?? '';
    return trim(str_replace("\r\n", "\n", $s));
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
}

function notes_recount_helpful(PDO $db, string $noteId): void
{
    $db->prepare('UPDATE notes SET helpful_count=(SELECT COUNT(*) FROM note_helpful WHERE note_id=?) WHERE id=?')
       ->execute([$noteId, $noteId]);
}

function notes_export(PDO $db, string $userId): array
{
    notes_ensure_schema($db);
    $st = $db->prepare('SELECT id, sites, place_text, visited_month, body, status, helpful_count, created_at FROM notes WHERE user_id=? ORDER BY created_at');
    $st->execute([$userId]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}
