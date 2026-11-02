import type { DreamFit } from "@/lib/dreamStore";

/** Tiny energy sparkline (1–5 per experiment). */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 64;
  const h = 20;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - 1) / 4) * (h - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg className="sparkline" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={points} fill="none" />
      {values.length > 0 && <circle cx={(values.length - 1) * step} cy={h - ((values.at(-1)! - 1) / 4) * (h - 4) - 2} r="2.5" />}
    </svg>
  );
}

/** Shows how much a dream lights the user up, from logged experiments. */
export default function FitMeter({ fit, compact = false }: { fit: DreamFit; compact?: boolean }) {
  const level = fit.count === 0 ? "none" : fit.score >= 70 ? "hot" : fit.score >= 45 ? "warm" : "cool";
  if (compact) {
    return (
      <span className={`fit-compact ${level}`} title={fit.count ? `설렘 지수 ${fit.score} · 실험 ${fit.count}번` : "아직 실험 기록이 없어요"}>
        <span className="fit-dot" />
        {fit.count ? `설렘 ${fit.score}` : "기록 전"}
      </span>
    );
  }
  return (
    <div className={`fit-meter ${level}`}>
      <div className="fit-row">
        <span className="fit-label">{fit.label}</span>
        <span className="fit-score">{fit.count ? <><strong>{fit.score}</strong>/100</> : "—"}</span>
      </div>
      <div className="fit-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fit.score} aria-label="설렘 지수">
        <span style={{ width: `${fit.count ? Math.max(4, fit.score) : 0}%` }} />
      </div>
      <div className="fit-foot">
        <span>실험 {fit.count}번{fit.count > 0 && ` · 평균 설렘 ${fit.energy}/5`}</span>
        <Sparkline values={fit.trend} />
      </div>
    </div>
  );
}
