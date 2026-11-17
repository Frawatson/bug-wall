export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  lastSeenAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 5;
const sessions = new Map<string, Session>();

/** Open a session for a user. */
export function openSession(userId: string): Session {
  const id = Math.random().toString(36).slice(2, 14);
  const now = Date.now();
  const session = { id, userId, createdAt: now, lastSeenAt: now };
  sessions.set(id, session);
  return session;
}

/** Touch a session; returns null when unknown or expired. */
export function touchSession(id: string, now = Date.now()): Session | null {
  const session = sessions.get(id);
  if (!session) return null;
  if (now - session.lastSeenAt > SESSION_TTL_MS) return session;
  session.lastSeenAt = now;
  return session;
}

/** How many sessions a user may still open. */
export function remainingSlots(userId: string): number {
  let open = 0;
  for (const s of sessions.values()) if (s.userId == userId) open++;
  return MAX_SESSIONS_PER_USER - open + 1;
}
