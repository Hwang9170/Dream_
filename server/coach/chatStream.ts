import type { Request, Response } from "express";
import { z } from "zod";
import { cluesSchema, conversationSchema } from "../coachRouter";
import { MissingApiKeyError, streamChatReply } from "./ai";
import { clientIp, RATE_LIMIT_MESSAGE, takeToken } from "./rateLimit";

const bodySchema = z.object({ messages: conversationSchema, clues: cluesSchema });

/**
 * POST /api/coach/chat — streams the coach's reply as plain UTF-8 text chunks.
 * Errors before the first byte come back as JSON `{ message }` with a non-2xx
 * status; the client keeps the user's draft and offers a retry.
 */
export async function handleChatStream(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "메시지 형식이 올바르지 않아요." });
    return;
  }
  if (!takeToken(clientIp(req))) {
    res.status(429).json({ message: RATE_LIMIT_MESSAGE });
    return;
  }

  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });

  let started = false;
  try {
    await streamChatReply(
      parsed.data.messages,
      text => {
        if (!started) {
          started = true;
          res.status(200).set({
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          });
          res.flushHeaders();
        }
        res.write(text);
      },
      abort.signal,
      parsed.data.clues
    );
    if (!started) {
      res.status(502).json({ message: "AI가 답변을 보내지 않았어요. 다시 시도해 주세요." });
      return;
    }
    res.end();
  } catch (error) {
    if (abort.signal.aborted) return;
    console.error("[Coach] Chat stream failed", error);
    if (started) {
      res.end();
      return;
    }
    const message =
      error instanceof MissingApiKeyError
        ? "AI 연결 설정이 아직 끝나지 않았어요. (ANTHROPIC_API_KEY)"
        : "대화를 이어오지 못했어요. 입력한 내용은 남아 있으니 잠시 후 다시 시도해 주세요.";
    res.status(503).json({ message });
  }
}
