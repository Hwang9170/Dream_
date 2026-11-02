import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Compass, RotateCcw, Send, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { streamChat } from "@/lib/streamChat";
import { makeId, type ChatTurn } from "@/lib/dreamStore";
import { useDream, type DiscoveryResult } from "@/features/app/DreamContext";

export const welcomeTurn: ChatTurn = {
  id: "welcome",
  role: "assistant",
  content:
    "반가워요. 하고 싶은 일을 찾는 건 정답을 고르기보다 단서를 모으는 일에 가까워요. 최근에 시간 가는 줄 모르고 했던 일이 있나요? 아주 사소한 것도 좋아요.",
};

const starters = [
  "뭘 좋아하는지 잘 모르겠어요",
  "요즘 아무것도 재미가 없어요",
  "하고 싶은 게 너무 많아서 못 고르겠어요",
  "어릴 때 꿈이 있었는데 잊고 살았어요",
];

const READY_AT = 4;

const toMessages = (turns: ChatTurn[]) =>
  turns.filter(t => t.id !== "welcome").slice(-24).map(({ role, content }) => ({ role, content }));

function DiscoveryCard({ result, onAdopt, onDismiss }: { result: DiscoveryResult; onAdopt: (picked: number[]) => void; onDismiss: () => void }) {
  const [picked, setPicked] = useState<number[]>(() => result.dreams.map((_, i) => i));
  const toggle = (i: number) => setPicked(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]));

  return (
    <section className="discovery-card" aria-labelledby="discovery-title">
      <span className="eyebrow accent"><Sparkles size={14} /> 대화에서 찾은 나의 모습</span>
      <p id="discovery-title" className="discovery-summary">{result.summary}</p>
      <div className="trait-groups">
        {[
          ["관심", result.themes],
          ["가치", result.values],
          ["강점", result.strengths],
        ].map(([label, items]) =>
          (items as string[]).length > 0 ? (
            <div className="trait-group" key={label as string}>
              <span>{label as string}</span>
              <div>{(items as string[]).map(item => <i key={item}>{item}</i>)}</div>
            </div>
          ) : null
        )}
      </div>

      <span className="eyebrow candidates-label">하고 싶은 일 후보 · 실험해 볼 것을 골라 주세요</span>
      <div className="candidate-list">
        {result.dreams.map((dream, i) => (
          <label key={dream.title} className={`candidate${picked.includes(i) ? " picked" : ""}`}>
            <input type="checkbox" checked={picked.includes(i)} onChange={() => toggle(i)} />
            <span className="candidate-check" aria-hidden="true"><Check size={13} /></span>
            <span className="candidate-body">
              <strong>{dream.title}</strong>
              <small>{dream.why}</small>
              <span className="candidate-exp">첫 실험 · {dream.experiment.text} <em>약 {dream.experiment.minutes}분</em></span>
            </span>
          </label>
        ))}
      </div>
      <button className="button button-primary wide-button" disabled={picked.length === 0} onClick={() => onAdopt(picked)}>
        {picked.length > 0 ? `${picked.length}개 후보로 실험 시작하기` : "후보를 골라 주세요"} <ArrowRight size={17} />
      </button>
      <button className="continue-chat-button" onClick={onDismiss}>조금 더 이야기해 볼래요</button>
      <p className="gentle-note">후보는 '정답'이 아니라 '가설'이에요. 직접 해 보고 마음이 어떤지 기록하면, 무엇이 진짜인지 보여요.</p>
    </section>
  );
}

