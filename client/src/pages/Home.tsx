import { useEffect, useState } from "react";
import { BookOpen, Compass, Map as MapIcon, Moon, Sun, Sunrise } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { DreamProvider, useDream, type Tab } from "@/features/app/DreamContext";
import TodayView from "@/features/today/TodayView";
import DiscoverView from "@/features/discover/DiscoverView";
import DreamsView from "@/features/dreams/DreamsView";
import RecordsView from "@/features/records/RecordsView";

const tabs: { id: Tab; label: string; icon: typeof Compass }[] = [
  { id: "today", label: "오늘", icon: Sunrise },
  { id: "discover", label: "찾기", icon: Compass },
  { id: "dreams", label: "꿈 지도", icon: MapIcon },
  { id: "records", label: "기록", icon: BookOpen },
];

function Shell() {
  const { theme, toggleTheme } = useTheme();
  const { tab, setTab, storageOk, demo, exitDemo } = useDream();

  useEffect(() => {
    document.title = "첫걸음 — 하고 싶은 일 찾기";
  }, []);

  return (
    <div className="app-shell with-tabs">
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="첫걸음 소개">
          <span className="brand-mark"><span /><i /></span><span>첫걸음</span>
        </Link>
        <nav className="tab-bar" aria-label="메뉴">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {toggleTheme && (
          <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "밝은 화면으로" : "어두운 화면으로"}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
      </header>

      {demo && (
        <div className="demo-banner" role="status">
          <span>예시 화면이에요. 여기서 바꾼 내용은 저장되지 않아요.</span>
          <button onClick={exitDemo}>내 기록으로 시작</button>
        </div>
      )}
      {!storageOk && <p className="storage-warning">이 브라우저에서는 기록을 저장할 수 없어요. 창을 닫으면 기록이 사라질 수 있어요.</p>}

      {/* Discover stays mounted so an in-flight reply survives tab switches. */}
      <div hidden={tab !== "discover"}><DiscoverView /></div>
      {tab === "today" && <TodayView />}
      {tab === "dreams" && <DreamsView />}
      {tab === "records" && <RecordsView />}
    </div>
  );
}

export default function Home() {
  const [{ initialTab, demo }] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const start = params.get("start");
    const demo = params.get("demo") === "1";
    if (start || demo) window.history.replaceState(null, "", "/app");
    const tab: Tab | undefined = start === "chat" ? "discover" : (["today", "dreams", "records"] as const).find(t => t === start);
    return { initialTab: tab ?? (demo ? "today" : undefined), demo };
  });
  return (
    <DreamProvider initialTab={initialTab} demo={demo}>
      <Shell />
    </DreamProvider>
  );
}
