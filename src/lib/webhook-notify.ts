import { createHmac } from 'node:crypto';

/**
 * Outbound webhook notifications for newly created bugs.
 *
 * Receivers verify authenticity by recomputing the HMAC-SHA256 of the
 * request body with the shared secret and comparing it to the
 * `x-bugwall-signature` header, so a delivery can always be verified
 * byte-for-byte. Deliveries retry up to MAX_ATTEMPTS with a short
 * backoff; failures never affect the caller.
 */

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 250;

export interface BugCreatedEvent {
  id: number;
  title: string;
  slug: string;
}

function sign(secret: string, payload: object): string {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

export async function notifyBugCreated(event: BugCreatedEvent): Promise<void> {
  const url = process.env.BUGWALL_WEBHOOK_URL;
  const secret = process.env.BUGWALL_WEBHOOK_SECRET;
  if (!url || !secret) return;

  // Validate URL scheme and block private/internal IP ranges to prevent SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return;
  }
  if (parsedUrl.protocol !== 'https:') return;
  const hostname = parsedUrl.hostname;
  // Block loopback, link-local, private RFC-1918, and other internal ranges
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^::1$/.test(hostname) ||
    /^fc00:/i.test(hostname) ||
    /^fe80:/i.test(hostname)
  ) return;

  const signature = sign(secret, event);
  const body = JSON.stringify({
    ...event,
    event: 'bug.created',
    sentAt: new Date().toISOString(),
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bugwall-signature': signature,
      },
      body,
    });
    if (res.ok) return;
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
    }
  }
}
