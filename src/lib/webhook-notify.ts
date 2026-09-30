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
