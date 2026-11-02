import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, Compass, Footprints, Mountain, Plus, Send, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  countStreak,
  getLocalDateKey,
  initialPrompt,
  readCoachState,
  writeCoachState,
  type ChatTurn,
  type GoalPlan,
  type SavedJourney,
} from "@/lib/coachStorage";
import PlanCard from "@/features/coach/PlanCard";
import ProgressCard from "@/features/progress/ProgressCard";

type Mode = "home" | "chat";
const examples = ["에베레스트에 오르고 싶어요", "새로운 취미를 찾고 싶어요", "내 일을 바꿔보고 싶어요"];

function makeTurn(role: ChatTurn["role"], content: string): ChatTurn {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, content };
}

export default function Home() {
  const [saved, setSaved] = useState(() => readCoachState());
  const [mode, setMode] = useState<Mode>(() => {
    const initial = readCoachState();
    return initial.journey ? "home" : initial.turns.length > 0 ? "chat" : "home";
  });
  const [turns, setTurns] = useState<ChatTurn[]>(() => readCoachState().turns);
  const [draft, setDraft] = useState("");
  const [suggestion, setSuggestion] = useState<GoalPlan | null>(null);
  const [messageError, setMessageError] = useState("");
  const [planError, setPlanError] = useState("");
  const [safetyNotice, setSafetyNotice] = useState("");
  const [storageNotice, setStorageNotice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationVersionRef = useRef(0);
  const chatMutation = trpc.coach.chat.useMutation();
  const planMutation = trpc.coach.plan.useMutation();
  const journey = saved.journey;
  const todayKey = getLocalDateKey();
  const todayDone = !!journey?.completions.some(record => record.date === todayKey);
  const streak = useMemo(() => journey ? countStreak(journey.completions) : 0, [journey]);
  const userTurns = turns.filter(turn => turn.role === "user").length;

  useEffect(() => {
    writeCoachState({ turns, journey: saved.journey });
    try {
      const probe = "cheotbal-storage-check";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      setStorageNotice(false);
    } catch {
      setStorageNotice(true);
    }
  }, [turns, saved.journey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, suggestion]);

  const openChat = () => {
    if (turns.length === 0) setTurns([initialPrompt]);
    setSuggestion(null);
    setPlanError("");
    setSafetyNotice("");
    setMode("chat");
  };

  const startFreshChat = () => {
    conversationVersionRef.current += 1;
    chatMutation.reset();
    planMutation.reset();
    setTurns([initialPrompt]);
    setSuggestion(null);
    setMessageError("");
    setPlanError("");
    setSafetyNotice("");
    setDraft("");
    setMode("chat");
  };

  const sendMessage = async (text: string, existingUserTurn?: ChatTurn, baseTurns?: ChatTurn[]) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;
    const nextTurns = existingUserTurn ? turns : [...(baseTurns ?? turns), makeTurn("user", trimmed)];
    if (!existingUserTurn) setTurns(nextTurns);
    const requestVersion = conversationVersionRef.current;
    setMessageError("");
    try {
      const result = await chatMutation.mutateAsync({
        messages: nextTurns.slice(-18).map(({ role, content }) => ({ role, content })),
      });
      if (requestVersion !== conversationVersionRef.current) return;
      setTurns([...nextTurns, makeTurn("assistant", result.answer)]);
      setDraft("");
    } catch (error) {
      if (requestVersion !== conversationVersionRef.current) return;
      setMessageError(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lastTurn = turns.at(-1);
    if (lastTurn?.role === "user" && lastTurn.content === draft.trim()) {
      void sendMessage(lastTurn.content, lastTurn);
      return;
    }
    if (lastTurn?.role === "user") {
      const baseTurns = turns.slice(0, -1);
      setTurns(baseTurns);
      void sendMessage(draft, undefined, baseTurns);
      return;
    }
    void sendMessage(draft);
  };

  const startWithExample = (example: string) => {
    conversationVersionRef.current += 1;
    chatMutation.reset();
    planMutation.reset();
    const requestVersion = conversationVersionRef.current;
    const seed = [initialPrompt, makeTurn("user", example)];
    setTurns(seed);
    setSuggestion(null);
    setMessageError("");
    setPlanError("");
    setSafetyNotice("");
    setDraft("");
    setMode("chat");
    void (async () => {
      try {
        const result = await chatMutation.mutateAsync({ messages: seed.map(({ role, content }) => ({ role, content })) });
        if (requestVersion !== conversationVersionRef.current) return;
        setTurns([...seed, makeTurn("assistant", result.answer)]);
      } catch (error) {
        if (requestVersion !== conversationVersionRef.current) return;
        setMessageError(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
      }
    })();
  };

  const makePlan = async () => {
    if (chatMutation.isPending || planMutation.isPending) return;
    const requestVersion = conversationVersionRef.current;
    setPlanError("");
    setSafetyNotice("");
    try {
      const result = await planMutation.mutateAsync({
        messages: turns.filter(turn => turn.role !== "assistant" || turn.id !== "welcome").slice(-18).map(({ role, content }) => ({ role, content })),
      });
      if (requestVersion !== conversationVersionRef.current) return;
      if (!result.safe) {
        setSuggestion(null);
        setSafetyNotice(result.message);
        return;
      }
      setSuggestion({
        goal: result.goal,
        why: result.why,
        firstStep: result.firstStep,
        minutes: result.minutes,
        criteria: result.criteria,
        nextSteps: result.nextSteps,
      });
    } catch (error) {
      if (requestVersion !== conversationVersionRef.current) return;
      setPlanError(error instanceof Error ? error.message : "대화를 그대로 두고 다시 시도해 주세요.");
    }
  };

  const savePlan = () => {
    if (!suggestion) return;
    if (saved.journey && !window.confirm("새 목표로 바꾸면 기존 여정의 완료 기록은 지워져요. 새 목표로 바꿀까요?")) return;
    const nextJourney: SavedJourney = { plan: suggestion, startedAt: new Date().toISOString(), completions: [] };
    setSaved(current => ({ ...current, journey: nextJourney }));
    setSuggestion(null);
    setMode("home");
  };

  const completeToday = () => {
    if (!journey || todayDone) return;
    const nextJourney = {
      ...journey,
      completions: [...journey.completions, { id: `${Date.now()}`, date: todayKey, note: journey.plan.firstStep }],
    };
    setSaved(current => ({ ...current, journey: nextJourney }));
  };

  const undoToday = () => {
    if (!journey) return;
    const nextJourney = { ...journey, completions: journey.completions.filter(record => record.date !== todayKey) };
    setSaved(current => ({ ...current, journey: nextJourney }));
  };

  const resetJourney = () => {
    if (!window.confirm("이 여정과 완료 기록을 지울까요? 대화 기록은 남아 있어요.")) return;
    setSaved(current => ({ ...current, journey: null }));
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="wordmark" onClick={() => setMode("home")} aria-label="첫걸음 홈으로">
          <span className="brand-mark"><span /><i /></span><span>첫걸음</span>
        </button>
        <div className="header-right">
          {journey && mode === "chat" && <button className="header-link" onClick={() => setMode("home")}><ArrowLeft size={15} /> 내 여정</button>}
          <span className="header-caption"><span className="status-dot" /> 나를 알아가는 시간</span>
        </div>
      </header>

      {mode === "home" ? (
        <main className="home-main">
          <section className="hero-section">
            <div className="hero-copy">
              <span className="hero-label"><span className="label-dot" /> 마음속에 둔 일이 있나요?</span>
              <h1>하고 싶은 일,<br />같이 <em>찾아볼까요?</em></h1>
              <p className="hero-description">아직 선명하지 않아도 괜찮아요.<br className="desktop-break" /> 대화하다 보면, 오늘의 첫걸음이 보여요.</p>
              <button className="button button-primary hero-cta" onClick={openChat}>
                AI와 이야기 시작하기 <ArrowRight size={18} />
              </button>
              <div className="privacy-note"><Check size={14} /> 로그인 없이, 이 기기에만 기록돼요</div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-sun" />
              <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
              <img className="mountain-lines" src="/manus-storage/async-images/ULnVVckihxrsF8FyPrp7mR/image-1.webp" alt="" />
              <div className="art-caption"><Mountain size={14} /> 큰 꿈도, 한 걸음부터</div>
              <div className="art-pin"><span>오늘의 시작</span><i /></div>
            </div>
            <a className="scroll-cue" href="#journey-example"><ArrowDown size={15} /> 천천히 둘러보기</a>
          </section>

          {journey ? (
            <section className="progress-section" id="journey-example">
              <div className="section-heading">
                <div><span className="eyebrow">나의 여정</span><h2>어제보다 한 걸음</h2></div>
                <span className="live-pill"><span /> 기록 중</span>
              </div>
              <ProgressCard
                journey={journey}
                todayDone={todayDone}
                streak={streak}
                onComplete={completeToday}
                onUndoToday={undoToday}
                onExplore={startFreshChat}
                onReset={resetJourney}
              />
            </section>
          ) : (
            <section className="example-section" id="journey-example">
              <div className="example-heading">
                <span className="eyebrow"><Compass size={15} /> 이렇게 시작할 수 있어요</span>
                <h2>큰 목표도, 오늘의 일로.</h2>
                <p>막연한 바람을 작고 현실적인 행동으로 바꿔봐요.</p>
              </div>
              <button className="example-card" onClick={() => startWithExample(examples[0])}>
                <span className="example-icon"><Mountain size={19} /></span>
                <span className="example-text"><strong>언젠가 에베레스트에 오르고 싶어요</strong><small>오늘은 계단 10분 오르기부터</small></span>
                <ArrowRight className="example-arrow" size={18} />
              </button>
              <div className="example-chips">
                <span>이런 얘기도 좋아요</span>
                {examples.slice(1).map(example => <button key={example} onClick={() => startWithExample(example)}>{example}<ArrowRight size={13} /></button>)}
              </div>
            </section>
          )}

          <section className="how-section">
            <span className="eyebrow"><Footprints size={15} /> 서두르지 않아도 괜찮아요</span>
            <div className="how-steps">
              <div className="how-step"><span>01</span><strong>마음속 이야기</strong><p>대화하며 하고 싶은 일을<br />천천히 찾아요.</p></div>
              <div className="how-connector" />
              <div className="how-step"><span>02</span><strong>오늘 할 수 있는 일</strong><p>너무 크지 않은 첫 행동을<br />함께 골라요.</p></div>
              <div className="how-connector" />
              <div className="how-step"><span>03</span><strong>조금씩 이어가기</strong><p>해낸 날을 가볍게 기록하고<br />다음 걸음을 정해요.</p></div>
            </div>
          </section>
          <footer className="site-footer"><span>첫걸음 · 나만의 속도로</span><span>작은 시작도, 시작이니까요.</span></footer>
        </main>
      ) : (
        <main className="chat-main">
          <div className="chat-intro">
            <button className="back-link" onClick={() => setMode("home")}><ArrowLeft size={16} /> 홈으로</button>
            <div className="chat-heading-icon"><Sparkles size={19} /></div>
            <span className="eyebrow">마음속 이야기를 꺼내봐요</span>
            <h1>요즘 자꾸 생각나는<br />일이 있나요?</h1>
            <p>정답은 없어요. 떠오르는 말부터 편하게 해주세요.</p>
          </div>
          <section className="chat-panel" aria-label="AI 목표 탐색 대화">
            <div className="chat-transcript" aria-live="polite">
              {turns.map(turn => (
                <div className={`message-row ${turn.role}`} key={turn.id}>
                  {turn.role === "assistant" && <span className="assistant-avatar"><span className="brand-mark small"><span /><i /></span></span>}
                  <div className="message-bubble">{turn.content}</div>
                </div>
              ))}
              {chatMutation.isPending && <div className="message-row assistant"><span className="assistant-avatar"><span className="brand-mark small"><span /><i /></span></span><div className="message-bubble typing"><i /><i /><i /><span>마음을 정리하고 있어요</span></div></div>}
              <div ref={bottomRef} />
            </div>
            {messageError && <div className="inline-error" role="alert">{messageError}<button onClick={() => void sendMessage(turns.at(-1)?.content ?? draft, turns.at(-1))}>다시 시도</button></div>}
            {userTurns > 0 && !suggestion && (
              <div className="plan-prompt">
                <span>하고 싶은 일이 조금 보이기 시작했나요?</span>
                <button onClick={() => void makePlan()} disabled={planMutation.isPending || chatMutation.isPending}>
                  {planMutation.isPending ? "첫걸음을 정리하고 있어요…" : "이 대화로 첫걸음 정리하기"}<ArrowRight size={15} />
                </button>
              </div>
            )}
            {planError && <div className="inline-error plan-error" role="alert">{planError}<button onClick={() => void makePlan()}>다시 시도</button></div>}
            {safetyNotice && <div className="safety-notice" role="status"><span className="privacy-shield"><Check size={12} /></span>{safetyNotice}</div>}
            {suggestion && <PlanCard plan={suggestion} onChange={setSuggestion} onSave={savePlan} onContinue={() => setSuggestion(null)} />}
            {!suggestion && <form className="chat-composer" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="message-input">하고 싶은 일을 입력하세요</label>
              <textarea
                id="message-input"
                rows={1}
                value={draft}
                onChange={event => setDraft(event.target.value.slice(0, 1200))}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="마음에 떠오르는 걸 적어보세요"
                disabled={chatMutation.isPending}
              />
              <button className="send-button" type="submit" disabled={!draft.trim() || chatMutation.isPending} aria-label="메시지 보내기"><Send size={17} /></button>
            </form>}
            {!suggestion && <p className="composer-caption">Shift + Enter로 줄바꿈 · 이야기는 이 브라우저에 저장돼요</p>}
          </section>
          {storageNotice && <p className="storage-warning">이 브라우저에서는 기록을 저장할 수 없어요. 창을 닫으면 대화가 사라질 수 있어요.</p>}
          <div className="chat-bottom-note"><span className="privacy-shield"><Check size={12} /></span> 답변을 만들기 위해 대화가 AI에 전달되고, 기록은 이 브라우저에 저장돼요. 언제든 멈출 수 있어요.</div>
        </main>
      )}
      <button className="floating-new" onClick={startFreshChat} aria-label="새 대화 시작"><Plus size={19} /></button>
      <div className="page-spark" aria-hidden="true"><span /><span /><span /></div>
    </div>
  );
}
