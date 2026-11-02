import { useState } from "react";
import { Compass, Lightbulb, Map as MapIcon, Pause, Play, RefreshCw, Star, Trash2, Undo2, X } from "lucide-react";
import { dreamFit, energyScale, statusLabels, type Dream, type DreamStatus } from "@/lib/dreamStore";
import { useDream } from "@/features/app/DreamContext";
import { AddDreamForm } from "@/features/today/TodayView";
import FitMeter from "./FitMeter";

const order: Record<DreamStatus, number> = { committed: 0, exploring: 1, paused: 2, dropped: 3 };

function DreamRow({ dream, highlighted }: { dream: Dream; highlighted: boolean }) {
  const { state, updateDream, removeDream, setTab } = useDream();
  const [open, setOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [reason, setReason] = useState("");
  const fit = dreamFit(state.logs, dream.id);
  const logs = state.logs.filter(l => l.dreamId === dream.id).slice(-5).reverse();
  const inactive = dream.status === "paused" || dream.status === "dropped";

  return (
    <article className={`dream-row ${dream.status}${highlighted ? " highlighted" : ""}`}>
      <button className="dream-row-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className={`status-chip ${dream.status}`}>{statusLabels[dream.status]}</span>
        <strong>{dream.title}</strong>
        {highlighted && <span className="focus-tag"><Lightbulb size={11} /> 요즘 가장 살아나는 일</span>}
      </button>
      <FitMeter fit={fit} />

      {open && (
        <div className="dream-detail">
          {dream.why && <p className="dream-why">{dream.why}</p>}
          {dream.note && <p className="dream-note">메모 · {dream.note}</p>}
          {logs.length > 0 && (
            <ul className="mini-log">
              {logs.map(l => (
                <li key={l.id}>
                  <span aria-hidden="true">{energyScale[l.energy - 1].emoji}</span>
                  <span>{l.text}{l.reflection && <small>“{l.reflection}”</small>}</span>
                  <time>{l.date.slice(5).replace("-", ".")}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {dropping ? (
        <form
          className="drop-form"
          onSubmit={e => {
            e.preventDefault();
            updateDream(dream.id, { status: "dropped", note: reason.trim() || undefined });
            setDropping(false);
          }}
        >
          <input value={reason} maxLength={200} onChange={e => setReason(e.target.value)} placeholder="왜 내려놓나요? (선택) · 이것도 소중한 단서예요" autoFocus />
          <button className="button small-button ghost" type="submit">내려놓기</button>
          <button className="icon-button" type="button" onClick={() => setDropping(false)} aria-label="취소"><X size={15} /></button>
        </form>
      ) : (
        <div className="dream-actions">
          {dream.status === "exploring" && (
            <button className="text-button" onClick={() => updateDream(dream.id, { status: "committed" })}><Star size={14} /> 나의 꿈으로 정하기</button>
          )}
          {dream.status === "committed" && (
            <button className="quiet-button" onClick={() => updateDream(dream.id, { status: "exploring" })}><Undo2 size={14} /> 다시 탐색으로</button>
          )}
          {!inactive && (
            <button className="quiet-button" onClick={() => updateDream(dream.id, { status: "paused" })}><Pause size={14} /> 잠시 쉬기</button>
          )}
          {inactive && (
            <button className="text-button" onClick={() => { updateDream(dream.id, { status: "exploring", note: undefined }); setTab("today"); }}>
              <Play size={14} /> 다시 실험하기
            </button>
          )}
          {dream.status !== "dropped" && <button className="quiet-button" onClick={() => setDropping(true)}><X size={14} /> 내려놓기</button>}
          {dream.status === "dropped" && (
            <button
              className="reset-link"
              onClick={() => window.confirm(`'${dream.title}'와 실험 기록을 완전히 지울까요?`) && removeDream(dream.id)}
            >
              <Trash2 size={12} /> 삭제
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function DreamsView() {
  const { state, setTab, requestInsight, insightPending, insightError } = useDream();
  const [adding, setAdding] = useState(false);
  const dreams = [...state.dreams].sort((a, b) => order[a.status] - order[b.status] || dreamFit(state.logs, b.id).score - dreamFit(state.logs, a.id).score);
  const { profile, insight } = state;
  const logCount = state.logs.length;

  return (
    <main className="view dreams-view">
      <div className="view-intro left">
        <span className="view-icon"><MapIcon size={19} /></span>
        <h1>꿈 지도</h1>
        <p>실험해 본 일들이 내 마음을 얼마나 움직였는지 모아 봐요.</p>
      </div>

      {profile && (
        <section className="profile-card">
          <span className="eyebrow accent">나는 이런 사람이에요</span>
          <p>{profile.summary}</p>
          <div className="trait-groups">
            {([["관심", profile.themes], ["가치", profile.values], ["강점", profile.strengths]] as const).map(([label, items]) =>
              items.length ? (
                <div className="trait-group" key={label}><span>{label}</span><div>{items.map(i => <i key={i}>{i}</i>)}</div></div>
              ) : null
            )}
          </div>
        </section>
      )}

      <section className="insight-card">
        <div className="insight-head">
          <span className="eyebrow accent"><Lightbulb size={14} /> 기록이 말해 주는 것</span>
          <button className="quiet-button" onClick={() => void requestInsight()} disabled={insightPending || logCount === 0}>
            <RefreshCw size={13} className={insightPending ? "spin" : ""} /> {insightPending ? "분석 중…" : insight ? "다시 분석" : "AI 분석 받기"}
          </button>
        </div>
        {insight ? (
          <>
            <h2>{insight.headline}</h2>
            <ul className="insight-patterns">{insight.patterns.map(p => <li key={p}>{p}</li>)}</ul>
            <p className="insight-suggestion">{insight.suggestion}</p>
            <small className="insight-date">{new Date(insight.createdAt).toLocaleDateString("ko-KR")} 분석 · 실험을 더 기록할수록 정확해져요</small>
          </>
        ) : (
          <p className="insight-empty">
            {logCount === 0
              ? "실험을 하나 기록하면, 무엇을 할 때 내가 살아나는지 분석해 드려요."
              : `지금까지 실험 ${logCount}개를 기록했어요. 분석을 받아 보세요.`}
          </p>
        )}
        {insightError && <div className="inline-error" role="alert">{insightError}</div>}
      </section>

      <section className="dream-list" aria-label="하고 싶은 일 후보">
        <div className="list-head">
          <h2>하고 싶은 일 후보 <span>{dreams.length}</span></h2>
        </div>
        {dreams.length === 0 && (
          <div className="empty-block">
            <p>아직 후보가 없어요. 대화로 단서를 모으면 후보를 찾아 드려요.</p>
            <button className="button button-primary small-button" onClick={() => setTab("discover")}><Compass size={15} /> 찾기 시작</button>
          </div>
        )}
        {dreams.map(d => (
          <DreamRow key={d.id} dream={d} highlighted={!!insight?.focus && insight.focus === d.title && d.status !== "dropped"} />
        ))}
        {adding ? (
          <div className="onboard-card"><AddDreamForm onDone={() => { setAdding(false); setTab("today"); }} /></div>
        ) : (
          dreams.length > 0 && <button className="quiet-button add-inline" onClick={() => setAdding(true)}>+ 마음에 둔 일 직접 추가</button>
        )}
      </section>
    </main>
  );
}
