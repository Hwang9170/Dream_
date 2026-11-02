import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Footprints,
  HeartHandshake,
  Lock,
  MessageCircle,
  Minimize2,
  Moon,
  Mountain,
  Smartphone,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import "./landing.css";

const START_HREF = "/app?start=chat";

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

function PhoneMockup() {
  return (
    <div className="lp-phone" aria-hidden="true">
      <div className="lp-phone-notch" />
      <div className="lp-phone-screen">
        <div className="lp-phone-head"><BrandMark /> 첫걸음</div>
        <div className="lp-bubble ai">요즘 자꾸 마음에 걸리거나, 해보고 싶다고 생각한 게 있나요?</div>
        <div className="lp-bubble me">언젠가 에베레스트에 오르고 싶어요</div>
        <div className="lp-bubble ai">멋진 꿈이에요. 지금은 평소에 얼마나 걷거나 오르는 편이세요?</div>
        <div className="lp-plan">
          <span className="lp-plan-kicker"><Sparkles size={11} /> 오늘의 첫걸음 · 10분</span>
          <strong>집이나 회사 계단을 10분 동안 천천히 오르내리기</strong>
          <span className="lp-plan-criteria">숨이 차도 대화할 수 있는 속도로 10분을 채우면 완료</span>
          <span className="lp-plan-button">이 첫걸음으로 시작하기 <ArrowRight size={12} /></span>
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    icon: MessageCircle,
    title: "마음속 이야기를 꺼내요",
    body: "AI 코치가 한 번에 하나씩, 부담 없이 물어봐요. 아직 뭘 하고 싶은지 몰라도 괜찮아요.",
    sample: <div className="lp-mini-chat"><span className="ai">요즘 시간 가는 줄 모르고 했던 일이 있어요?</span><span className="me">글 쓰는 거요… 근데 오래 안 했어요</span></div>,
  },
  {
    icon: Footprints,
    title: "오늘 할 수 있는 한 걸음으로",
    body: "대화를 바탕으로 목표와, 오늘 바로 해볼 수 있는 작은 행동 하나를 정리해요. 직접 고칠 수도 있어요.",
    sample: <div className="lp-mini-card"><small>오늘의 첫걸음 · 15분</small><strong>메모장에 요즘 떠오른 장면 한 문단 쓰기</strong></div>,
  },
  {
    icon: CalendarDays,
    title: "기록하고, 다음 걸음으로",
    body: "해낸 날을 체크하고 한 줄 회고를 남기면, 그 느낌에 맞춰 다음 걸음을 제안해요.",
    sample: (
      <div className="lp-mini-heat">
        {Array.from({ length: 21 }, (_, i) => <i key={i} className={[2, 3, 5, 8, 9, 10, 12, 15, 16, 17, 19].includes(i) ? (i % 3 ? "l1" : "l2") : ""} />)}
      </div>
    ),
  },
];

const features = [
  { icon: MessageCircle, title: "실시간으로 이어지는 대화", body: "답변이 타이핑되듯 바로 보여요. 중간에 멈추고 다시 말해도 돼요." },
  { icon: Footprints, title: "오늘의 작은 한 걸음", body: "목표가 아무리 커도, 첫 행동은 오늘 10분 안에 해볼 수 있게 제안해요." },
  { icon: Minimize2, title: "버거우면 더 작게", body: "오늘 너무 크게 느껴지면 버튼 하나로 더 작은 걸음으로 쪼개요." },
  { icon: HeartHandshake, title: "회고에 맞춘 다음 걸음", body: "‘쉬웠어요/어려웠어요’와 한 줄 메모를 보고 난이도를 조절해요." },
  { icon: CalendarDays, title: "실천 달력과 연속 기록", body: "최근 6주의 걸음을 달력으로 한눈에. 연속 실천일도 함께 보여요." },
  { icon: Lock, title: "로그인 없이, 내 기기에만", body: "계정이 필요 없어요. 기록은 이 브라우저에 저장되고, 파일로 백업할 수 있어요." },
];

const journeys = [
  { icon: Mountain, goal: "에베레스트에 오르고 싶어요", step: "계단 10분 오르기", next: "주말에 동네 뒷산 1시간 걷기" },
  { icon: BookOpen, goal: "내 이야기로 책을 쓰고 싶어요", step: "떠오른 장면 한 문단 쓰기", next: "일주일에 세 번, 20분 쓰기" },
  { icon: Briefcase, goal: "하는 일을 바꿔보고 싶어요", step: "관심 가는 직무 공고 3개 저장하기", next: "그 일을 하는 사람 글 하나 읽기" },
];

