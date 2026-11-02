// Pure data model for 첫걸음's "find what you want to do" loop:
//   explore (chat + clues) → dream hypotheses → small experiments → energy log → insight → commit.
// Shared so the server tests can exercise it; persistence lives in client/src/lib/dreamStore.ts.

export type ChatTurn = { id: string; role: "assistant" | "user"; content: string };

export type ClueTag = "flow" | "envy" | "curious" | "praise" | "bother" | "other";
export type Clue = { id: string; date: string; text: string; tag: ClueTag };

export type Profile = {
  summary: string;
  themes: string[];
  values: string[];
  strengths: string[];
  updatedAt: string;
};

export type DreamStatus = "exploring" | "committed" | "paused" | "dropped";
export type Experiment = { text: string; minutes: number; criteria: string };

export type Dream = {
  id: string;
  title: string;
  why: string;
  status: DreamStatus;
  createdAt: string;
  /** The experiment the user is currently trying for this dream. */
  current: Experiment | null;
  coachNote?: string;
  /** Why the user paused or let go of it. */
  note?: string;
};

export type WantMore = "yes" | "maybe" | "no";
export type LogEntry = {
  id: string;
  dreamId: string;
  date: string;
  text: string;
  /** 1–5: how alive/excited the user felt while doing it. */
  energy: number;
  wantMore?: WantMore;
  reflection?: string;
};

export type Insight = { headline: string; patterns: string[]; focus: string; suggestion: string; createdAt: string };

export type DreamState = {
  version: 3;
  turns: ChatTurn[];
  clues: Clue[];
  profile: Profile | null;
  dreams: Dream[];
  logs: LogEntry[];
  insight: Insight | null;
};

export const emptyState = (): DreamState => ({
  version: 3,
  turns: [],
  clues: [],
  profile: null,
  dreams: [],
  logs: [],
  insight: null,
});

export const clueTags: { value: ClueTag; emoji: string; label: string; prompt: string }[] = [
  { value: "flow", emoji: "⏳", label: "시간 가는 줄 몰랐어요", prompt: "무엇을 할 때 시간이 훌쩍 지나갔나요?" },
  { value: "curious", emoji: "🔍", label: "궁금해서 찾아봤어요", prompt: "요즘 자꾸 찾아보게 되는 건 뭔가요?" },
  { value: "envy", emoji: "👀", label: "부러웠어요", prompt: "누가, 무엇이 부러웠나요?" },
  { value: "praise", emoji: "🙌", label: "고맙다는 말을 들었어요", prompt: "어떤 일로 도움이 됐나요?" },
  { value: "bother", emoji: "🔧", label: "바꾸고 싶었어요", prompt: "어떤 게 답답하거나 바꾸고 싶었나요?" },
  { value: "other", emoji: "✨", label: "그냥 좋았어요", prompt: "마음이 움직인 순간을 적어 주세요" },
];

export const energyScale: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😶", label: "지루했어요" },
  { value: 2, emoji: "😐", label: "그저 그랬어요" },
  { value: 3, emoji: "🙂", label: "괜찮았어요" },
  { value: 4, emoji: "😊", label: "재밌었어요" },
  { value: 5, emoji: "🤩", label: "푹 빠졌어요" },
];

export const wantMoreOptions: { value: WantMore; label: string }[] = [
  { value: "yes", label: "또 해보고 싶어요" },
  { value: "maybe", label: "잘 모르겠어요" },
  { value: "no", label: "이건 아닌 것 같아요" },
];

export const statusLabels: Record<DreamStatus, string> = {
  exploring: "실험 중",
  committed: "나의 꿈",
  paused: "잠시 쉬는 중",
  dropped: "내려놓음",
};

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------- tracking

export type DreamFit = {
  /** Number of logged experiments. */
  count: number;
  /** Average energy of the latest five experiments, 1–5 (0 when untested). */
  energy: number;
  /** 0–100 score combining energy and "want more" answers. */
  score: number;
  /** Energies oldest → newest (latest eight) for the sparkline. */
  trend: number[];
  label: "아직 몰라요" | "미지근해요" | "따뜻해요" | "불꽃이 보여요";
};

const wantMoreWeight: Record<WantMore, number> = { yes: 1, maybe: 0.5, no: 0 };

export function dreamFit(logs: LogEntry[], dreamId: string): DreamFit {
  const own = logs.filter(l => l.dreamId === dreamId).sort((a, b) => a.date.localeCompare(b.date));
  if (own.length === 0) return { count: 0, energy: 0, score: 0, trend: [], label: "아직 몰라요" };
  const recent = own.slice(-5);
  const energy = recent.reduce((sum, l) => sum + l.energy, 0) / recent.length;
  const answered = recent.filter(l => l.wantMore);
  const want = answered.length
    ? answered.reduce((sum, l) => sum + wantMoreWeight[l.wantMore!], 0) / answered.length
    : (energy - 1) / 4;
  const score = Math.round(((energy - 1) / 4) * 70 + want * 30);
  const label = score >= 70 ? "불꽃이 보여요" : score >= 45 ? "따뜻해요" : "미지근해요";
  return { count: own.length, energy: Math.round(energy * 10) / 10, score, trend: own.slice(-8).map(l => l.energy), label };
}

