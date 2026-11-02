import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, Compass, Footprints, Moon, Mountain, Plus, Send, Sparkles, Square, Sun, Upload } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { streamChat } from "@/lib/streamChat";
import { useTheme } from "@/contexts/ThemeContext";
import {
  countStreak,
  exportBackup,
  getLocalDateKey,
  initialPrompt,
  journeyFromPlan,
  parseBackup,
  readCoachState,
  writeCoachState,
  type ChatTurn,
  type CoachState,
  type Feeling,
  type GoalPlan,
  type SavedJourney,
} from "@/lib/coachStorage";
import PlanCard from "@/features/coach/PlanCard";
import ProgressCard, { type StepMode } from "@/features/progress/ProgressCard";
import HeroArt from "@/features/home/HeroArt";

type Mode = "home" | "chat";
const examples = ["에베레스트에 오르고 싶어요", "새로운 취미를 찾고 싶어요", "내 일을 바꿔보고 싶어요"];

function makeTurn(role: ChatTurn["role"], content: string): ChatTurn {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, content };
}

const toMessages = (turns: ChatTurn[]) =>
  turns.filter(turn => turn.id !== "welcome").slice(-18).map(({ role, content }) => ({ role, content }));

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [initial] = useState(() => readCoachState());
  const [journey, setJourney] = useState<SavedJourney | null>(initial.journey);
  const [mode, setMode] = useState<Mode>(initial.journey ? "home" : initial.turns.length > 0 ? "chat" : "home");
  const [turns, setTurns] = useState<ChatTurn[]>(initial.turns);
  const [draft, setDraft] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [suggestion, setSuggestion] = useState<GoalPlan | null>(null);
  const [messageError, setMessageError] = useState("");
  const [planError, setPlanError] = useState("");
  const [safetyNotice, setSafetyNotice] = useState("");
  const [stepPending, setStepPending] = useState<StepMode | null>(null);
  const [stepError, setStepError] = useState("");
  const [storageNotice, setStorageNotice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationVersionRef = useRef(0);
  const planMutation = trpc.coach.plan.useMutation();
  const stepMutation = trpc.coach.nextStep.useMutation();

  const todayKey = getLocalDateKey();
  const todayRecord = journey?.completions.find(r => r.date === todayKey && r.stepNumber === journey.stepNumber) ?? null;
  const streak = useMemo(() => (journey ? countStreak(journey.completions) : 0), [journey]);
  const userTurns = turns.filter(turn => turn.role === "user").length;

  useEffect(() => {
    writeCoachState({ turns, journey });
    try {
      const probe = "cheotbal-storage-check";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      setStorageNotice(false);
    } catch {
      setStorageNotice(true);
    }
  }, [turns, journey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, suggestion, streamingText]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    document.title = "첫걸음 — 목표 발견 & 실행 코치";
    const params = new URLSearchParams(window.location.search);
    if (params.get("start") === "chat") {
      window.history.replaceState(null, "", "/app");
      openChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetConversationRequests = () => {
    conversationVersionRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    planMutation.reset();
    setChatPending(false);
    setStreamingText("");
    setSuggestion(null);
    setMessageError("");
    setPlanError("");
    setSafetyNotice("");
  };

  const openChat = () => {
    if (turns.length === 0) setTurns([initialPrompt]);
    setSuggestion(null);
    setPlanError("");
    setSafetyNotice("");
    setMode("chat");
  };

  const startFreshChat = () => {
    resetConversationRequests();
    setTurns([initialPrompt]);
    setDraft("");
    setMode("chat");
  };

  /** Sends `history` (which must end with the user's turn) and appends the streamed reply. */
  const requestReply = async (history: ChatTurn[]) => {
    const requestVersion = conversationVersionRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setChatPending(true);
    setStreamingText("");
    setMessageError("");
    try {
      const answer = await streamChat(toMessages(history), setStreamingText, controller.signal);
      if (requestVersion !== conversationVersionRef.current) return;
      setTurns([...history, makeTurn("assistant", answer)]);
    } catch (error) {
      if (requestVersion !== conversationVersionRef.current || controller.signal.aborted) return;
      setMessageError(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      if (requestVersion === conversationVersionRef.current) {
        setChatPending(false);
        setStreamingText("");
        abortRef.current = null;
      }
    }
  };

  const stopReply = () => {
    const partial = streamingText.trim();
    conversationVersionRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setChatPending(false);
    setStreamingText("");
    if (partial) setTurns(current => [...current, makeTurn("assistant", partial)]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || chatPending) return;
    // If the last reply failed, replace the unanswered user turn instead of stacking another one.
    const base = turns.at(-1)?.role === "user" ? turns.slice(0, -1) : turns;
    const next = [...base, makeTurn("user", text)];
    setTurns(next);
    setDraft("");
    void requestReply(next);
  };

  const retryReply = () => {
    if (turns.at(-1)?.role === "user") void requestReply(turns);
  };

  const startWithExample = (example: string) => {
    resetConversationRequests();
    const seed = [initialPrompt, makeTurn("user", example)];
    setTurns(seed);
    setDraft("");
    setMode("chat");
    void requestReply(seed);
  };

  const makePlan = async () => {
    if (chatPending || planMutation.isPending) return;
    const requestVersion = conversationVersionRef.current;
    setPlanError("");
    setSafetyNotice("");
    try {
      const result = await planMutation.mutateAsync({ messages: toMessages(turns) });
      if (requestVersion !== conversationVersionRef.current) return;
      if (!result.safe) {
        setSuggestion(null);
        setSafetyNotice(result.message);
        return;
      }
      const { safe: _safe, ...plan } = result;
      setSuggestion(plan);
    } catch (error) {
      if (requestVersion !== conversationVersionRef.current) return;
      setPlanError(error instanceof Error ? error.message : "대화를 그대로 두고 다시 시도해 주세요.");
    }
  };

  const savePlan = () => {
    if (!suggestion) return;
    if (journey && !window.confirm("새 목표로 바꾸면 기존 여정의 완료 기록은 지워져요. 새 목표로 바꿀까요?")) return;
    setJourney(journeyFromPlan({ ...suggestion, nextSteps: suggestion.nextSteps.map(s => s.trim()).filter(Boolean) }));
    setSuggestion(null);
    setStepError("");
    setMode("home");
    requestAnimationFrame(() => document.getElementById("journey-example")?.scrollIntoView({ behavior: "smooth" }));
  };

  const completeToday = () => {
    if (!journey || todayRecord) return;
    setJourney({
      ...journey,
      completions: [
        ...journey.completions,
        { id: `${Date.now()}`, date: todayKey, note: journey.current.text, stepNumber: journey.stepNumber },
      ],
    });
  };

  const reflect = (recordId: string, feeling: Feeling | undefined, reflection: string) => {
    setJourney(current =>
      current && {
        ...current,
        completions: current.completions.map(record =>
          record.id === recordId ? { ...record, feeling, reflection: reflection || undefined } : record
        ),
      }
    );
  };

  const undoToday = () => {
    if (!journey || !todayRecord) return;
    setJourney({ ...journey, completions: journey.completions.filter(record => record.id !== todayRecord.id) });
  };

  const requestStep = async (stepMode: StepMode) => {
    if (!journey || stepPending) return;
    setStepPending(stepMode);
    setStepError("");
    try {
      const result = await stepMutation.mutateAsync({
        mode: stepMode,
        goal: journey.plan.goal,
        why: journey.plan.why,
        current: journey.current,
        history: journey.completions.slice(-12).map(record => ({
          step: record.note,
          date: record.date,
          feeling: record.feeling,
          reflection: record.reflection,
        })),
        upcoming: journey.upcoming.slice(0, 3),
      });
      if (!result.safe) {
        setStepError(result.message);
        return;
      }
      setJourney(current =>
        current && {
          ...current,
          current: { text: result.text, minutes: result.minutes, criteria: result.criteria },
          coachNote: result.coachNote,
          stepNumber: stepMode === "next" ? current.stepNumber + 1 : current.stepNumber,
          upcoming: stepMode === "next" ? current.upcoming.slice(1) : current.upcoming,
        }
      );
      toast.success(stepMode === "next" ? "다음 걸음이 준비됐어요" : "조금 더 가벼운 걸음으로 바꿨어요");
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setStepPending(null);
    }
  };

  const resetJourney = () => {
    if (!window.confirm("이 여정과 완료 기록을 지울까요? 대화 기록은 남아 있어요.")) return;
    setJourney(null);
    setStepError("");
  };

  const exportData = () => {
    const blob = new Blob([exportBackup({ turns, journey })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cheotbal-backup-${todayKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("기록을 파일로 저장했어요");
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const restored: CoachState = parseBackup(await file.text());
      if ((journey || turns.length > 1) && !window.confirm("지금 기록을 백업 파일 내용으로 바꿀까요?")) return;
      resetConversationRequests();
      setTurns(restored.turns);
      setJourney(restored.journey);
      setMode("home");
      toast.success("백업을 불러왔어요");
    } catch (error) {
      toast.error(error instanceof Error && error.message.includes("백업") ? error.message : "백업 파일을 읽지 못했어요.");
    }
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
          {toggleTheme && (
            <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "밝은 화면으로" : "어두운 화면으로"} title={theme === "dark" ? "밝은 화면" : "어두운 화면"}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>
      </header>

      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={event => void importData(event)} />

      {mode === "home" ? (
        <main className="home-main">
          <section className="hero-section">
            <div className="hero-copy">
              <span className="hero-label"><span className="label-dot" /> 마음속에 둔 일이 있나요?</span>
              <h1>하고 싶은 일,<br />같이 <em>찾아볼까요?</em></h1>
              <p className="hero-description">아직 선명하지 않아도 괜찮아요.<br className="desktop-break" /> 대화하다 보면, 오늘의 첫걸음이 보여요.</p>
              <button className="button button-primary hero-cta" onClick={openChat}>
                {turns.length > 1 ? "이어서 이야기하기" : "AI와 이야기 시작하기"} <ArrowRight size={18} />
              </button>
              <div className="privacy-note"><Check size={14} /> 로그인 없이, 이 기기에만 기록돼요</div>
            </div>
            <HeroArt />
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
                todayRecord={todayRecord}
                streak={streak}
                stepPending={stepPending}
                stepError={stepError}
                onComplete={completeToday}
                onReflect={reflect}
                onUndoToday={undoToday}
                onRequestStep={mode => void requestStep(mode)}
                onExplore={startFreshChat}
                onReset={resetJourney}
                onExport={exportData}
                onImport={() => fileInputRef.current?.click()}
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
              <div className="how-step"><span>03</span><strong>조금씩 이어가기</strong><p>해낸 날과 느낌을 기록하면<br />다음 걸음을 맞춰 드려요.</p></div>
            </div>
          </section>
          <footer className="site-footer">
            <Link href="/" className="footer-link">첫걸음 소개</Link>
            {!journey && <button className="footer-link" onClick={() => fileInputRef.current?.click()}><Upload size={11} /> 백업 불러오기</button>}
            <span>작은 시작도, 시작이니까요.</span>
          </footer>
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
              {chatPending && (
                <div className="message-row assistant">
                  <span className="assistant-avatar"><span className="brand-mark small"><span /><i /></span></span>
                  {streamingText ? (
                    <div className="message-bubble streaming">{streamingText}<span className="caret" aria-hidden="true" /></div>
                  ) : (
                    <div className="message-bubble typing"><i /><i /><i /><span>마음을 정리하고 있어요</span></div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {messageError && <div className="inline-error" role="alert">{messageError}<button onClick={retryReply}>다시 시도</button></div>}
            {userTurns > 0 && !suggestion && (
              <div className="plan-prompt">
                <span>하고 싶은 일이 조금 보이기 시작했나요?</span>
                <button onClick={() => void makePlan()} disabled={planMutation.isPending || chatPending}>
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
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="마음에 떠오르는 걸 적어보세요"
              />
              {chatPending ? (
                <button className="send-button stop" type="button" onClick={stopReply} aria-label="답변 멈추기"><Square size={13} fill="currentColor" /></button>
              ) : (
                <button className="send-button" type="submit" disabled={!draft.trim()} aria-label="메시지 보내기"><Send size={17} /></button>
              )}
            </form>}
            {!suggestion && <p className="composer-caption">Shift + Enter로 줄바꿈 · 이야기는 이 브라우저에 저장돼요</p>}
          </section>
          {storageNotice && <p className="storage-warning">이 브라우저에서는 기록을 저장할 수 없어요. 창을 닫으면 대화가 사라질 수 있어요.</p>}
          <div className="chat-bottom-note"><span className="privacy-shield"><Check size={12} /></span> 답변을 만들기 위해 대화가 AI에 전달되고, 기록은 이 브라우저에 저장돼요. 언제든 멈출 수 있어요.</div>
        </main>
      )}
      <button className={`floating-new${mode === "chat" ? " in-chat" : ""}`} onClick={startFreshChat} aria-label="새 대화 시작" title="새 대화 시작"><Plus size={19} /></button>
    </div>
  );
}
