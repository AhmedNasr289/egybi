<?php
/**
 * EgyBI — Phase 2: tiny dependency-free SMTP sender (no Composer, so it runs on
 * the framework-free Hostinger stack). Speaks just enough SMTP to send a single
 * HTML email via Hostinger's server (smtp.hostinger.com), supporting SSL on port
 * 465 and STARTTLS on 587. CONFIG-GATED: if SMTP settings are not filled in
 * (_private/config.php or env), it does NOT try to send — it appends the message
 * to _private/mail.log and returns false, so signup/reset still succeed and the
 * link is available for dev/manual use. Fill smtp_* in config to go live.
 */
declare(strict_types=1);
require_once __DIR__ . '/lib.php';

/** The reason the last send failed, for diagnostics. Never contains the password. */
function mail_last_error(?string $set = null): string
{
    static $e = '';
    if ($set !== null) $e = $set;
    return $e;
}

/** Send one HTML email. Returns true if handed to the SMTP server, else false. */
function send_mail(string $to, string $subject, string $html): bool
{
    mail_last_error('');
    $c = auth_cfg();
    $from = $c['mail_from']; $fromName = $c['mail_from_name'];

    if ($c['smtp_host'] === '' || $c['smtp_user'] === '' || $c['smtp_pass'] === '') {
        // Not configured yet — log instead of sending (dev / pre-mailer).
        mail_last_error('SMTP not configured (smtp_host / smtp_user / smtp_pass empty)');
        @file_put_contents(__DIR__ . '/_private/mail.log',
            now() . " (unsent — SMTP not configured) TO=$to SUBJ=$subject\n", FILE_APPEND | LOCK_EX);
        return false;
    }

    $host = $c['smtp_host']; $port = (int)$c['smtp_port'];
    $eol = "\r\n";
    $errno = 0; $errstr = '';
    $transport = ($port === 465) ? "ssl://$host:$port" : "tcp://$host:$port";
    $fp = @stream_socket_client($transport, $errno, $errstr, 15);
    if (!$fp) { mail_log_fail($to, "connect: $errstr"); return false; }
    stream_set_timeout($fp, 15);

    $read = function () use ($fp) {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) { $data .= $line; if (isset($line[3]) && $line[3] === ' ') break; }
        return $data;
    };
    $cmd = function (string $c) use ($fp, $eol) { fwrite($fp, $c . $eol); };
    $expect = function (string $data, string $code) { return strncmp($data, $code, 3) === 0; };

    $ok = true;
    $read(); // 220 greeting
    $cmd("EHLO egybi.com"); $ehlo = $read();
    if ($port !== 465) { // STARTTLS on 587
        $cmd("STARTTLS"); $r = $read();
        if (!$expect($r, '220') || !@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { fclose($fp); mail_log_fail($to, 'starttls'); return false; }
        $cmd("EHLO egybi.com"); $read();
    }
    // Each step records the server's actual reply. Previously a failure logged
    // only the word "auth" or "send", which tells you nothing about WHY — and a
    // wrong mailbox password looks identical to a blocked port.
    $step = function (string $command, string $want, string $label) use ($cmd, $read, $expect, &$ok) {
        if (!$ok) return;
        $cmd($command);
        $r = $read();
        if (!$expect($r, $want)) {
            $ok = false;
            mail_last_error($label . ': ' . trim(substr($r, 0, 180)));
        }
    };

    $step('AUTH LOGIN', '334', 'AUTH LOGIN');
    $step(base64_encode($c['smtp_user']), '334', 'username rejected');
    $step(base64_encode($c['smtp_pass']), '235', 'password rejected');   // 235 = auth success
    if (!$ok) { $cmd('QUIT'); fclose($fp); mail_log_fail($to, 'auth'); return false; }

    $step("MAIL FROM:<$from>", '250', 'MAIL FROM rejected');
    $step("RCPT TO:<$to>", '250', 'RCPT TO rejected');
    $step('DATA', '354', 'DATA rejected');
    if ($ok) {
        // Date and Message-ID are not optional in practice: their absence is a
        // strong spam signal, and several providers will junk mail without them.
        $msgId = '<' . bin2hex(random_bytes(12)) . '@' . (parse_url($c['app_url'], PHP_URL_HOST) ?: 'egybi.com') . '>';
        $boundary = 'egybi-' . bin2hex(random_bytes(8));
        $replyTo = $c['smtp_user'] !== '' ? $c['smtp_user'] : $from;

        $headers = 'From: ' . mime_name($fromName) . " <$from>" . $eol
                 . "To: <$to>" . $eol
                 . 'Subject: ' . mime_encode($subject) . $eol
                 . 'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000' . $eol
                 . 'Message-ID: ' . $msgId . $eol
                 . 'MIME-Version: 1.0' . $eol
                 . 'Content-Type: multipart/alternative; boundary="' . $boundary . '"' . $eol
                 . 'Reply-To: ' . $replyTo . $eol . $eol;

        // A plain-text alternative alongside the HTML. HTML-only mail scores
        // worse with spam filters, and some clients show nothing without it.
        $text = html_to_text($html);
        $body = '--' . $boundary . $eol
              . 'Content-Type: text/plain; charset=utf-8' . $eol . $eol
              . $text . $eol . $eol
              . '--' . $boundary . $eol
              . 'Content-Type: text/html; charset=utf-8' . $eol . $eol
              . $html . $eol . $eol
              . '--' . $boundary . '--';

        // dot-stuff any line starting with a period (SMTP transparency)
        $body = preg_replace('/^\./m', '..', $body);
        $cmd($headers . $body . $eol . '.');
        $r = $read();
        if (!$expect($r, '250')) { $ok = false; mail_last_error('message rejected: ' . trim(substr($r, 0, 180))); }
    }
    $cmd('QUIT'); fclose($fp);
    if (!$ok) mail_log_fail($to, 'send');
    return $ok;
}

