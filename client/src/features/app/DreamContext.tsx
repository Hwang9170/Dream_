import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  getLocalDateKey,
  makeId,
  readState,
  writeState,
  type ChatTurn,
  type ClueTag,
  type Dream,
  type DreamState,
  type LogEntry,
  type WantMore,
} from "@/lib/dreamStore";
import { demoState } from "./demoState";

export type ExperimentMode = "first" | "next" | "smaller" | "different";
export type Tab = "today" | "discover" | "dreams" | "records";

export type Candidate = {
  title: string;
  why: string;
  experiment: { text: string; minutes: number; criteria: string };
};
export type DiscoveryResult = {
  summary: string;
  themes: string[];
  values: string[];
  strengths: string[];
  dreams: Candidate[];
};

type DreamContextValue = {
  state: DreamState;
  storageOk: boolean;
  demo: boolean;
  exitDemo: () => void;
  tab: Tab;
  setTab: (tab: Tab) => void;
  setTurns: (turns: ChatTurn[] | ((turns: ChatTurn[]) => ChatTurn[])) => void;
  addClue: (text: string, tag: ClueTag) => void;
  removeClue: (id: string) => void;
  adoptDiscovery: (result: DiscoveryResult, picked: number[]) => void;
  addDream: (title: string, why?: string) => void;
  updateDream: (id: string, patch: Partial<Dream>) => void;
  removeDream: (id: string) => void;
  logExperiment: (dreamId: string, entry: { energy: number; wantMore?: WantMore; reflection?: string }) => void;
  removeLog: (id: string) => void;
  experimentPending: Record<string, ExperimentMode | undefined>;
  experimentErrors: Record<string, string | undefined>;
  requestExperiment: (dreamId: string, mode: ExperimentMode) => Promise<void>;
  insightPending: boolean;
  insightError: string;
  requestInsight: () => Promise<void>;
  replaceState: (state: DreamState) => void;
  resetAll: () => void;
};

const DreamContext = createContext<DreamContextValue | null>(null);

export function useDream(): DreamContextValue {
  const value = useContext(DreamContext);
  if (!value) throw new Error("useDream must be used inside DreamProvider");
  return value;
}

/** The structured logs the server expects for one dream (latest 12). */
export function logsFor(state: DreamState, dreamId: string) {
  return state.logs
    .filter(l => l.dreamId === dreamId)
    .slice(-12)
    .map(({ date, text, energy, wantMore, reflection }) => ({ date, text: text.slice(0, 240), energy, wantMore, reflection }));
}

