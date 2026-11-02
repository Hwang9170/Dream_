import { useMemo } from "react";
import { getLocalDateKey } from "@/lib/dreamStore";

const WEEKS = 6;
const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];

type Cell = { key: string; date: Date; count: number; future: boolean; today: boolean };

function buildCells(dates: string[]): Cell[] {
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(date, (counts.get(date) ?? 0) + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getLocalDateKey(today);
  // Start on the Monday WEEKS-1 weeks before this week's Monday.
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - mondayOffset - (WEEKS - 1) * 7);

  return Array.from({ length: WEEKS * 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = getLocalDateKey(date);
    return { key, date, count: counts.get(key) ?? 0, future: date > today, today: key === todayKey };
  });
}

/** Six-week practice heatmap, one column per week (Mon → Sun top to bottom). */
export default function PracticeCalendar({ dates }: { dates: string[] }) {
  const cells = useMemo(() => buildCells(dates), [dates]);
  const activeDays = cells.filter(c => c.count > 0).length;
  const formatter = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="practice-calendar">
      <div className="calendar-head">
        <span className="eyebrow">최근 6주의 탐색</span>
        <span className="calendar-summary">{activeDays > 0 ? `${activeDays}일 움직였어요` : "첫 기록을 기다리고 있어요"}</span>
      </div>
      <div className="calendar-body">
        <div className="calendar-days" aria-hidden="true">
          {dayLabels.map((label, i) => (
            <span key={label}>{i % 2 === 0 ? label : ""}</span>
          ))}
        </div>
        <div className="calendar-grid" role="img" aria-label={`최근 6주 중 ${activeDays}일 기록`}>
          {cells.map(cell => (
            <span
              key={cell.key}
              className={`calendar-cell level-${Math.min(cell.count, 2)}${cell.future ? " future" : ""}${cell.today ? " today" : ""}`}
              title={cell.future ? undefined : `${formatter.format(cell.date)} · ${cell.count > 0 ? `${cell.count}개 기록` : "기록 없음"}`}
            />
          ))}
        </div>
      </div>
      <div className="calendar-legend" aria-hidden="true">
        <span>쉼</span>
        <i className="calendar-cell level-0" />
        <i className="calendar-cell level-1" />
        <i className="calendar-cell level-2" />
        <span>많이</span>
      </div>
    </div>
  );
}