export default function DiscoverView() {
  const { state, setTurns, adoptDiscovery, setTab } = useDream();
  const turns = state.turns.length ? state.turns : [welcomeTurn];
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [discoverError, setDiscoverError] = useState("");
  const [safetyNotice, setSafetyNotice] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const versionRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const discoverMutation = trpc.coach.discover.useMutation();

  const userTurns = turns.filter(t => t.role === "user").length;
  const clueCount = state.clues.length;
  const signal = userTurns + clueCount;
  const ready = userTurns >= 1 && signal >= READY_AT;
  const clueTexts = state.clues.slice(-20).map(c => c.text);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    // Desktop scrolls inside the panel; mobile scrolls the page.
    if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight;
    else if (userTurns > 0) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, streamingText, result, userTurns]);

  const requestReply = async (history: ChatTurn[]) => {
    const version = versionRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setStreamingText("");
    setError("");
    try {
      const answer = await streamChat(toMessages(history), clueTexts, setStreamingText, controller.signal);
      if (version !== versionRef.current) return;
      setTurns([...history, { id: makeId(), role: "assistant", content: answer }]);
    } catch (err) {
      if (version !== versionRef.current || controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      if (version === versionRef.current) {
        setPending(false);
        setStreamingText("");
        abortRef.current = null;
      }
    }
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    const base = turns.at(-1)?.role === "user" ? turns.slice(0, -1) : turns;
    const next = [...base, { id: makeId(), role: "user" as const, content: content.slice(0, 1200) }];
    setTurns(next);
    setDraft("");
    setResult(null);
    void requestReply(next);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(draft);
  };

  const stop = () => {
    const partial = streamingText.trim();
    versionRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
    setStreamingText("");
    if (partial) setTurns([...turns, { id: makeId(), role: "assistant", content: partial }]);
  };

  const restart = () => {
    if (userTurns > 0 && !window.confirm("지금까지의 대화를 지우고 새로 시작할까요? 단서·후보·실험 기록은 그대로 남아요.")) return;
    versionRef.current += 1;
    abortRef.current?.abort();
    setPending(false);
    setStreamingText("");
    setError("");
    setResult(null);
    setTurns([welcomeTurn]);
  };

  const discover = async () => {
    if (pending || discoverMutation.isPending) return;
    const version = versionRef.current;
    setDiscoverError("");
    setSafetyNotice("");
    try {
      const res = await discoverMutation.mutateAsync({ messages: toMessages(turns), clues: clueTexts });
      if (version !== versionRef.current) return;
      if (!res.safe) {
        setSafetyNotice(res.message);
        return;
      }
      const { safe: _safe, ...rest } = res;
      setResult(rest);
    } catch (err) {
      if (version !== versionRef.current) return;
      setDiscoverError(err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  const adopt = (picked: number[]) => {
    if (!result) return;
    adoptDiscovery(result, picked);
    setResult(null);
    toast.success("실험을 시작해요. 오늘 하나만 해 봐도 충분해요");
    setTab("today");
  };

  return (
    <main className="view discover-view">
      <div className="view-intro">
        <span className="view-icon"><Compass size={19} /></span>
        <h1>하고 싶은 일,<br />단서부터 모아봐요</h1>
        <p>정답은 없어요. 대화하며 떠오르는 장면을 꺼내 보세요.</p>
      </div>

      <div className="signal-meter" aria-label={`모은 단서 ${signal}개`}>
        <div className="signal-copy">
          <strong>{ready ? "후보를 찾을 만큼 단서가 모였어요" : `단서 ${Math.min(signal, READY_AT)} / ${READY_AT}`}</strong>
          <span>대화 {userTurns}번 · 기록한 순간 {clueCount}개</span>
        </div>
        <div className="signal-bar"><span style={{ width: `${Math.min(100, (signal / READY_AT) * 100)}%` }} /></div>
      </div>

      <section className="chat-panel" aria-label="하고 싶은 일 찾기 대화">
        <div className="chat-transcript" ref={transcriptRef} aria-live="polite">
          {turns.map(turn => (
            <div className={`message-row ${turn.role}`} key={turn.id}>
              {turn.role === "assistant" && <span className="assistant-avatar"><span className="brand-mark small"><span /><i /></span></span>}
              <div className="message-bubble">{turn.content}</div>
            </div>
          ))}
          {pending && (
            <div className="message-row assistant">
              <span className="assistant-avatar"><span className="brand-mark small"><span /><i /></span></span>
              {streamingText ? (
                <div className="message-bubble streaming">{streamingText}<span className="caret" aria-hidden="true" /></div>
              ) : (
                <div className="message-bubble typing"><i /><i /><i /><span>생각을 따라가고 있어요</span></div>
              )}
            </div>
          )}
          {userTurns === 0 && !pending && (
            <div className="starter-chips">
              {starters.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="inline-error" role="alert">{error}<button onClick={() => turns.at(-1)?.role === "user" && void requestReply(turns)}>다시 시도</button></div>}

        {userTurns > 0 && !result && (
          <div className={`plan-prompt${ready ? " ready" : ""}`}>
            <span>{ready ? "모은 단서로 하고 싶은 일 후보를 찾아볼까요?" : "몇 번 더 이야기하면 후보를 더 정확히 찾을 수 있어요."}</span>
            <button onClick={() => void discover()} disabled={discoverMutation.isPending || pending}>
              {discoverMutation.isPending ? "단서를 엮는 중…" : "꿈 후보 찾기"} <ArrowRight size={15} />
            </button>
          </div>
        )}
        {discoverError && <div className="inline-error" role="alert">{discoverError}<button onClick={() => void discover()}>다시 시도</button></div>}
        {safetyNotice && <div className="safety-notice" role="status"><span className="privacy-shield"><Check size={12} /></span>{safetyNotice}</div>}
        {result && <DiscoveryCard result={result} onAdopt={adopt} onDismiss={() => setResult(null)} />}

        {!result && (
          <form className="chat-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="message-input">메시지 입력</label>
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
              placeholder="떠오르는 장면을 편하게 적어 보세요"
            />
            {pending ? (
              <button className="send-button stop" type="button" onClick={stop} aria-label="답변 멈추기"><Square size={13} fill="currentColor" /></button>
            ) : (
              <button className="send-button" type="submit" disabled={!draft.trim()} aria-label="메시지 보내기"><Send size={17} /></button>
            )}
          </form>
        )}
      </section>
      <div className="chat-footer-row">
        <span className="chat-bottom-note"><span className="privacy-shield"><Check size={12} /></span> 답변을 위해 대화가 AI에 전달되고, 기록은 이 기기에만 저장돼요.</span>
        {userTurns > 0 && <button className="quiet-button" onClick={restart}><RotateCcw size={13} /> 새 대화</button>}
      </div>
    </main>
  );
}