/** Days with any logged experiment or clue. */
export function activityDates(state: Pick<DreamState, "logs" | "clues">): string[] {
  return [...state.logs.map(l => l.date), ...state.clues.map(c => c.date)];
}

export function countStreak(dates: string[], today = new Date()): number {
  const days = new Set(dates);
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(getLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function isDoneToday(dream: Dream, logs: LogEntry[], today = getLocalDateKey()): boolean {
  return !!dream.current && logs.some(l => l.dreamId === dream.id && l.date === today && l.text === dream.current!.text);
}

export const activeDreams = (dreams: Dream[]) =>
  dreams
    .filter(d => d.status === "exploring" || d.status === "committed")
    .sort((a, b) => Number(b.status === "committed") - Number(a.status === "committed"));

// ---------------------------------------------------------------- persistence helpers

const isString = (v: unknown): v is string => typeof v === "string";
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isString) : []);

function normalizeExperiment(raw: unknown): Experiment | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<Experiment>;
  if (!isString(e.text) || !e.text.trim()) return null;
  return { text: e.text, minutes: typeof e.minutes === "number" ? e.minutes : 15, criteria: isString(e.criteria) ? e.criteria : "" };
}

/** Validates a v3 state object, dropping anything malformed. */
export function normalizeState(raw: unknown): DreamState {
  if (!raw || typeof raw !== "object") return emptyState();
  const s = raw as Partial<DreamState>;
  const dreams: Dream[] = (Array.isArray(s.dreams) ? s.dreams : [])
    .filter(d => d && isString(d.id) && isString(d.title))
    .map(d => ({
      id: d.id,
      title: d.title,
      why: isString(d.why) ? d.why : "",
      status: (["exploring", "committed", "paused", "dropped"] as const).includes(d.status) ? d.status : "exploring",
      createdAt: isString(d.createdAt) ? d.createdAt : new Date().toISOString(),
      current: normalizeExperiment(d.current),
      coachNote: isString(d.coachNote) ? d.coachNote : undefined,
      note: isString(d.note) ? d.note : undefined,
    }));
  const dreamIds = new Set(dreams.map(d => d.id));
  return {
    version: 3,
    turns: (Array.isArray(s.turns) ? s.turns : []).filter(t => t && isString(t.content) && (t.role === "user" || t.role === "assistant")),
    clues: (Array.isArray(s.clues) ? s.clues : []).filter(c => c && isString(c.text) && isString(c.date)).map(c => ({ ...c, tag: c.tag ?? "other" })),
    profile:
      s.profile && isString(s.profile.summary)
        ? { ...s.profile, themes: strings(s.profile.themes), values: strings(s.profile.values), strengths: strings(s.profile.strengths) }
        : null,
    dreams,
    logs: (Array.isArray(s.logs) ? s.logs : [])
      .filter(l => l && dreamIds.has(l.dreamId) && isString(l.date) && typeof l.energy === "number")
      .map(l => ({ ...l, energy: Math.max(1, Math.min(5, Math.round(l.energy))) })),
    insight: s.insight && isString(s.insight.headline) ? { ...s.insight, patterns: strings(s.insight.patterns) } : null,
  };
}

type LegacyJourney = {
  plan?: { goal?: string; why?: string; firstStep?: string; minutes?: number; criteria?: string };
  startedAt?: string;
  current?: Experiment;
  coachNote?: string;
  completions?: { id?: string; date?: string; note?: string; feeling?: "easy" | "ok" | "hard"; reflection?: string }[];
};

const legacyEnergy = { easy: 4, ok: 3, hard: 2 } as const;

/** Converts the v1/v2 single-goal journey into a committed dream with its history. */
export function migrateLegacy(raw: unknown): DreamState {
  const state = emptyState();
  if (!raw || typeof raw !== "object") return state;
  const legacy = raw as { turns?: unknown; journey?: LegacyJourney | null };
  state.turns = normalizeState({ turns: legacy.turns }).turns;
  const j = legacy.journey;
  if (j?.plan && isString(j.plan.goal) && j.plan.goal.trim()) {
    const id = makeId();
    state.dreams.push({
      id,
      title: j.plan.goal,
      why: j.plan.why ?? "",
      status: "committed",
      createdAt: j.startedAt ?? new Date().toISOString(),
      current:
        normalizeExperiment(j.current) ??
        normalizeExperiment({ text: j.plan.firstStep, minutes: j.plan.minutes, criteria: j.plan.criteria }),
      coachNote: j.coachNote,
    });
    for (const c of j.completions ?? []) {
      if (!isString(c.date)) continue;
      state.logs.push({
        id: c.id ?? makeId(),
        dreamId: id,
        date: c.date,
        text: c.note ?? "",
        energy: c.feeling ? legacyEnergy[c.feeling] : 3,
        reflection: c.reflection,
      });
    }
  }
  return state;
}
