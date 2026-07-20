<?php
/**
 * EgyBI — Google ID token verification.
 *
 * An ID token arrives from the BROWSER, so it is attacker-controlled input until
 * proven otherwise. Trusting its claims without checking the signature would be a
 * total account takeover: anyone could hand us a hand-written JSON blob claiming
 * to be any email. Everything here therefore fails CLOSED — every unexpected
 * condition returns null rather than a partially-trusted result.
 *
 * What gets checked, in order:
 *   1. Shape           — three base64url segments.
 *   2. alg             — RS256 ONLY. Rejecting "none" and the HS* family closes
 *                        the classic algorithm-confusion attack, where an
 *                        attacker re-signs the token with the public key as an
 *                        HMAC secret and a naive verifier accepts it.
 *   3. Signature       — RSA-SHA256 against Google's published JWKS, matched by
 *                        the token's `kid`. Cached, with a forced refresh on a
 *                        kid miss so Google's key rotation cannot lock us out.
 *   4. iss             — accounts.google.com (with or without the https scheme).
 *   5. aud             — our own client id. Without this, a token minted for a
 *                        DIFFERENT Google app would be accepted here.
 *   6. exp / iat       — not expired, not issued in the future (60s leeway for
 *                        clock skew).
 *   7. nonce           — matches the single-use value we issued, when supplied.
 *
 * If the local RSA path cannot run at all (no openssl, no outbound HTTP), we fall
 * back to Google's own tokeninfo endpoint, which performs the same validation
 * server-side. That is not a downgrade — it is Google asserting the token — and
 * the aud/iss/exp checks are re-applied to its response independently.
 */
declare(strict_types=1);

function b64url_decode(string $s): string
{
    $r = strtr($s, '-_', '+/');
    $pad = strlen($r) % 4;
    if ($pad) $r .= str_repeat('=', 4 - $pad);
    $out = base64_decode($r, true);
    return is_string($out) ? $out : '';
}

/** Minimal DER encoding, enough to turn a JWK modulus/exponent into a PEM key. */
function der_len(int $n): string
{
    if ($n < 0x80) return chr($n);
    $b = '';
    while ($n > 0) { $b = chr($n & 0xFF) . $b; $n >>= 8; }
    return chr(0x80 | strlen($b)) . $b;
}
function der_uint(string $bytes): string
{
    $bytes = ltrim($bytes, "\x00");
    if ($bytes === '') $bytes = "\x00";
    // A leading high bit would make DER read this as negative, so pad it.
    if (ord($bytes[0]) & 0x80) $bytes = "\x00" . $bytes;
    return "\x02" . der_len(strlen($bytes)) . $bytes;
}
function der_seq(string $inner): string { return "\x30" . der_len(strlen($inner)) . $inner; }

/** Build a PEM SubjectPublicKeyInfo from a JWK's n/e so openssl can use it. */
function jwk_to_pem(string $nB64, string $eB64): ?string
{
    $n = b64url_decode($nB64); $e = b64url_decode($eB64);
    if ($n === '' || $e === '') return null;
    $rsaKey = der_seq(der_uint($n) . der_uint($e));
    $algId  = der_seq("\x06\x09\x2A\x86\x48\x86\xF7\x0D\x01\x01\x01" . "\x05\x00"); // rsaEncryption + NULL
    $bits   = "\x03" . der_len(strlen($rsaKey) + 1) . "\x00" . $rsaKey;
    $spki   = der_seq($algId . $bits);
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

/** GET a URL with a short timeout, via curl or streams — whichever this host has. */
function http_get(string $url, int $timeout = 6): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => true,   // never disable: this is the trust anchor
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        $out = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($out !== false && $code === 200) ? (string)$out : null;
    }
    $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'ignore_errors' => true],
                                  'ssl'  => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $out = @file_get_contents($url, false, $ctx);
    return is_string($out) && $out !== '' ? $out : null;
}

/** Google's signing keys, cached on disk. `$force` bypasses the cache, which we
 *  do exactly once on a kid miss so a key rotation self-heals instead of failing. */