export function DreamProvider({ children, initialTab, demo: startInDemo = false }: { children: ReactNode; initialTab?: Tab; demo?: boolean }) {
  const [demo, setDemo] = useState(startInDemo);
  const [state, setState] = useState<DreamState>(() => (startInDemo ? demoState() : readState()));
  const [storageOk, setStorageOk] = useState(true);
  const [tab, setTab] = useState<Tab>(() => initialTab ?? (state.dreams.length === 0 ? "discover" : "today"));
  const [experimentPending, setExperimentPending] = useState<Record<string, ExperimentMode | undefined>>({});
  const [experimentErrors, setExperimentErrors] = useState<Record<string, string | undefined>>({});
  const [insightError, setInsightError] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;

  const experimentMutation = trpc.coach.experiment.useMutation();
  const insightMutation = trpc.coach.insight.useMutation();

  useEffect(() => {
    // Demo data is never written over the user's real records.
    if (!demo) setStorageOk(writeState(state));
  }, [state, demo]);

  const patch = useCallback((fn: (s: DreamState) => DreamState) => setState(fn), []);

  const updateDream = useCallback(
    (id: string, changes: Partial<Dream>) =>
      patch(s => ({ ...s, dreams: s.dreams.map(d => (d.id === id ? { ...d, ...changes } : d)) })),
    [patch]
  );

  const requestExperiment = useCallback(
    async (dreamId: string, mode: ExperimentMode) => {
      const s = stateRef.current;
      const dream = s.dreams.find(d => d.id === dreamId);
      if (!dream) return;
      setExperimentPending(p => ({ ...p, [dreamId]: mode }));
      setExperimentErrors(e => ({ ...e, [dreamId]: undefined }));
      try {
        const result = await experimentMutation.mutateAsync({
          mode: dream.current ? mode : "first",
          dream: {
            title: dream.title.slice(0, 80),
            why: dream.why.slice(0, 280),
            status: dream.status === "committed" ? "committed" : "exploring",
          },
          current: dream.current ?? undefined,
          logs: logsFor(s, dreamId),
          profile: s.profile?.summary,
        });
        if (!result.safe) {
          setExperimentErrors(e => ({ ...e, [dreamId]: result.message }));
          return;
        }
        updateDream(dreamId, {
          current: { text: result.text, minutes: result.minutes, criteria: result.criteria },
          coachNote: result.coachNote,
        });
        toast.success(
          { first: "첫 실험이 준비됐어요", next: "다음 실험이 준비됐어요", smaller: "더 가볍게 바꿨어요", different: "다른 방식으로 바꿨어요" }[mode]
        );
      } catch (error) {
        setExperimentErrors(e => ({
          ...e,
          [dreamId]: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        }));
      } finally {
        setExperimentPending(p => ({ ...p, [dreamId]: undefined }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateDream]
  );

  const requestInsight = useCallback(async () => {
    const s = stateRef.current;
    setInsightError("");
    const dreams = s.dreams
      .filter(d => s.logs.some(l => l.dreamId === d.id))
      .slice(0, 8)
      .map(d => ({ title: d.title.slice(0, 80), status: d.status, note: d.note?.slice(0, 200), logs: logsFor(s, d.id) }));
    if (dreams.length === 0) {
      setInsightError("실험을 하나 이상 기록하면 분석할 수 있어요.");
      return;
    }
    try {
      const result = await insightMutation.mutateAsync({
        profile: s.profile?.summary,
        dreams,
        clues: s.clues.slice(-20).map(c => c.text.slice(0, 200)),
      });
      patch(cur => ({ ...cur, insight: { ...result, createdAt: new Date().toISOString() } }));
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patch]);

  const value = useMemo<DreamContextValue>(
    () => ({
      state,
      storageOk,
      demo,
      exitDemo: () => {
        setDemo(false);
        setState(readState());
        setTab("today");
      },
      tab,
      setTab: next => {
        setTab(next);
        window.scrollTo({ top: 0 });
      },
      setTurns: turns => patch(s => ({ ...s, turns: typeof turns === "function" ? turns(s.turns) : turns })),
      addClue: (text, tag) =>
        patch(s => ({ ...s, clues: [...s.clues, { id: makeId(), date: getLocalDateKey(), text: text.trim().slice(0, 200), tag }] })),
      removeClue: id => patch(s => ({ ...s, clues: s.clues.filter(c => c.id !== id) })),
      adoptDiscovery: (result, picked) =>
        patch(s => ({
          ...s,
          profile: {
            summary: result.summary,
            themes: result.themes,
            values: result.values,
            strengths: result.strengths,
            updatedAt: new Date().toISOString(),
          },
          dreams: [
            ...s.dreams,
            ...picked
              .map(i => result.dreams[i])
              .filter(Boolean)
              .map(c => ({
                id: makeId(),
                title: c.title,
                why: c.why,
                status: "exploring" as const,
                createdAt: new Date().toISOString(),
                current: c.experiment,
              })),
          ],
        })),
      addDream: (title, why = "") => {
        const id = makeId();
        patch(s => ({
          ...s,
          dreams: [
            ...s.dreams,
            { id, title: title.trim().slice(0, 80), why, status: "exploring", createdAt: new Date().toISOString(), current: null },
          ],
        }));
        // Wait for the state commit so requestExperiment can see the new dream.
        setTimeout(() => void requestExperiment(id, "first"), 0);
      },
      updateDream,
      removeDream: id =>
        patch(s => ({ ...s, dreams: s.dreams.filter(d => d.id !== id), logs: s.logs.filter(l => l.dreamId !== id) })),
      logExperiment: (dreamId, entry) =>
        patch(s => {
          const dream = s.dreams.find(d => d.id === dreamId);
          if (!dream?.current) return s;
          const log: LogEntry = {
            id: makeId(),
            dreamId,
            date: getLocalDateKey(),
            text: dream.current.text,
            energy: entry.energy,
            wantMore: entry.wantMore,
            reflection: entry.reflection?.trim() || undefined,
          };
          return { ...s, logs: [...s.logs, log] };
        }),
      removeLog: id => patch(s => ({ ...s, logs: s.logs.filter(l => l.id !== id) })),
      experimentPending,
      experimentErrors,
      requestExperiment,
      insightPending: insightMutation.isPending,
      insightError,
      requestInsight,
      replaceState: next => setState(next),
      resetAll: () => setState({ version: 3, turns: [], clues: [], profile: null, dreams: [], logs: [], insight: null }),
    }),
    [state, storageOk, demo, tab, patch, updateDream, experimentPending, experimentErrors, requestExperiment, insightMutation.isPending, insightError, requestInsight]
  );

  return <DreamContext.Provider value={value}>{children}</DreamContext.Provider>;
}
