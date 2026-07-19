<?php
/**
 * EgyBI — Phase 2: payments webhook (Paddle / LemonSqueezy) — CONFIG-GATED OFF.
 *
 * Every plan is FREE at launch, so this endpoint is INERT: it does nothing and
 * returns 200 unless PAY_ENABLED=1 AND a signing secret is configured. This
 * mirrors the AdSense config-gate — no payment code runs, and no request can
 * change a user's plan, until you deliberately switch it on. When enabled, a
 * verified webhook (subscription created/updated/cancelled) maps a customer to
 * a user and sets users.plan; the entitlements table then grants the Pro rows.
 * Wire it up per DEPLOY.md when you introduce a paid tier.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

$enabled = (getenv('PAY_ENABLED') ?: '0') === '1';
$secret  = getenv('PAY_WEBHOOK_SECRET') ?: '';

if (!$enabled || $secret === '') {
    // Inert: acknowledge without doing anything. Payments are off at launch.
    json_out(true, ['message' => 'Payments are not enabled.', 'enabled' => false]);
}

// --- when enabled (future) --------------------------------------------------
// 1. Read the raw body and verify the provider signature against $secret
//    (Paddle: p_signature / LemonSqueezy: X-Signature HMAC-SHA256) — reject on
//    mismatch with 401. NEVER trust an unsigned webhook.
// 2. Parse the event; on an active subscription, look up the user by the
//    checkout's custom user_id / email and:
//       UPDATE users SET plan='pro', updated_at=? WHERE id=?
//    On cancel/expire, set plan back to 'free'. Entitlements do the gating.
// 3. Respond 200 quickly; do the work idempotently (webhooks retry).
$raw = file_get_contents('php://input') ?: '';
// Signature verification + handling is intentionally left to enable-time so that
// no untested payment path is live before a real integration is configured.
@file_put_contents(__DIR__ . '/_private/pay.log', now() . " WEBHOOK len=" . strlen($raw) . "\n", FILE_APPEND | LOCK_EX);
json_out(true, ['message' => 'Received.']);
