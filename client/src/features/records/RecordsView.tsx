import { useMemo, useRef, type ChangeEvent } from "react";
import { BookOpen, Download, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  activityDates,
  clueTags,
  countStreak,
  downloadText,
  energyScale,
  exportBackup,
  getLocalDateKey,
  parseBackup,
} from "@/lib/dreamStore";
import { useDream } from "@/features/app/DreamContext";
import PracticeCalendar from "@/features/progress/PracticeCalendar";

type Entry =
  | { kind: "log"; id: string; date: string; text: string; sub: string; emoji: string; reflection?: string }
  | { kind: "clue"; id: string; date: string; text: string; sub: string; emoji: string };

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(y, m - 1, d));
}

export default function RecordsView() {
  const { state, removeClue, removeLog, replaceState, resetAll } = useDream();
  const fileRef = useRef<HTMLInputElement>(null);
  const dates = useMemo(() => activityDates(state), [state]);
  const streak = countStreak(dates);
  const titles = useMemo(() => Object.fromEntries(state.dreams.map(d => [d.id, d.title])), [state.dreams]);

  const entries = useMemo<Entry[]>(() => {
    const logs: Entry[] = state.logs.map(l => ({
      kind: "log",
      id: l.id,
      date: l.date,
      text: l.text,
      sub: `${titles[l.dreamId] ?? "실험"} · ${energyScale[l.energy - 1].label}`,
      emoji: energyScale[l.energy - 1].emoji,
      reflection: l.reflection,
    }));
    const clues: Entry[] = state.clues.map(c => {
      const tag = clueTags.find(t => t.value === c.tag) ?? clueTags.at(-1)!;
      return { kind: "clue", id: c.id, date: c.date, text: c.text, sub: `단서 · ${tag.label}`, emoji: tag.emoji };
    });
    // Newest first; arrays are in insertion order so reverse before a stable date sort.
    return [...logs, ...clues].reverse().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  }, [state.logs, state.clues, titles]);

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const restored = parseBackup(await file.text());
      if ((state.dreams.length || state.turns.length > 1) && !window.confirm("지금 기록을 백업 파일 내용으로 바꿀까요?")) return;
      replaceState(restored);
      toast.success("백업을 불러왔어요");
    } catch (error) {
      toast.error(error instanceof Error && error.message.includes("백업") ? error.message : "백업 파일을 읽지 못했어요.");
    }
  };

  return (
    <main className="view records-view">
      <div className="view-intro left">
        <span className="view-icon"><BookOpen size={19} /></span>
        <h1>탐색 기록</h1>
        <p>실험과 단서가 쌓인 만큼, 나에 대한 지도가 선명해져요.</p>
      </div>

      <section className="stats-card">
        <div className="progress-summary four">
          <div className="progress-count"><strong>{state.logs.length}</strong><span>번의 실험</span></div>
          <div className="progress-count"><strong>{state.clues.length}</strong><span>개의 단서</span></div>
          <div className="progress-count"><strong>{new Set(dates).size}</strong><span>일 움직임</span></div>
          <div className="progress-count"><strong>{streak}</strong><span>일 연속</span></div>
        </div>
        <PracticeCalendar dates={dates} />
      </section>

      <section className="timeline" aria-label="최근 기록">
        <h2>최근 기록</h2>
        {entries.length === 0 && <p className="empty-line">아직 기록이 없어요. 오늘 탭에서 실험을 해 보거나 단서를 남겨 보세요.</p>}
        {entries.map(e => (
          <div className={`record-row ${e.kind}`} key={`${e.kind}-${e.id}`}>
            <span className="record-check">{e.emoji}</span>
            <span className="record-text">
              {e.text}
              <small>{e.sub}</small>
              {e.kind === "log" && e.reflection && <small className="quote">“{e.reflection}”</small>}
            </span>
            <time>{e.date === getLocalDateKey() ? "오늘" : formatDate(e.date)}</time>
            <button
              className="icon-button"
              aria-label="이 기록 지우기"
              onClick={() => window.confirm("이 기록을 지울까요?") && (e.kind === "log" ? removeLog(e.id) : removeClue(e.id))}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </section>

      <section className="data-tools">
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => void importData(e)} />
        <button className="quiet-button" onClick={() => { downloadText(`cheotbal-backup-${getLocalDateKey()}.json`, exportBackup(state)); toast.success("기록을 파일로 저장했어요"); }}>
          <Download size={13} /> 기록 백업
        </button>
        <button className="quiet-button" onClick={() => fileRef.current?.click()}><Upload size={13} /> 백업 불러오기</button>
        <button className="reset-link" onClick={() => window.confirm("대화, 단서, 후보, 실험 기록을 모두 지울까요? 되돌릴 수 없어요.") && resetAll()}>
          모든 기록 지우기
        </button>
      </section>
    </main>
  );
}
