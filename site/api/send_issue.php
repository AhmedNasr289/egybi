<?php
/**
 * EgyBI — The Papyrus issue sender (ADMIN, key-gated WRITE endpoint).
 *
 * Sends one newsletter issue to the confirmed, not-unsubscribed subscriber list
 * over the existing Hostinger SMTP mailer. Built for shared hosting:
 *
 *   - DRY-RUN BY DEFAULT. Without `dry=0` it sends NOTHING — it reports the
 *     recipient count and a preview so you can eyeball an issue safely.
 *   - Idempotent. Each recipient gets a row in `newsletter_sends` keyed by
 *     (issue_id, email); a re-run skips anyone already sent, so a crashed or
 *     repeated call can never double-mail a subscriber.
 *   - Throttled + batched. One HTTP call sends at most `batch` recipients with a
 *     short sleep between each; the caller (a GitHub Action) loops until
 *     `remaining` reaches 0, respecting the host's hourly send cap.
 *   - Gated by the ANALYTICS_KEY (same secret as insights.php / mail-test),
 *     compared with hash_equals. No key on the server → the endpoint refuses.
 *
 * Issues are authored as versioned repo files: newsletter/issues/<slug>.json
 * with { "subject": "...", "html": "<p>...</p>" }. The body HTML is wrapped in
 * the branded shell + a per-recipient unsubscribe footer before sending.
 *
 *   GET/POST params:  key (required) · slug (required) · dry (default 1) · batch (default 40)
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../auth/lib.php';
require_once __DIR__ . '/../auth/mailer.php';

function say(array $x, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($x);
    exit;
}

// --- admin gate: the analytics key, fail-closed ---------------------------
$key  = (string)($_GET['key'] ?? $_POST['key'] ?? '');
$want = analytics_key();
if ($want === '')                                              say(['ok' => false, 'error' => 'ANALYTICS_KEY not configured on the server'], 503);
if (strlen($key) !== strlen($want) || !hash_equals($want, $key)) say(['ok' => false, 'error' => 'unauthorized'], 403);

// --- inputs ---------------------------------------------------------------
$slug = preg_replace('/[^a-z0-9\-]/', '', strtolower((string)($_GET['slug'] ?? $_POST['slug'] ?? '')));
if ($slug === '') say(['ok' => false, 'error' => 'missing slug'], 422);
$dry   = ((string)($_GET['dry'] ?? $_POST['dry'] ?? '1')) !== '0';  // dry-run unless dry=0
$batch = (int)($_GET['batch'] ?? $_POST['batch'] ?? 40);

// --- load the versioned issue file ----------------------------------------
$file = realpath(__DIR__ . '/../newsletter/issues/' . $slug . '.json');
$base = realpath(__DIR__ . '/../newsletter/issues');
if ($file === false || $base === false || strpos($file, $base) !== 0) {
    say(['ok' => false, 'error' => "no issue file for slug '$slug'"], 404);
}
$doc = json_decode((string)file_get_contents($file), true);
if (!is_array($doc) || trim((string)($doc['subject'] ?? '')) === '' || trim((string)($doc['html'] ?? '')) === '') {
    say(['ok' => false, 'error' => 'issue file needs a non-empty subject and html'], 422);
}

// --- durable store required (SMTP list lives in MySQL) --------------------
if (!durable_db()) say(['ok' => false, 'error' => 'no durable database configured — cannot send'], 503);

$issue = newsletter_upsert_issue($slug, (string)$doc['subject'], (string)$doc['html']);
if (!$issue) say(['ok' => false, 'error' => 'could not store the issue'], 500);
$stats = newsletter_issue_stats($issue['id']);

// --- DRY RUN: report and send nothing -------------------------------------
if ($dry) {
    say([
        'ok' => true, 'dry_run' => true, 'issue' => $slug, 'subject' => $issue['subject'],
        'confirmed_recipients' => $stats['confirmed'], 'already_sent' => $stats['sent'],
        'remaining' => $stats['remaining'],
        'preview' => substr(trim(preg_replace('/\s+/', ' ', strip_tags((string)$doc['html']))), 0, 240),
        'note' => 'Nothing was sent. Re-run with dry=0 to send this batch.',
    ]);
}

// --- LIVE: one throttled, idempotent batch --------------------------------
newsletter_mark_issue($issue['id'], 'sending');
$recips = newsletter_recipients_pending($issue['id'], $batch);
$sent = 0; $failed = 0;
foreach ($recips as $r) {
    $unsub = newsletter_unsub_url($r['email'], (string)$r['token']);
    $html  = newsletter_wrap_issue((string)$doc['html'], $unsub);
    $ok = @send_mail($r['email'], (string)$issue['subject'], $html, [
        'List-Unsubscribe'      => '<' . $unsub . '>, <mailto:' . auth_cfg()['smtp_user'] . '?subject=unsubscribe>',
        'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
    ]);
    newsletter_record_send($issue['id'], $r['email'], $ok ? 'sent' : 'failed', $ok ? '' : mail_last_error());
    $ok ? $sent++ : $failed++;
    usleep(400000); // 0.4s between sends — gentle on the shared-host rate limit
}
$stats = newsletter_issue_stats($issue['id']);
if ($stats['remaining'] === 0) newsletter_mark_issue($issue['id'], 'sent');

say([
    'ok' => true, 'dry_run' => false, 'issue' => $slug,
    'sent_this_batch' => $sent, 'failed_this_batch' => $failed,
    'total_sent' => $stats['sent'], 'total_failed' => $stats['failed'], 'remaining' => $stats['remaining'],
]);
