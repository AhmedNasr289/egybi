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

/** Send one HTML email. Returns true if handed to the SMTP server, else false. */
function send_mail(string $to, string $subject, string $html): bool
{
    $c = auth_cfg();
    $from = $c['mail_from']; $fromName = $c['mail_from_name'];

    if ($c['smtp_host'] === '' || $c['smtp_user'] === '' || $c['smtp_pass'] === '') {
        // Not configured yet — log instead of sending (dev / pre-mailer).
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
    $cmd("AUTH LOGIN"); if (!$expect($read(), '334')) $ok = false;
    $cmd(base64_encode($c['smtp_user'])); if (!$expect($read(), '334')) $ok = false;
    $cmd(base64_encode($c['smtp_pass'])); if (!$expect($read(), '235')) $ok = false; // 235 = auth success
    if (!$ok) { $cmd('QUIT'); fclose($fp); mail_log_fail($to, 'auth'); return false; }

    $cmd("MAIL FROM:<$from>"); if (!$expect($read(), '250')) $ok = false;
    $cmd("RCPT TO:<$to>"); if (!$expect($read(), '250')) $ok = false;
    $cmd("DATA"); if (!$expect($read(), '354')) $ok = false;
    if ($ok) {
        $headers = 'From: ' . mime_name($fromName) . " <$from>" . $eol
                 . "To: <$to>" . $eol
                 . 'Subject: ' . mime_encode($subject) . $eol
                 . 'MIME-Version: 1.0' . $eol
                 . 'Content-Type: text/html; charset=utf-8' . $eol
                 . 'Reply-To: hello@egybi.com' . $eol . $eol;
        // dot-stuff any line starting with a period
        $body = preg_replace('/^\./m', '..', $html);
        $cmd($headers . $body . $eol . '.'); if (!$expect($read(), '250')) $ok = false;
    }
    $cmd('QUIT'); fclose($fp);
    if (!$ok) mail_log_fail($to, 'send');
    return $ok;
}

function mime_encode(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
function mime_name(string $s): string { return preg_match('/[^\x20-\x7E]/', $s) ? mime_encode($s) : $s; }
function mail_log_fail(string $to, string $stage): void
{
    @file_put_contents(__DIR__ . '/_private/mail.log', now() . " SEND-FAIL[$stage] TO=$to\n", FILE_APPEND | LOCK_EX);
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
