export type ChatMessage = { role: "assistant" | "user"; content: string };

/**
 * Calls the streaming chat endpoint and reports the accumulated reply as it
 * arrives. Resolves with the full reply; throws an Error whose message is safe
 * to show the user.
 */
export async function streamChat(
  messages: ChatMessage[],
  clues: string[],
  onUpdate: (fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/coach/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, clues }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("인터넷 연결을 확인하고 다시 시도해 주세요.");
  }

  if (!response.ok || !response.body) {
    let message = "대화를 이어오지 못했어요. 잠시 후 다시 시도해 주세요.";
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onUpdate(text);
  }
  text += decoder.decode();
  if (!text.trim()) throw new Error("AI가 답변을 보내지 않았어요. 다시 시도해 주세요.");
  onUpdate(text);
  return text.trim();
}
