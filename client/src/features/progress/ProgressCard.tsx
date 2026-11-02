import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  Flame,
  Footprints,
  Minimize2,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  countActiveDays,
  feelingOptions,
  type CompletionRecord,
  type Feeling,
  type SavedJourney,
} from "@/lib/coachStorage";
import PracticeCalendar from "./PracticeCalendar";

export type StepMode = "next" | "smaller";

type ProgressCardProps = {
  journey: SavedJourney;
  todayRecord: CompletionRecord | null;
  streak: number;
  stepPending: StepMode | null;
  stepError: string;
  onComplete: () => void;
  onReflect: (recordId: string, feeling: Feeling | undefined, reflection: string) => void;
  onUndoToday: () => void;
  onRequestStep: (mode: StepMode) => void;
  onExplore: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: () => void;
};

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(year, month - 1, day));
}

const feelingEmoji = Object.fromEntries(feelingOptions.map(option => [option.value, option.emoji])) as Record<Feeling, string>;

function ReflectionForm({ record, onSave }: { record: CompletionRecord; onSave: ProgressCardProps["onReflect"] }) {
  const [feeling, setFeeling] = useState<Feeling | undefined>(record.feeling);
  const [memo, setMemo] = useState(record.reflection ?? "");

  return (
    <form
      className="reflection-form"
      onSubmit={event => {
        event.preventDefault();
        onSave(record.id, feeling, memo.trim());
      }}
    >
      <span className="reflection-title">오늘 해보니 어땠나요?</span>
      <div className="feeling-chips" role="radiogroup" aria-label="오늘의 느낌">
        {feelingOptions.map(option => (
          <button
            type="button"
            role="radio"
            aria-checked={feeling === option.value}
            key={option.value}
            className={feeling === option.value ? "selected" : ""}
            onClick={() => setFeeling(current => (current === option.value ? undefined : option.value))}
          >
            <span aria-hidden="true">{option.emoji}</span> {option.label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="reflection-memo">한 줄 회고</label>
      <textarea
        id="reflection-memo"
        rows={2}
        maxLength={300}
        value={memo}
        onChange={event => setMemo(event.target.value)}
        placeholder="한 줄 메모 (선택) · 예: 생각보다 숨이 덜 찼다"
      />
      <div className="reflection-actions">
        <button type="submit" className="button button-primary small-button">기록 남기기</button>
        <button type="button" className="quiet-button" onClick={() => onSave(record.id, undefined, "")}>
          건너뛰기
        </button>
      </div>
    </form>
  );
}

export default function ProgressCard({
  journey,
  todayRecord,
  streak,
  stepPending,
  stepError,
  onComplete,
  onReflect,
  onUndoToday,
  onRequestStep,
  onExplore,
  onReset,
  onExport,
  onImport,
}: ProgressCardProps) {
  const todayDone = !!todayRecord;
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const recent = [...journey.completions].reverse().slice(0, 5);
  const activeDays = countActiveDays(journey.completions);

  useEffect(() => {
    if (!todayRecord) setReflectionOpen(false);
  }, [todayRecord]);

  const handleComplete = () => {
    onComplete();
    setReflectionOpen(true);
  };

  return (
    <section className="journey-card" aria-labelledby="journey-title">
      <div className="journey-topline">
        <span className="eyebrow"><Footprints size={15} /> 지금 가고 있는 길 · {journey.stepNumber}번째 걸음</span>
        <span className="streak-pill"><Flame size={14} /> {streak > 0 ? `${streak}일째 이어가는 중` : "오늘부터 시작"}</span>
      </div>
      <h2 id="journey-title">{journey.plan.goal}</h2>
      <p className="journey-why">{journey.plan.why}</p>

      {journey.coachNote && (
        <p className="coach-note"><Sparkles size={13} /> {journey.coachNote}</p>
      )}

      <div className={`today-action${todayDone ? " is-done" : ""}`}>
        <div className="today-icon">{todayDone ? <Check size={19} /> : <CalendarDays size={19} />}</div>
        <div className="today-copy">
          <span className="today-kicker">오늘의 작은 한 걸음 · {journey.current.minutes}분</span>
          <strong>{journey.current.text}</strong>
          <span className="today-criteria">
            {todayDone ? "오늘의 기록이 남았어요. 수고했어요!" : `이렇게 하면 완료 · ${journey.current.criteria}`}
          </span>
        </div>
        <button
          className={`complete-button${todayDone ? " completed" : ""}`}
          onClick={todayDone ? onUndoToday : handleComplete}
          aria-label={todayDone ? "오늘 완료 기록 취소" : "오늘 행동 완료 기록"}
          title={todayDone ? "오늘 기록 되돌리기" : "완료했어요"}
        >
          {todayDone ? <Check size={19} /> : <ChevronRight size={21} />}
        </button>
      </div>

      {todayRecord && reflectionOpen && (
        <ReflectionForm
          key={todayRecord.id}
          record={todayRecord}
          onSave={(id, feeling, memo) => {
            onReflect(id, feeling, memo);
            setReflectionOpen(false);
          }}
        />
      )}

      {!todayDone && (
        <button className="smaller-button" onClick={() => onRequestStep("smaller")} disabled={!!stepPending}>
          <Minimize2 size={13} />
          {stepPending === "smaller" ? "더 작은 걸음을 찾고 있어요…" : "오늘은 버거워요 · 더 작게 쪼개기"}
        </button>
      )}

      {todayDone && !reflectionOpen && (
        <div className="next-step-prompt">
          <div>
            <strong>다음 걸음으로 넘어갈까요?</strong>
            <span>
              {journey.upcoming.length > 0
                ? `처음 계획: ${journey.upcoming[0]}`
                : "기록과 회고를 보고 다음 걸음을 제안해 드려요."}
            </span>
          </div>
          <button className="button button-primary small-button" onClick={() => onRequestStep("next")} disabled={!!stepPending}>
            {stepPending === "next" ? "고르는 중…" : "다음 걸음 받기"}
            {stepPending !== "next" && <ArrowRight size={15} />}
          </button>
        </div>
      )}
      {todayDone && !reflectionOpen && (
        <p className="repeat-hint">내일도 같은 걸음을 반복해도 충분해요. 습관은 반복에서 자라니까요.</p>
      )}

      {stepError && <div className="inline-error" role="alert">{stepError}</div>}

      <div className="progress-summary">
        <div className="progress-count"><strong>{journey.completions.length}</strong><span>번의 작은 실천</span></div>
        <div className="progress-count"><strong>{activeDays}</strong><span>일 동안</span></div>
        <div className="progress-count"><strong>{journey.stepNumber}</strong><span>번째 걸음</span></div>
      </div>

      <PracticeCalendar records={journey.completions} />

      {recent.length > 0 && (
        <div className="recent-records">
          <span className="eyebrow">최근에 해낸 일</span>
          {recent.map(record => (
            <div className="record-row" key={record.id}>
              <span className="record-check">{record.feeling ? feelingEmoji[record.feeling] : <Check size={13} />}</span>
              <span className="record-text">
                {record.note}
                {record.reflection && <small>“{record.reflection}”</small>}
              </span>
              <time>{formatDate(record.date)}</time>
            </div>
          ))}
        </div>
      )}

      <div className="journey-footer">
        <button className="text-button" onClick={onExplore}><Sparkles size={15} /> 다른 하고 싶은 일도 찾아보기</button>
        {todayDone && <button className="quiet-button" onClick={onUndoToday}><RotateCcw size={14} /> 오늘 기록 취소</button>}
      </div>
      <div className="journey-tools">
        <button className="quiet-button" onClick={onExport}><Download size={13} /> 기록 백업</button>
        <button className="quiet-button" onClick={onImport}><Upload size={13} /> 백업 불러오기</button>
        <button className="reset-link" onClick={onReset}>이 여정 기록 지우기</button>
      </div>
    </section>
  );
}
