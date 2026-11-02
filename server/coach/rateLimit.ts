import type { IncomingMessage } from "http";

// Best-effort, in-memory sliding window per client IP. The app has no login,
// so this keeps one visitor from running up the Claude bill. On serverless
// hosts each warm instance keeps its own window, which is fine for this purpose.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.COACH_RATE_LIMIT ?? 60);
const hits = new Map<string, number[]>();

export function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

/** Returns true when the request is allowed. */
export function takeToken(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (!times.some(t => now - t < WINDOW_MS)) hits.delete(k);
  }
  return true;
}

export const RATE_LIMIT_MESSAGE = "잠깐 쉬어 갈까요? 요청이 많아서 몇 분 뒤에 다시 이어갈 수 있어요.";