const faqs = [
  { q: "정말 아직 하고 싶은 게 없어도 되나요?", a: "네. 첫걸음은 ‘목표가 있는 사람’보다 ‘뭔가 해보고 싶은데 막연한 사람’을 위해 만들었어요. 일상과 관심사에 대한 가벼운 질문부터 시작해요." },
  { q: "회원가입이 필요한가요? 기록은 어디에 저장돼요?", a: "가입 없이 바로 쓸 수 있어요. 대화와 실천 기록은 지금 쓰는 브라우저에만 저장되고, ‘기록 백업’으로 파일을 내려받아 다른 기기에서 불러올 수 있어요." },
  { q: "대화 내용은 어디로 전송되나요?", a: "답변을 만들기 위해 대화가 AI(Anthropic Claude)로 전달돼요. 서비스 서버에는 대화를 따로 저장하지 않아요. 민감한 개인정보는 적지 않는 걸 권해요." },
  { q: "휴대폰에서도 앱처럼 쓸 수 있나요?", a: "네. 모바일 브라우저에서 ‘홈 화면에 추가’를 누르면 앱 아이콘으로 바로 열 수 있어요." },
  { q: "건강이나 마음에 관한 목표도 괜찮나요?", a: "물론이에요. 다만 첫걸음은 의료·심리 상담을 대신하지 않아요. 위험할 수 있는 행동은 제안하지 않고, 필요하면 전문가와 상의하도록 안내해요." },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = "첫걸음 — 큰 꿈을 오늘의 한 걸음으로";
  }, []);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="wordmark" aria-label="첫걸음 소개 페이지"><BrandMark /><span>첫걸음</span></Link>
          <nav className="lp-nav-links" aria-label="소개 페이지 메뉴">
            <a href="#how">어떻게 하나요</a>
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
              <span className="lp-chip"><span className="label-dot" /> AI 목표 발견 &amp; 실행 코치</span>
              <h1>큰 꿈을,<br /><em>오늘의 10분</em>으로.</h1>
              <p>
                하고 싶은 일이 아직 흐릿해도 괜찮아요. 대화하며 마음속 바람을 찾고,
                오늘 바로 해볼 수 있는 작은 행동으로 바꿔 드려요.
              </p>
              <div className="lp-hero-actions">
                <Link href={START_HREF} className="button button-primary lp-cta">
                  지금 대화 시작하기 <ArrowRight size={18} />
                </Link>
                <a href="#how" className="lp-ghost">어떻게 작동하나요 <ChevronDown size={16} /></a>
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
              <div className="lp-float lp-float-a"><Footprints size={14} /> 3일째 이어가는 중</div>
              <div className="lp-float lp-float-b">😌 적당했어요 · “생각보다 할 만했다”</div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-problem">
          <div className="lp-container">
            <Reveal className="lp-center">
              <span className="eyebrow">왜 첫걸음인가요</span>
              <h2>목표는 큰데, 시작은 늘 어렵죠.</h2>
              <p className="lp-lead">계획을 세우다 지치거나, 너무 큰 목표 앞에서 멈춰 버린 적 있나요? 문제는 의지가 아니라 첫 행동의 크기일 때가 많아요.</p>
            </Reveal>
            <div className="lp-pain-grid">
              {[
                ["막연해요", "하고 싶은 건 있는 것 같은데, 그게 뭔지 말로 꺼내기 어려워요."],
                ["너무 커요", "에베레스트, 책 한 권, 이직… 어디서부터 시작할지 모르겠어요."],
                ["작심삼일", "의욕적으로 시작했다가 며칠 지나면 흐지부지돼요."],
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
              <h2>대화 → 첫걸음 → 기록, 세 단계면 충분해요.</h2>
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
              <span className="eyebrow">이런 식으로 바뀌어요</span>
              <h2>큰 꿈도, 오늘의 일로.</h2>
            </Reveal>
            <div className="lp-journey-list">
              {journeys.map((j, i) => (
                <Reveal key={j.goal} delay={i * 80} className="lp-journey">
                  <span className="lp-icon"><j.icon size={18} /></span>
                  <div className="lp-journey-path">
                    <span className="lp-journey-goal">{j.goal}</span>
                    <span className="lp-journey-arrow" aria-hidden="true" />
                    <span className="lp-journey-step"><small>오늘</small>{j.step}</span>
                    <span className="lp-journey-arrow" aria-hidden="true" />
                    <span className="lp-journey-next"><small>그다음</small>{j.next}</span>
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
              <h2>가볍게 시작하고, 꾸준히 이어가도록.</h2>
            </Reveal>
            <div className="lp-feature-grid">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 80} className="lp-feature">
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
              <h2>아직 잘 모르겠어도 괜찮아요.</h2>
              <p>떠오르는 말 한 줄이면 시작할 수 있어요.</p>
              <Link href={START_HREF} className="button lp-final-cta">
                첫걸음 떼러 가기 <ArrowRight size={18} />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div>
            <Link href="/" className="wordmark"><BrandMark /><span>첫걸음</span></Link>
            <p>작은 시작도, 시작이니까요.</p>
          </div>
          <div className="lp-footer-links">
            <Link href="/app">앱 열기</Link>
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
