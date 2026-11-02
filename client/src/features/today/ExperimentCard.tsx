import { useState } from "react";
import { ArrowRight, Check, FlaskConical, Minimize2, Shuffle, Sparkles, Star } from "lucide-react";
import {
  dreamFit,
  energyScale,
  getLocalDateKey,
  isDoneToday,
  statusLabels,
  wantMoreOptions,
  type Dream,
  type WantMore,
} from "@/lib/dreamStore";
import { useDream } from "@/features/app/DreamContext";
import FitMeter from "@/features/dreams/FitMeter";

function LogForm({ onSave, onCancel }: { onSave: (e: { energy: number; wantMore?: WantMore; reflection?: string }) => void; onCancel: () => void }) {
  const [energy, setEnergy] = useState<number | null>(null);
  const [wantMore, setWantMore] = useState<WantMore | undefined>();
  const [memo, setMemo] = useState("");

  return (
    <form
      className="reflection-form"
      onSubmit={event => {
        event.preventDefault();
        if (energy) onSave({ energy, wantMore, reflection: memo });
      }}
    >
      <span className="reflection-title">해 보니 마음이 어땠나요?</span>
      <div className="energy-scale" role="radiogroup" aria-label="설렘 정도">
        {energyScale.map(option => (
          <button
            type="button"
            role="radio"
            aria-checked={energy === option.value}
            key={option.value}
            className={energy === option.value ? "selected" : ""}
            onClick={() => setEnergy(option.value)}
          >
            <span aria-hidden="true">{option.emoji}</span>
            <small>{option.label}</small>
          </button>
        ))}
      </div>
      <div className="feeling-chips" role="radiogroup" aria-label="또 해보고 싶은지">
        {wantMoreOptions.map(option => (
          <button
            type="button"
            role="radio"
            aria-checked={wantMore === option.value}
            key={option.value}
            className={wantMore === option.value ? "selected" : ""}
            onClick={() => setWantMore(cur => (cur === option.value ? undefined : option.value))}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="log-memo">한 줄 메모</label>
      <textarea
        id="log-memo"
        rows={2}
        maxLength={300}
        value={memo}
        onChange={event => setMemo(event.target.value)}
        placeholder="어떤 순간이 좋았나요, 혹은 별로였나요? (선택)"
      />
      <div className="reflection-actions">
        <button type="submit" className="button button-primary small-button" disabled={!energy}>기록하기</button>
        <button type="button" className="quiet-button" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
}

export default function ExperimentCard({ dream }: { dream: Dream }) {
  const { state, logExperiment, requestExperiment, experimentPending, experimentErrors, setTab } = useDream();
  const [logging, setLogging] = useState(false);
  const pending = experimentPending[dream.id];
  const error = experimentErrors[dream.id];
  const fit = dreamFit(state.logs, dream.id);
  const done = isDoneToday(dream, state.logs);
  const todayLog = done ? [...state.logs].reverse().find(l => l.dreamId === dream.id && l.date === getLocalDateKey()) : undefined;
  const committed = dream.status === "committed";

  return (
    <article className={`experiment-card${committed ? " committed" : ""}`}>
      <header className="experiment-head">
        <span className={`status-chip ${dream.status}`}>{committed ? <Star size={12} /> : <FlaskConical size={12} />} {statusLabels[dream.status]}</span>
        <button className="dream-link" onClick={() => setTab("dreams")}>
          <FitMeter fit={fit} compact />
        </button>
      </header>
      <h3>{dream.title}</h3>
      {dream.coachNote && <p className="coach-note"><Sparkles size={13} /> {dream.coachNote}</p>}

      {!dream.current ? (
        <div className="today-action empty">
          <div className="today-copy">
            <strong>{pending ? "첫 실험을 고르고 있어요…" : "아직 실험이 없어요"}</strong>
            <span className="today-criteria">이 일이 나에게 맞는지 확인해 볼 작은 실험을 받아 보세요.</span>
          </div>
          <button className="button button-primary small-button" disabled={!!pending} onClick={() => void requestExperiment(dream.id, "first")}>
            {pending ? "…" : "첫 실험 받기"}
          </button>
        </div>
      ) : (
        <div className={`today-action${done ? " is-done" : ""}`}>
          <div className="today-icon">{done ? <Check size={19} /> : <FlaskConical size={18} />}</div>
          <div className="today-copy">
            <span className="today-kicker">{committed ? "다음 걸음" : "이번 실험"} · 약 {dream.current.minutes}분</span>
            <strong>{dream.current.text}</strong>
            <span className="today-criteria">
              {done && todayLog
                ? `오늘 기록 완료 · ${energyScale[todayLog.energy - 1].emoji} ${energyScale[todayLog.energy - 1].label}`
                : `완료 기준 · ${dream.current.criteria}`}
            </span>
          </div>
          {!done && !logging && (
            <button className="complete-button" onClick={() => setLogging(true)} aria-label="해봤어요, 기록하기" title="해봤어요">
              <Check size={19} />
            </button>
          )}
        </div>
      )}

      {logging && dream.current && (
        <LogForm
          onCancel={() => setLogging(false)}
          onSave={entry => {
            logExperiment(dream.id, entry);
            setLogging(false);
          }}
        />
      )}

      {dream.current && !logging && (
        done ? (
          <div className="next-step-prompt">
            <div>
              <strong>{committed ? "다음 걸음으로 넘어갈까요?" : "다음 실험을 받아볼까요?"}</strong>
              <span>기록과 설렘 점수를 보고 맞춰서 제안해 드려요.</span>
            </div>
            <button className="button button-primary small-button" onClick={() => void requestExperiment(dream.id, "next")} disabled={!!pending}>
              {pending === "next" ? "고르는 중…" : "다음 실험"}
              {pending !== "next" && <ArrowRight size={15} />}
            </button>
          </div>
        ) : (
          <div className="experiment-tools">
            <button className="smaller-button" onClick={() => void requestExperiment(dream.id, "smaller")} disabled={!!pending}>
              <Minimize2 size={13} /> {pending === "smaller" ? "쪼개는 중…" : "더 작게"}
            </button>
            <button className="smaller-button" onClick={() => void requestExperiment(dream.id, "different")} disabled={!!pending}>
              <Shuffle size={13} /> {pending === "different" ? "바꾸는 중…" : "다른 방식으로"}
            </button>
          </div>
        )
      )}
      {error && <div className="inline-error" role="alert">{error}</div>}
    </article>
  );
}
