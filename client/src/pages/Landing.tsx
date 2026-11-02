import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Download,
  Eye,
  FlaskConical,
  Flame,
  Lightbulb,
  Lock,
  Map as MapIcon,
  MessageCircle,
  Moon,
  NotebookPen,
  Smartphone,
  Sparkles,
  Star,
  Sun,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import "./landing.css";

const START_HREF = "/app?start=chat";
const DEMO_HREF = "/app?demo=1";

/** Adds `.is-visible` once the element scrolls into view. */
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal${visible ? " is-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function BrandMark() {
  return <span className="brand-mark"><span /><i /></span>;
}

function FitBar({ score, tone }: { score: number; tone: "hot" | "warm" | "cool" }) {
  return (
    <span className={`lp-fit ${tone}`}>
      <span className="lp-fit-bar"><i style={{ width: `${score}%` }} /></span>
      <b>{score}</b>
    </span>
  );
}

function PhoneMockup() {
  return (
    <div className="lp-phone" aria-hidden="true">
      <div className="lp-phone-notch" />
      <div className="lp-phone-screen">
        <div className="lp-phone-head"><BrandMark /> 꿈 지도</div>
        <div className="lp-bubble ai">새벽 3시까지 편집했다니, 정말 빠져 있었네요. 어떤 순간이 가장 좋았어요?</div>
        <div className="lp-plan">
          <span className="lp-plan-kicker"><Flame size={11} /> 요즘 가장 살아나는 일</span>
          <strong>사람들의 이야기를 영상으로 담는 사람</strong>
          <FitBar score={94} tone="hot" />
          <span className="lp-plan-criteria">실험 3번 · 평균 설렘 4.7/5</span>
        </div>
        <div className="lp-plan muted">
          <strong>글과 진로를 함께 다듬어 주는 일</strong>
          <FitBar score={59} tone="warm" />
        </div>
        <div className="lp-plan muted">
          <strong className="dropped">작은 가게 SNS 운영해 주기</strong>
          <FitBar score={34} tone="cool" />
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    icon: MessageCircle,
    title: "단서를 모아요",
    body: "AI 코치가 몰입했던 순간, 부러웠던 사람, 자꾸 찾아보는 것을 하나씩 물어봐요. 일상에서 마음이 움직인 순간도 짧게 기록해요.",
    sample: <div className="lp-mini-chat"><span className="ai">요즘 시간 가는 줄 모르고 했던 일이 있어요?</span><span className="me">후배 자소서 봐주다 두 시간이 지났어요</span></div>,
  },
  {
    icon: FlaskConical,
    title: "꿈 후보를 작게 실험해요",
    body: "모은 단서로 결이 다른 '하고 싶은 일 후보' 3개를 찾고, 각각 한 시간 안에 맛볼 수 있는 실험을 제안해요.",
    sample: <div className="lp-mini-card"><small>후보 · 첫 실험 30분</small><strong>커리어 코치의 글 3편 읽고 질문 하나 남기기</strong></div>,
  },
  {
    icon: MapIcon,
    title: "설렘을 기록하고 확인해요",
    body: "해 보고 얼마나 설렜는지, 또 하고 싶은지 남기면 후보마다 설렘 지수가 쌓여요. AI가 패턴을 읽어 진짜 하고 싶은 일을 짚어 줘요.",
    sample: (
      <div className="lp-mini-fits">
        <FitBar score={94} tone="hot" />
        <FitBar score={59} tone="warm" />
        <FitBar score={34} tone="cool" />
      </div>
    ),
  },
];

const features = [
  { icon: Compass, title: "꿈 탐색 대화", body: "몰입·호기심·부러움·강점·가치, 다섯 가지 렌즈로 한 번에 하나씩 물어봐요. 답변은 실시간으로 이어져요." },
  { icon: NotebookPen, title: "단서 노트", body: "'시간 가는 줄 몰랐다', '부러웠다' 같은 순간을 10초 만에 기록해요. 대화와 후보 찾기에 함께 쓰여요." },
  { icon: Sparkles, title: "나의 모습 & 꿈 후보", body: "관심사·가치·강점을 정리하고, 근거와 함께 결이 다른 꿈 후보 3개와 첫 실험을 제안해요." },
  { icon: FlaskConical, title: "작은 실험", body: "부담되면 '더 작게', 안 끌리면 '다른 방식으로'. 기록을 보고 다음 실험을 맞춰 드려요." },
  { icon: Flame, title: "설렘 지수 추적", body: "실험마다 남긴 설렘 점수와 '또 하고 싶은지'로 후보별 지수와 추세를 보여 줘요." },
  { icon: Lightbulb, title: "AI 패턴 분석", body: "무엇을 할 때 살아나는지, 어떤 후보에 집중할지 기록을 근거로 짚어 줘요." },
  { icon: Star, title: "나의 꿈으로 정하기", body: "확신이 들면 '나의 꿈'으로 정하고, 그때부터는 실력을 쌓는 다음 걸음을 이어가요." },
  { icon: Lock, title: "로그인 없이, 내 기기에만", body: "계정이 필요 없어요. 기록은 이 브라우저에 저장되고, 파일로 백업할 수 있어요." },
];

