export type ChatTurn = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export type GoalPlan = {
  goal: string;
  why: string;
  firstStep: string;
  minutes: number;
  criteria: string;
  nextSteps: string[];
};

export type CompletionRecord = {
  id: string;
  date: string;
  note: string;
};

export type SavedJourney = {
  plan: GoalPlan;
  startedAt: string;
  completions: CompletionRecord[];
};

export type CoachState = {
  turns: ChatTurn[];
  journey: SavedJourney | null;
};

const STORAGE_KEY = "cheotbal-coach-v1";

export const initialPrompt: ChatTurn = {
  id: "welcome",
  role: "assistant",
  content: "안녕하세요. 마음 한편에 두고 있던 일부터 편하게 이야기해 주세요. 아직 잘 모르겠어도 괜찮아요.",
};

export function readCoachState(): CoachState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { turns: [], journey: null };
    const parsed = JSON.parse(raw) as Partial<CoachState>;
    return {
      turns: Array.isArray(parsed.turns) ? parsed.turns : [],
      journey: parsed.journey ?? null,
    };
  } catch {
    return { turns: [], journey: null };
  }
}

export function writeCoachState(state: CoachState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or storage quota can disable persistence; the current
    // session still works in React state.
  }
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function countStreak(records: CompletionRecord[]): number {
  const completedDays = new Set(records.map(record => record.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!completedDays.has(getLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (completedDays.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
