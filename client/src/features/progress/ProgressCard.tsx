import { CalendarDays, Check, ChevronRight, Flame, Footprints, RotateCcw, Sparkles } from "lucide-react";
import type { CompletionRecord, SavedJourney } from "@/lib/coachStorage";

type ProgressCardProps = {
  journey: SavedJourney;
  todayDone: boolean;
  streak: number;
  onComplete: () => void;
  onUndoToday: () => void;
  onExplore: () => void;
  onReset: () => void;
};

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(year, month - 1, day));
}

export default function ProgressCard({ journey, todayDone, streak, onComplete, onUndoToday, onExplore, onReset }: ProgressCardProps) {
  const recent: CompletionRecord[] = [...journey.completions].reverse().slice(0, 3);
  return (
    <section className="journey-card" aria-labelledby="journey-title">
      <div className="journey-topline">
        <span className="eyebrow"><Footprints size={15} /> 지금 가고 있는 길</span>
        <span className="streak-pill"><Flame size={14} /> {streak > 0 ? `${streak}일째 이어가는 중` : "오늘부터 시작"}</span>
      </div>
      <h2 id="journey-title">{journey.plan.goal}</h2>
      <p className="journey-why">{journey.plan.why}</p>
      <div className={`today-action${todayDone ? " is-done" : ""}`}>
        <div className="today-icon">{todayDone ? <Check size={19} /> : <CalendarDays size={19} />}</div>
        <div className="today-copy">
          <span className="today-kicker">오늘의 작은 한 걸음 · {journey.plan.minutes}분</span>
          <strong>{journey.plan.firstStep}</strong>
          <span className="today-criteria">{todayDone ? "오늘의 기록이 남았어요. 수고했어요!" : `이렇게 하면 완료 · ${journey.plan.criteria}`}</span>
        </div>
        <button
          className={`complete-button${todayDone ? " completed" : ""}`}
          onClick={todayDone ? onUndoToday : onComplete}
          aria-label={todayDone ? "오늘 완료 기록 취소" : "오늘 행동 완료 기록"}
          title={todayDone ? "오늘 기록 되돌리기" : "완료했어요"}
        >
          {todayDone ? <Check size={19} /> : <ChevronRight size={21} />}
        </button>
      </div>
      <div className="progress-summary">
        <div className="progress-count"><strong>{journey.completions.length}</strong><span>번의 작은 실천</span></div>
        <div className="progress-dots" aria-label={`${Math.min(journey.completions.length, 7)}번 기록됨`}>
          {Array.from({ length: 7 }, (_, index) => <span key={index} className={index < journey.completions.length % 8 || (journey.completions.length >= 7 && index < 7) ? "filled" : ""} />)}
        </div>
        <span className="progress-hint">한 번이면 충분한 시작이에요</span>
      </div>
      {recent.length > 0 && (
        <div className="recent-records">
          <span className="eyebrow">최근에 해낸 일</span>
          {recent.map(record => (
            <div className="record-row" key={record.id}>
              <span className="record-check"><Check size={13} /></span>
              <span>{record.note}</span>
              <time>{formatDate(record.date)}</time>
            </div>
          ))}
        </div>
      )}
      <div className="journey-footer">
        <button className="text-button" onClick={onExplore}><Sparkles size={15} /> 다른 하고 싶은 일도 찾아보기</button>
        {todayDone && <button className="quiet-button" onClick={onUndoToday}><RotateCcw size={14} /> 오늘 기록 취소</button>}
      </div>
      <button className="reset-link" onClick={onReset}>이 여정 기록 지우기</button>
    </section>
  );
}