const journeys = [
  { clue: "친구 결혼식 영상을 새벽까지 편집했다", dream: "사람들의 이야기를 영상으로 담는 사람", result: "실험 3번 · 설렘 4.7 → 나의 꿈으로" },
  { clue: "후배 자소서 봐주다 두 시간이 지났다", dream: "누군가의 진로를 함께 고민하는 일", result: "실험 2번 · 설렘 3.5 → 계속 탐색" },
  { clue: "빵집 사장님이 사진을 고마워했다", dream: "작은 가게 SNS 운영해 주기", result: "실험 2번 · '의무감' → 내려놓기" },
];

const faqs = [
  { q: "정말 하고 싶은 게 하나도 없는데요?", a: "괜찮아요. 첫걸음은 '하고 싶은 게 뭔지 모르겠다'는 사람을 위해 만들었어요. 거창한 꿈 대신 최근에 몰입했던 사소한 순간부터 물어봐요. 대화 몇 번과 단서 몇 개면 첫 후보를 찾을 수 있어요." },
  { q: "적성검사랑 뭐가 달라요?", a: "검사는 한 번 답하고 끝나지만, 첫걸음은 후보를 '직접 해 보고' 그때 마음이 어땠는지를 기록해요. 머릿속 짐작이 아니라 실제 경험이 쌓일수록 결과가 정확해져요." },
  { q: "실험은 얼마나 걸려요? 돈이 드나요?", a: "대부분 10분~1시간이고, 돈이 거의 들지 않는 행동으로 제안해요. 퇴사나 큰 비용처럼 되돌리기 어려운 결정은 제안하지 않아요." },
  { q: "회원가입이 필요한가요? 기록은 어디에 저장돼요?", a: "가입 없이 바로 쓸 수 있어요. 대화와 기록은 지금 쓰는 브라우저에만 저장되고, '기록 백업'으로 파일을 내려받아 다른 기기에서 불러올 수 있어요." },
  { q: "대화 내용은 어디로 전송되나요?", a: "답변과 분석을 만들기 위해 대화와 기록이 AI(Anthropic Claude)로 전달돼요. 서비스 서버에는 따로 저장하지 않아요. 민감한 개인정보는 적지 않는 걸 권해요." },
  { q: "휴대폰에서도 앱처럼 쓸 수 있나요?", a: "네. 모바일 브라우저에서 '홈 화면에 추가'를 누르면 앱 아이콘으로 바로 열 수 있어요." },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = "첫걸음 — 하고 싶은 일, 해 보면서 찾기";
  }, []);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="wordmark" aria-label="첫걸음 소개 페이지"><BrandMark /><span>첫걸음</span></Link>
          <nav className="lp-nav-links" aria-label="소개 페이지 메뉴">
            <a href="#how">어떻게 찾나요</a>
            <a href="#features">기능</a>
            <a href="#faq">자주 묻는 질문</a>
          </nav>
          <div className="lp-nav-actions">
            {toggleTheme && (
              <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "밝은 화면으로" : "어두운 화면으로"}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            <Link href={START_HREF} className="button button-primary lp-nav-cta">시작하기</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-inner">
            <div className="lp-hero-copy">
              <span className="lp-chip"><span className="label-dot" /> AI 꿈 탐색 코치</span>
              <h1>하고 싶은 일,<br /><em>해 보면서</em> 찾아요.</h1>
              <p>
                머릿속으로만 고민하면 답이 잘 안 나와요. 대화로 단서를 모으고, 꿈 후보를 작게 실험하고,
                무엇을 할 때 설레는지 기록해 보세요. 진짜 하고 싶은 일이 점점 선명해져요.
              </p>
              <div className="lp-hero-actions">
                <Link href={START_HREF} className="button button-primary lp-cta">
                  내 꿈 찾기 시작 <ArrowRight size={18} />
                </Link>
                <Link href={DEMO_HREF} className="lp-ghost"><Eye size={16} /> 예시로 둘러보기</Link>
              </div>
              <ul className="lp-trust">
                <li><Check size={14} /> 회원가입 없음</li>
                <li><Check size={14} /> 무료</li>
                <li><Check size={14} /> 기록은 내 기기에만</li>
              </ul>
            </div>
            <div className="lp-hero-visual">
              <div className="lp-blob" />
              <PhoneMockup />
              <div className="lp-float lp-float-a"><NotebookPen size={14} /> 단서 4개가 모였어요</div>
              <div className="lp-float lp-float-b">🤩 푹 빠졌어요 · “또 새벽까지 했다”</div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-problem">
          <div className="lp-container">
            <Reveal className="lp-center">
              <span className="eyebrow">왜 첫걸음인가요</span>
              <h2>“뭘 하고 싶은지 모르겠어요.”</h2>
              <p className="lp-lead">하고 싶은 일은 생각해서 찾아지기보다, 해 보면서 발견되는 경우가 많아요. 모르는 게 문제가 아니라, 아직 충분히 맛보지 못한 것일 수 있어요.</p>
            </Reveal>
            <div className="lp-pain-grid">
              {[
                ["모르겠어요", "좋아하는 게 뭔지, 잘하는 게 뭔지 말로 꺼내기 어려워요."],
                ["못 고르겠어요", "관심 가는 건 여러 개인데, 하나를 고르기엔 확신이 없어요."],
                ["생각만 해요", "검사도 해 보고 영상도 봤지만, 정작 직접 해 본 건 없어요."],
              ].map(([title, body], i) => (
                <Reveal key={title} delay={i * 80} className="lp-pain">
                  <strong>{title}</strong>
                  <p>{body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section" id="how">
          <div className="lp-container">
            <Reveal className="lp-center">
              <span className="eyebrow">어떻게 하나요</span>
              <h2>단서 → 실험 → 확인, 세 단계로 찾아요.</h2>
            </Reveal>
            <div className="lp-steps">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 100} className="lp-step">
                  <div className="lp-step-top">
                    <span className="lp-step-num">0{i + 1}</span>
                    <span className="lp-icon"><step.icon size={18} /></span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <div className="lp-step-sample">{step.sample}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-journeys">
          <div className="lp-container">
            <Reveal className="lp-center">
              <span className="eyebrow">이렇게 발견해요</span>
              <h2>사소한 단서가, 꿈이 되기까지.</h2>
            </Reveal>
            <div className="lp-journey-list">
              {journeys.map((j, i) => (
                <Reveal key={j.clue} delay={i * 80} className="lp-journey">
                  <span className="lp-icon"><NotebookPen size={18} /></span>
                  <div className="lp-journey-path">
                    <span className="lp-journey-goal"><small>단서</small>{j.clue}</span>
                    <span className="lp-journey-arrow" aria-hidden="true" />
                    <span className="lp-journey-step"><small>꿈 후보</small>{j.dream}</span>
                    <span className="lp-journey-arrow" aria-hidden="true" />
                    <span className="lp-journey-next"><small>실험 결과</small>{j.result}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section" id="features">
          <div className="lp-container">
            <Reveal className="lp-center">
              <span className="eyebrow">기능</span>
              <h2>찾고, 해 보고, 추적하는 데 필요한 것만.</h2>
            </Reveal>
            <div className="lp-feature-grid">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={(i % 4) * 70} className="lp-feature">
                  <span className="lp-icon"><f.icon size={18} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </Reveal>
              ))}
            </div>
            <Reveal className="lp-extras">
              <span><Smartphone size={15} /> 홈 화면에 추가해 앱처럼</span>
              <span><Moon size={15} /> 다크 모드</span>
              <span><Download size={15} /> 기록 백업 · 불러오기</span>
              <span><Check size={15} /> 탐색 달력 · 연속 기록</span>
            </Reveal>
          </div>
        </section>

        <section className="lp-section lp-privacy">
          <div className="lp-container lp-privacy-inner">
            <Reveal className="lp-privacy-copy">
              <span className="lp-icon lg"><Lock size={22} /></span>
              <h2>당신의 이야기는 당신 것이에요.</h2>
              <p>
                계정도, 서버 저장도 없어요. 대화와 기록은 지금 쓰는 브라우저에만 남고, 원할 때 파일로 백업하거나 한 번에 지울 수 있어요.
                답변을 만들 때만 대화가 AI로 전달돼요.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="lp-section" id="faq">
          <div className="lp-container lp-faq-wrap">
            <Reveal className="lp-center">
              <span className="eyebrow">자주 묻는 질문</span>
              <h2>궁금한 게 있나요?</h2>
            </Reveal>
            <div className="lp-faq">
              {faqs.map(item => (
                <details key={item.q}>
                  <summary>{item.q}<ChevronDown size={18} /></summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-container">
            <Reveal className="lp-final-card">
              <h2>아직 아무것도 몰라도 괜찮아요.</h2>
              <p>최근에 시간 가는 줄 몰랐던 순간 하나면 시작할 수 있어요.</p>
              <Link href={START_HREF} className="button lp-final-cta">
                내 꿈 찾기 시작 <ArrowRight size={18} />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div>
            <Link href="/" className="wordmark"><BrandMark /><span>첫걸음</span></Link>
            <p>하고 싶은 일은, 해 보면서 찾아져요.</p>
          </div>
          <div className="lp-footer-links">
            <Link href="/app">앱 열기</Link>
            <Link href={DEMO_HREF}>예시 둘러보기</Link>
            <a href="#faq">자주 묻는 질문</a>
          </div>
          <p className="lp-disclaimer">
            첫걸음은 의료·심리 상담을 대신하지 않아요. 마음이 많이 힘들다면 자살예방상담전화 109(24시간), 정신건강위기상담 1577-0199에 연락해 주세요.
          </p>
        </div>
      </footer>
    </div>
  );
}