/** A readable plain-text version of the HTML body, links kept inline. */
function html_to_text(string $html): string
{
    $s = preg_replace('~<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>~is', '$2: $1', $html);
    $s = preg_replace('~<(br|/p|/div|/h[1-6])[^>]*>~i', "\n", $s);
    $s = html_entity_decode(strip_tags($s), ENT_QUOTES, 'UTF-8');
    $s = preg_replace('/[ \t]+/', ' ', $s);
    $s = preg_replace('/\n\s*\n\s*\n+/', "\n\n", $s);
    return trim($s);
}

function mime_encode(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
function mime_name(string $s): string { return preg_match('/[^\x20-\x7E]/', $s) ? mime_encode($s) : $s; }
function mail_log_fail(string $to, string $stage): void
{
    $why = mail_last_error();
    // error_log as well as the file: _private/mail.log lives inside public_html
    // and is therefore erased by every deploy, so it is the one place a failure
    // record must NOT be the only copy.
    error_log("[EgyBI] mail send failed [$stage] to=$to — $why");
    @file_put_contents(__DIR__ . '/_private/mail.log',
        now() . " SEND-FAIL[$stage] TO=$to WHY=$why\n", FILE_APPEND | LOCK_EX);
}

/** Build a branded HTML email body around a call-to-action link. */
function mail_template(string $heading, string $intro, string $ctaText, string $ctaUrl): string
{
    $h = htmlspecialchars($heading, ENT_QUOTES); $i = htmlspecialchars($intro, ENT_QUOTES);
    $ct = htmlspecialchars($ctaText, ENT_QUOTES); $u = htmlspecialchars($ctaUrl, ENT_QUOTES);
    return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#292420">'
        . '<div style="background:#14110C;padding:22px 24px;border-radius:12px 12px 0 0"><span style="color:#C9A227;font-weight:bold;font-size:20px">EgyBI</span></div>'
        . '<div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:26px 24px">'
        . '<h2 style="color:#0E2A5E;margin:0 0 10px">' . $h . '</h2>'
        . '<p style="line-height:1.6;color:#444">' . $i . '</p>'
        . '<p style="margin:22px 0"><a href="' . $u . '" style="background:#C9A227;color:#14110C;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">' . $ct . '</a></p>'
        . '<p style="font-size:12px;color:#999">If the button does not work, copy this link:<br>' . $u . '</p>'
        . '<p style="font-size:12px;color:#999">If you did not request this, you can ignore this email.</p>'
        . '</div></div>';
}
