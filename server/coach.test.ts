import { describe, expect, it } from "vitest";
import { toClaudeMessages } from "./coach/ai";
import { takeToken } from "./coach/rateLimit";
import { isUnsafeAction, isUnsafeGoal } from "./coach/safety";

describe("toClaudeMessages", () => {
  it("drops the leading greeting so the conversation starts with the user", () => {
    const out = toClaudeMessages([
      { role: "assistant", content: "안녕하세요" },
      { role: "user", content: "에베레스트에 오르고 싶어요" },
    ]);
    expect(out).toEqual([{ role: "user", content: "에베레스트에 오르고 싶어요" }]);
  });

  it("merges consecutive same-role turns and skips blanks", () => {
    const out = toClaudeMessages([
      { role: "user", content: "첫 번째" },
      { role: "user", content: "  " },
      { role: "user", content: "두 번째" },
      { role: "assistant", content: "좋아요" },
    ]);
    expect(out).toEqual([
      { role: "user", content: "첫 번째\n\n두 번째" },
      { role: "assistant", content: "좋아요" },
    ]);
  });
});

describe("safety filter", () => {
  it("blocks risky actions but allows safe preparation", () => {
    expect(isUnsafeAction("혼자 암벽 등반 도전하기")).toBe(true);
    expect(isUnsafeAction("에베레스트 정상에 오르기")).toBe(true);
    expect(isUnsafeAction("하루 굶기")).toBe(true);
    expect(isUnsafeAction("계단 10분 오르기")).toBe(false);
    expect(isUnsafeAction("에베레스트 원정 가이드 정보 찾아보기")).toBe(false);
  });

  it("flags self-harm goals", () => {
    expect(isUnsafeGoal("자해하고 싶어요")).toBe(true);
    expect(isUnsafeGoal("책을 쓰고 싶어요")).toBe(false);
  });
});

describe("rate limit", () => {
  it("stops a client after the window budget is spent", () => {
    const key = `test-${Math.random()}`;
    let allowed = 0;
    for (let i = 0; i < 100; i++) if (takeToken(key, 1_000)) allowed++;
    expect(allowed).toBe(60);
    expect(takeToken(key, 1_000 + 11 * 60 * 1000)).toBe(true);
  });
});
