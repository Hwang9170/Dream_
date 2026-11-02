import { describe, expect, it } from "vitest";
import {
  countStreak,
  dreamFit,
  getLocalDateKey,
  isDoneToday,
  migrateLegacy,
  normalizeState,
  type Dream,
  type LogEntry,
} from "@shared/dreamModel";
import { formatLogs } from "./coach/ai";

const log = (energy: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  id: Math.random().toString(36),
  dreamId: "d1",
  date: "2026-10-01",
  text: "실험",
  energy,
  ...extra,
});

describe("dreamFit", () => {
  it("is unknown until something is logged", () => {
    expect(dreamFit([], "d1")).toMatchObject({ count: 0, score: 0, label: "아직 몰라요" });
  });

  it("rewards high energy and wanting more", () => {
    const hot = dreamFit([log(5, { wantMore: "yes" }), log(4, { wantMore: "yes" })], "d1");
    expect(hot.score).toBeGreaterThanOrEqual(70);
    expect(hot.label).toBe("불꽃이 보여요");

    const cool = dreamFit([log(2, { wantMore: "no" }), log(1, { wantMore: "no" })], "d1");
    expect(cool.score).toBeLessThan(45);
    expect(cool.label).toBe("미지근해요");
  });

  it("only uses the latest five experiments for the score but keeps the full count", () => {
    const logs = [1, 1, 1, 5, 5, 5, 5, 5].map((e, i) => log(e, { date: `2026-10-0${i + 1}`, wantMore: "yes" }));
    const fit = dreamFit(logs, "d1");
    expect(fit.count).toBe(8);
    expect(fit.energy).toBe(5);
    expect(fit.trend).toHaveLength(8);
  });

  it("ignores other dreams' logs", () => {
    expect(dreamFit([log(5, { dreamId: "other" })], "d1").count).toBe(0);
  });
});

describe("countStreak", () => {
  it("counts back from today, or from yesterday if today is empty", () => {
    const today = new Date(2026, 10, 2);
    const day = (offset: number) => getLocalDateKey(new Date(2026, 10, 2 - offset));
    expect(countStreak([day(0), day(1), day(2)], today)).toBe(3);
    expect(countStreak([day(1), day(2)], today)).toBe(2);
    expect(countStreak([day(2)], today)).toBe(0);
  });
});

describe("isDoneToday", () => {
  it("matches today's log for the current experiment only", () => {
    const dream: Dream = {
      id: "d1",
      title: "그림책",
      why: "",
      status: "exploring",
      createdAt: "",
      current: { text: "스케치 3장", minutes: 20, criteria: "" },
    };
    const today = "2026-11-02";
    expect(isDoneToday(dream, [log(4, { date: today, text: "스케치 3장" })], today)).toBe(true);
    expect(isDoneToday(dream, [log(4, { date: today, text: "예전 실험" })], today)).toBe(false);
  });
});

describe("persistence", () => {
  it("migrates the v2 single-goal journey into a committed dream with history", () => {
    const state = migrateLegacy({
      turns: [{ id: "welcome", role: "assistant", content: "안녕하세요" }],
      journey: {
        plan: { goal: "책 쓰기", why: "이야기를 좋아해서", firstStep: "목차 쓰기", minutes: 20, criteria: "목차 1장" },
        current: { text: "1장 초안", minutes: 30, criteria: "500자" },
        completions: [
          { id: "c1", date: "2026-10-01", note: "목차 쓰기", feeling: "easy", reflection: "재밌었다" },
          { id: "c2", date: "2026-10-02", note: "자료 찾기", feeling: "hard" },
        ],
      },
    });
    expect(state.dreams).toHaveLength(1);
    expect(state.dreams[0]).toMatchObject({ title: "책 쓰기", status: "committed", current: { text: "1장 초안" } });
    expect(state.logs.map(l => l.energy)).toEqual([4, 2]);
    expect(state.logs.every(l => l.dreamId === state.dreams[0].id)).toBe(true);
    expect(state.turns).toHaveLength(1);
  });

  it("drops malformed entries and orphaned logs", () => {
    const state = normalizeState({
      dreams: [{ id: "d1", title: "요리", status: "weird" }, { title: "no id" }],
      logs: [log(9), log(3, { dreamId: "gone" })],
      clues: [{ id: "c", date: "2026-10-01", text: "빵 굽기" }, { text: 3 }],
    });
    expect(state.dreams).toHaveLength(1);
    expect(state.dreams[0].status).toBe("exploring");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].energy).toBe(5);
    expect(state.clues).toEqual([{ id: "c", date: "2026-10-01", text: "빵 굽기", tag: "other" }]);
  });
});

describe("formatLogs", () => {
  it("renders energy, want-more and memo for the prompt", () => {
    expect(formatLogs([{ date: "2026-10-01", text: "스케치", energy: 5, wantMore: "yes", reflection: "푹 빠짐" }])).toBe(
      '- 2026-10-01: 스케치 → 설렘 5/5, 더 해보고 싶음, 메모: "푹 빠짐"'
    );
    expect(formatLogs([])).toBe("(아직 기록 없음)");
  });
});
