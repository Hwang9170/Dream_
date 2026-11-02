import { useState, type FormEvent } from "react";
import { ArrowRight, Compass, Flame, Lightbulb, Plus } from "lucide-react";
import { activeDreams, activityDates, countStreak, isDoneToday } from "@/lib/dreamStore";
import { useDream } from "@/features/app/DreamContext";
import ExperimentCard from "./ExperimentCard";
import ClueCapture from "./ClueCapture";

function AddDreamForm({ onDone }: { onDone?: () => void }) {
  const { addDream } = useDream();
  const [title, setTitle] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    addDream(title);
    setTitle("");
    onDone?.();
  };
  return (
    <form className="add-dream-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="add-dream">마음에 둔 일</label>
      <input id="add-dream" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="예: 그림책 만들기, 바리스타 해보기" />
      <button className="button button-primary small-button" type="submit" disabled={!title.trim()}>
        추가 <Plus size={15} />
      </button>
    </form>
  );
}

export { AddDreamForm };

export default function TodayView() {
  const { state, setTab } = useDream();
  const [adding, setAdding] = useState(false);
  const dreams = activeDreams(state.dreams);
  const streak = countStreak(activityDates(state));
  const doneCount = dreams.filter(d => isDoneToday(d, state.logs)).length;
  const today = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date());

  return (
    <main className="view today-view">
      <div className="today-hero">
        <div>
          <span className="eyebrow">{today}</span>
          <h1>{dreams.length === 0 ? "하고 싶은 일, 같이 찾아볼까요?" : doneCount > 0 ? "오늘도 한 걸음 했어요" : "오늘은 어떤 걸 맛볼까요?"}</h1>
        </div>
        <span className="streak-pill"><Flame size={14} /> {streak > 0 ? `${streak}일째` : "오늘부터"}</span>
      </div>

      {dreams.length === 0 ? (
        <section className="onboard">
          <button className="onboard-card primary" onClick={() => setTab("discover")}>
            <span className="onboard-icon"><Compass size={20} /></span>
            <span className="onboard-text">
              <strong>뭘 하고 싶은지 잘 모르겠어요</strong>
              <small>AI와 대화하며 단서를 모으고, 하고 싶은 일 후보를 찾아요</small>
            </span>
            <ArrowRight size={18} />
          </button>
          <div className="onboard-card">
            <span className="onboard-text">
              <strong>마음에 둔 일이 이미 있어요</strong>
              <small>정말 나에게 맞는지 작은 실험으로 확인해 봐요</small>
            </span>
            <AddDreamForm />
          </div>
        </section>
      ) : (
        <section className="experiment-list" aria-label="진행 중인 실험">
          {dreams.map(dream => <ExperimentCard key={dream.id} dream={dream} />)}
          {adding ? (
            <div className="onboard-card"><AddDreamForm onDone={() => setAdding(false)} /></div>
          ) : (
            <div className="list-actions">
              <button className="text-button" onClick={() => setTab("discover")}><Compass size={14} /> 후보 더 찾기</button>
              <button className="quiet-button" onClick={() => setAdding(true)}><Plus size={14} /> 직접 추가</button>
            </div>
          )}
        </section>
      )}

      {state.insight && (
        <button className="insight-teaser" onClick={() => setTab("dreams")}>
          <Lightbulb size={16} />
          <span><small>최근 분석</small>{state.insight.headline}</span>
          <ArrowRight size={15} />
        </button>
      )}

      <ClueCapture />
    </main>
  );
}
