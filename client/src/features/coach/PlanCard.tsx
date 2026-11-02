import { ArrowRight, Clock3, MessageCircle, Sparkles } from "lucide-react";
import type { GoalPlan } from "@/lib/coachStorage";

type PlanCardProps = {
  plan: GoalPlan;
  onChange: (plan: GoalPlan) => void;
  onSave: () => void;
  onContinue: () => void;
  saving?: boolean;
};

export default function PlanCard({ plan, onChange, onSave, onContinue, saving = false }: PlanCardProps) {
  const updateNextStep = (index: number, value: string) => {
    const nextSteps = [...plan.nextSteps];
    nextSteps[index] = value;
    onChange({ ...plan, nextSteps });
  };

  return (
    <section className="plan-card" aria-labelledby="plan-heading">
      <div className="plan-card-topline">
        <span className="eyebrow"><Sparkles size={14} /> 우리 대화에서 찾은 첫걸음</span>
        <span className="plan-time"><Clock3 size={14} /> 약 {plan.minutes}분</span>
      </div>
      <p className="plan-why">대화에서 찾은 마음 · {plan.why}</p>
      <div className="plan-edit-form">
        <label className="plan-edit-field">
          <span>내 목표</span>
          <input aria-label="내 목표 수정" value={plan.goal} maxLength={240} onChange={event => onChange({ ...plan, goal: event.target.value })} />
        </label>
        <label className="plan-edit-field">
          <span><span className="step-number">1</span> 오늘 할 일</span>
          <textarea aria-label="오늘 할 일 수정" rows={2} value={plan.firstStep} maxLength={240} onChange={event => onChange({ ...plan, firstStep: event.target.value })} />
        </label>
        <div className="plan-edit-row">
          <label className="plan-edit-field">
            <span>예상 시간 (분)</span>
            <input aria-label="예상 시간(분) 수정" type="number" min={1} max={180} value={plan.minutes} onChange={event => onChange({ ...plan, minutes: Math.max(1, Math.min(180, Number(event.target.value) || 1)) })} />
          </label>
          <label className="plan-edit-field">
            <span>완료 기준</span>
            <input aria-label="완료 기준 수정" value={plan.criteria} maxLength={240} onChange={event => onChange({ ...plan, criteria: event.target.value })} />
          </label>
        </div>
      </div>
      {plan.nextSteps.length > 0 && (
        <div className="next-steps">
          <span className="eyebrow">그다음은, 천천히</span>
          {plan.nextSteps.map((step, index) => (
            <label className="plan-edit-field next-edit-field" key={`${index}-${step}`}>
              <span className="next-step-number">{index + 2}</span>
              <input aria-label={`다음 행동 ${index + 1} 수정`} value={step} maxLength={160} onChange={event => updateNextStep(index, event.target.value)} />
            </label>
          ))}
        </div>
      )}
      <button className="button button-primary plan-save" onClick={onSave} disabled={saving || !plan.goal.trim() || !plan.firstStep.trim() || !plan.criteria.trim()}>
        {saving ? "저장하는 중…" : "이 첫걸음으로 시작하기"}
        {!saving && <ArrowRight size={17} />}
      </button>
      <button className="continue-chat-button" onClick={onContinue}><MessageCircle size={14} /> 조금 더 이야기해 볼래요</button>
      <p className="gentle-note">제안은 직접 고칠 수 있어요. 목표도 언제든 바꿀 수 있어요.</p>
    </section>
  );
}
