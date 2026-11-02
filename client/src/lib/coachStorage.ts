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

export type Feeling = "easy" | "ok" | "hard";

export const feelingOptions: { value: Feeling; emoji: string; label: string }[] = [
  { value: "easy", emoji: "🙂", label: "쉬웠어요" },
  { value: "ok", emoji: "😌", label: "적당했어요" },
  { value: "hard", emoji: "😮‍💨", label: "어려웠어요" },
];

export type CompletionRecord = {
  id: string;
  date: string;
  /** The step text at the time it was completed. */
  note: string;
  stepNumber: number;
  feeling?: Feeling;
  reflection?: string;
};

export type JourneyStep = {
  text: string;
  minutes: number;
  criteria: string;
};

export type SavedJourney = {
  plan: GoalPlan;
  startedAt: string;
  completions: CompletionRecord[];
  /** The step the user is currently working on. */
  current: JourneyStep;
  /** 1-based index of `current` along the journey. */
  stepNumber: number;
  /** Follow-up steps planned up front that haven't been used yet. */
  upcoming: string[];
  /** Latest encouragement from the coach, shown above the current step. */
  coachNote?: string;
};

export type CoachState = {
  turns: ChatTurn[];
  journey: SavedJourney | null;
};

const STORAGE_KEY = "cheotbal-coach-v1";
const BACKUP_KIND = "cheotbal-backup";

export const initialPrompt: ChatTurn = {
  id: "welcome",
  role: "assistant",
  content: "안녕하세요. 마음 한편에 두고 있던 일부터 편하게 이야기해 주세요. 아직 잘 모르겠어도 괜찮아요.",
};

export function journeyFromPlan(plan: GoalPlan): SavedJourney {
  return {
    plan,
    startedAt: new Date().toISOString(),
    completions: [],
    current: { text: plan.firstStep, minutes: plan.minutes, criteria: plan.criteria },
    stepNumber: 1,
    upcoming: [...plan.nextSteps],
  };
}

/** Accepts v1 journeys (no `current`) and fills in the v2 fields. */
function normalizeJourney(raw: unknown): SavedJourney | null {
  if (!raw || typeof raw !== "object") return null;
  const j = raw as Partial<SavedJourney>;
  if (!j.plan || typeof j.plan.goal !== "string") return null;
  const completions = Array.isArray(j.completions)
    ? j.completions
        .filter(c => c && typeof c.date === "string")
        .map(c => ({ ...c, stepNumber: typeof c.stepNumber === "number" ? c.stepNumber : 1 }))
    : [];
  return {
    plan: { ...j.plan, nextSteps: Array.isArray(j.plan.nextSteps) ? j.plan.nextSteps : [] },
    startedAt: j.startedAt ?? new Date().toISOString(),
    completions,
    current: j.current ?? { text: j.plan.firstStep, minutes: j.plan.minutes, criteria: j.plan.criteria },
    stepNumber: j.stepNumber ?? 1,
    upcoming: Array.isArray(j.upcoming) ? j.upcoming : [...(j.plan.nextSteps ?? [])],
    coachNote: j.coachNote,
  };
}

function normalizeState(parsed: Partial<CoachState>): CoachState {
  return {
    turns: Array.isArray(parsed.turns) ? parsed.turns.filter(t => t && typeof t.content === "string") : [],
    journey: normalizeJourney(parsed.journey),
  };
}

export function readCoachState(): CoachState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { turns: [], journey: null };
    return normalizeState(JSON.parse(raw) as Partial<CoachState>);
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

export function exportBackup(state: CoachState): string {
  return JSON.stringify({ kind: BACKUP_KIND, version: 2, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function parseBackup(text: string): CoachState {
  const parsed = JSON.parse(text) as Partial<CoachState> & { kind?: string };
  if (parsed.kind !== BACKUP_KIND) throw new Error("첫걸음 백업 파일이 아니에요.");
  return normalizeState(parsed);
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

export function countActiveDays(records: CompletionRecord[]): number {
  return new Set(records.map(record => record.date)).size;
}