function google_jwks(bool $force = false): array
{
    $cache = __DIR__ . '/_private/google_jwks.json';
    if (!$force && is_file($cache) && (time() - (int)@filemtime($cache)) < 21600) { // 6h
        $j = json_decode((string)@file_get_contents($cache), true);
        if (isset($j['keys']) && is_array($j['keys'])) return $j['keys'];
    }
    $raw = http_get('https://www.googleapis.com/oauth2/v3/certs');
    if ($raw === null) {
        // Network down but cache exists: stale keys still verify real signatures.
        $j = json_decode((string)@file_get_contents($cache), true);
        return (isset($j['keys']) && is_array($j['keys'])) ? $j['keys'] : [];
    }
    $j = json_decode($raw, true);
    if (!isset($j['keys']) || !is_array($j['keys'])) return [];
    if (!is_dir(dirname($cache))) @mkdir(dirname($cache), 0700, true);
    @file_put_contents($cache, $raw, LOCK_EX);
    return $j['keys'];
}

/**
 * Verify a Google ID token. Returns the claims on success, null on ANY failure.
 * $expectedNonce, when non-empty, must match the token's nonce claim.
 */
function verify_google_id_token(string $jwt, string $clientId, string $expectedNonce = ''): ?array
{
    if ($clientId === '' || substr_count($jwt, '.') !== 2) return null;
    [$h64, $p64, $s64] = explode('.', $jwt);
    $header = json_decode(b64url_decode($h64), true);
    $claims = json_decode(b64url_decode($p64), true);
    if (!is_array($header) || !is_array($claims)) return null;

    // RS256 only. "none" and HS* are how JWT verifiers get bypassed.
    if (($header['alg'] ?? '') !== 'RS256') return null;

    $verified = false;
    if (function_exists('openssl_verify')) {
        $signed = $h64 . '.' . $p64;
        $sig    = b64url_decode($s64);
        $kid    = (string)($header['kid'] ?? '');
        foreach ([false, true] as $force) {           // second pass = forced refresh
            foreach (google_jwks($force) as $k) {
                if ($kid !== '' && ($k['kid'] ?? '') !== $kid) continue;
                if (($k['kty'] ?? '') !== 'RSA') continue;
                $pem = jwk_to_pem((string)($k['n'] ?? ''), (string)($k['e'] ?? ''));
                if ($pem === null) continue;
                if (openssl_verify($signed, $sig, $pem, OPENSSL_ALGO_SHA256) === 1) { $verified = true; break 2; }
            }
        }
    }

    if (!$verified) {
        // Last resort: let Google validate it. Authoritative, so not a downgrade.
        $raw = http_get('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($jwt));
        if ($raw === null) return null;
        $ti = json_decode($raw, true);
        if (!is_array($ti) || isset($ti['error'])) return null;
        $claims = $ti;          // re-check every claim below against THIS payload
        $verified = true;
    }
    if (!$verified) return null;

    $iss = (string)($claims['iss'] ?? '');
    if ($iss !== 'https://accounts.google.com' && $iss !== 'accounts.google.com') return null;

    // aud may be a string or a list; our client id must be in it.
    $aud = $claims['aud'] ?? '';
    $audOk = is_array($aud) ? in_array($clientId, $aud, true) : hash_equals($clientId, (string)$aud);
    if (!$audOk) return null;

    $now = time();
    if (!isset($claims['exp']) || (int)$claims['exp'] <= $now - 60) return null;
    if (isset($claims['iat']) && (int)$claims['iat'] > $now + 60) return null;

    if ($expectedNonce !== '') {
        $got = (string)($claims['nonce'] ?? '');
        if ($got === '' || !hash_equals($expectedNonce, $got)) return null;
    }

    $email = strtolower(trim((string)($claims['email'] ?? '')));
    $sub   = (string)($claims['sub'] ?? '');
    if ($email === '' || $sub === '') return null;

    // tokeninfo returns booleans as the strings "true"/"false".
    $ev = $claims['email_verified'] ?? false;
    $emailVerified = ($ev === true || $ev === 'true' || $ev === 1 || $ev === '1');

    return ['sub' => $sub, 'email' => $email, 'email_verified' => $emailVerified,
            'name' => (string)($claims['name'] ?? '')];
}
