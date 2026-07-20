# The Papyrus — issues

Each monthly letter is one versioned file here: `newsletter/issues/<slug>.json`.
The slug is the filename (lower-case letters, digits and dashes only) and is how
you send it.

```json
{
  "subject": "The Papyrus · <one honest, specific line>",
  "html": "<p>Body as simple HTML — headings, paragraphs, <a href=\"…\">links</a>.</p>"
}
```

- Write the body as plain, cited prose in the voice of the blog ("Egypt, told
  through its data"). Every figure real and cited — same rule as the rest of the
  site. Keep the HTML simple (p / h2 / h3 / a / strong / ul); the sender wraps it
  in the branded shell and appends the unsubscribe footer automatically.
- **Do not** add an unsubscribe link yourself — `send_issue.php` adds a
  per-recipient one (and the `List-Unsubscribe` header) to every message.

## Sending

The sender is dry-run by default and only ever mails **confirmed** subscribers.

1. **Preview** (sends nothing): the "Send The Papyrus" GitHub Action with
   `mode: dry` — or directly:
   `https://egybi.com/api/send_issue.php?key=<ANALYTICS_KEY>&slug=<slug>`
   It returns the confirmed-recipient count and a text preview.
2. **Send for real:** the same Action with `mode: live`, which loops one
   throttled batch at a time until `remaining` is 0. A resend is safe — anyone
   already sent this issue is skipped (idempotent via `newsletter_sends`).

The `ANALYTICS_KEY` is the same secret as `insights.php`; store it as the
`ANALYTICS_KEY` GitHub Actions secret. Nothing here sends without it.
