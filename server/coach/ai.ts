import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Claude Opus 5.5 by default; override with ANTHROPIC_MODEL if you want a cheaper tier.
export const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";

// On a safety-classifier decline, the API re-runs the request on Anthropic's
// recommended fallback model instead of returning a refusal.
const fallbackParams = () => ({
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
});

let client: Anthropic | null = null;

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not configured");
  }
}

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();
  client ??= new Anthropic();
  return client;
}

export type Turn = { role: "user" | "assistant"; content: string };

/**
 * The Messages API needs the first turn to be from the user. The UI opens with
 * a canned assistant greeting, so drop leading assistant turns and merge any
 * consecutive same-role turns (e.g. after a failed reply was retried).
 */
export function toClaudeMessages(turns: Turn[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const turn of turns) {
    const content = turn.content.trim();
    if (!content) continue;
    if (out.length === 0 && turn.role === "assistant") continue;
    const last = out.at(-1);
    if (last && last.role === turn.role) {
      last.content = `${last.content as string}\n\n${content}`;
    } else {
      out.push({ role: turn.role, content });
    }
  }
  return out;
}

const CHAT_SYSTEM = `당신은 '첫걸음'이라는 한국어 목표 발견 코치입니다. 대화는 "안녕하세요. 마음 한편에 두고 있던 일부터 편하게 이야기해 주세요. 아직 잘 모르겠어도 괜찮아요."라는 인사로 이미 시작되었습니다.

- 사용자의 말에서 진짜 하고 싶은 일을 찾도록 다정하고 호기심 있게 대화하세요.
- 한 번에 짧은 질문 하나만 하세요. 1~3개의 짧은 문장, 존댓말, 마크다운 제목·목록 없이 답합니다.
- 사용자가 아직 모른다고 해도 부담을 주지 말고, 관심사와 일상에 대해 가볍게 물어보세요.
- 목표를 성급히 단정하지 말고 현재 여건과 동기를 자연스럽게 알아가세요.
- 구체적인 바람이 드러나면 공감하고, 원할 때 아래 '첫걸음 정리하기' 버튼으로 오늘의 첫 행동을 함께 정리할 수 있다고 안내하세요.
- 의료·치료·위험한 등반처럼 안전이 중요한 목표는 전문가의 지도와 안전을 우선하도록 표현하세요.
- 사용자가 자해나 극단적 선택을 암시하면 목표 코칭을 멈추고, 따뜻하게 공감하며 자살예방상담전화 109(24시간)나 정신건강위기상담 1577-0199에 연락해 보도록 안내하세요.

응답 지연에 민감한 대화입니다. 바로 답을 시작하세요.`;

/** Streams the coach's next chat reply, calling onText for each text delta. */
export async function streamChatReply(
  turns: Turn[],
  onText: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const messages = toClaudeMessages(turns);
  if (messages.length === 0) throw new Error("대화 내용이 비어 있어요.");

  const stream = getClient().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 4000,
      ...fallbackParams(),
      output_config: { effort: "low" },
      system: CHAT_SYSTEM,
      messages,
    },
    { signal }
  );

  let text = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text;
      onText(event.delta.text);
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal" && !text.trim()) {
    throw new Error("이 이야기는 제가 도와드리기 어려워요. 다른 방향으로 이야기해 볼까요?");
  }
  return text;
}

// ---------------------------------------------------------------------------
// Structured outputs
// ---------------------------------------------------------------------------

const PlanSchema = z.object({
  goal: z.string().describe("사용자의 표현을 존중한 목표 한 문장"),
  why: z.string().describe("대화에서 드러난 이유. 모호하면 '대화를 바탕으로 함께 찾는 중'"),
  firstStep: z.string().describe("오늘 당장 할 수 있는 구체적이고 안전한 행동 한 가지"),
  minutes: z.number().int().describe("예상 소요 시간(분), 1~180"),
  criteria: z.string().describe("무엇을 하면 완료인지 한 문장"),
  nextSteps: z.array(z.string()).describe("그다음에 해볼 작은 행동 1~3개, 점점 조금씩 어려워지게"),
});
export type Plan = z.infer<typeof PlanSchema>;

const StepSchema = z.object({
  text: z.string().describe("다음에 할 구체적이고 안전한 행동 한 가지"),
  minutes: z.number().int().describe("예상 소요 시간(분), 1~180"),
  criteria: z.string().describe("무엇을 하면 완료인지 한 문장"),
  coachNote: z.string().describe("지금까지의 기록을 짚어 주는 짧은 격려 한두 문장"),
});
export type Step = z.infer<typeof StepSchema>;

const PLAN_SYSTEM = `당신은 사용자와의 한국어 대화를 바탕으로 목표와 첫 행동을 구체화하는 코치입니다.
- 대화에서 확실히 알 수 없는 동기는 지어내지 마세요.
- 목표는 사용자의 표현을 존중하고, 첫 행동은 오늘 할 수 있는 낮은 난이도의 안전하고 구체적인 행동 한 가지로 제안하세요.
- 에베레스트 등반 같은 목표라도 실제 등반을 바로 권하지 말고 계단 걷기처럼 안전한 기초 행동을 제안하세요.
- 의학적 조언이나 위험한 행동은 권하지 마세요.`;

const STEP_SYSTEM = `당신은 '첫걸음' 코치입니다. 사용자가 목표를 향해 이어 온 작은 행동 기록과 회고를 보고, 다음에 할 행동 하나를 제안합니다.
- 회고에서 '어려웠어요'가 많으면 난이도를 유지하거나 낮추고, '쉬웠어요'가 많으면 아주 조금만 올리세요.
- 이미 한 행동을 그대로 반복하지 말고, 목표 쪽으로 한 걸음 나아가는 구체적인 행동을 고르세요.
- 의학적 조언이나 위험한 행동은 권하지 마세요. 혼자 하는 고산 등반, 단식, 약 중단 같은 행동은 절대 제안하지 않습니다.
- coachNote는 기록을 구체적으로 짚되 과장된 칭찬이나 압박 없이 담백하게 쓰세요.`;

function clampMinutes(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(180, Math.round(value))) : 10;
}

function clean(value: string, max: number): string {
  return value.trim().slice(0, max);
}

async function parseStructured<T extends z.ZodType>(
  schema: T,
  system: string,
  messages: Anthropic.Beta.BetaMessageParam[]
): Promise<z.infer<T>> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...fallbackParams(),
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system,
    messages,
  });
  if (response.stop_reason === "refusal") {
    throw new Error("요청을 처리할 수 없었어요.");
  }
  if (!response.parsed_output) throw new Error("AI 응답 형식을 읽지 못했어요.");
  return response.parsed_output as z.infer<T>;
}

export async function generatePlan(turns: Turn[]): Promise<Plan> {
  const messages = toClaudeMessages([
    ...turns,
    { role: "user", content: "우리 대화를 바탕으로 내 목표와 오늘 바로 할 수 있는 첫걸음을 정리해 주세요." },
  ]);
  const raw = await parseStructured(PlanSchema, PLAN_SYSTEM, messages);
  const plan: Plan = {
    goal: clean(raw.goal, 240),
    why: clean(raw.why, 240),
    firstStep: clean(raw.firstStep, 240),
    minutes: clampMinutes(raw.minutes),
    criteria: clean(raw.criteria, 240),
    nextSteps: raw.nextSteps.map(step => clean(step, 160)).filter(Boolean).slice(0, 3),
  };
  if (!plan.goal || !plan.firstStep || !plan.criteria) {
    throw new Error("계획에 필요한 내용을 확인하지 못했어요.");
  }
  return plan;
}

export type StepRequest = {
  mode: "next" | "smaller";
  goal: string;
  why: string;
  current: { text: string; minutes: number; criteria: string };
  history: { step: string; date: string; feeling?: "easy" | "ok" | "hard"; reflection?: string }[];
  upcoming: string[];
};

const feelingLabel = { easy: "쉬웠어요", ok: "적당했어요", hard: "어려웠어요" } as const;

export async function generateStep(input: StepRequest): Promise<Step> {
  const history = input.history.length
    ? input.history
        .map(h => `- ${h.date}: ${h.step}${h.feeling ? ` (${feelingLabel[h.feeling]})` : ""}${h.reflection ? ` — 회고: "${h.reflection}"` : ""}`)
        .join("\n")
    : "(아직 기록 없음)";
  const ask =
    input.mode === "smaller"
      ? `지금 행동이 부담스러워요. 같은 방향이지만 5~10분 안에 확실히 해낼 수 있도록 훨씬 더 작게 쪼갠 행동 하나를 제안해 주세요.`
      : `지금 행동을 해냈어요. 다음 걸음을 제안해 주세요.${input.upcoming.length ? ` 처음 계획한 후속 행동 후보는 다음과 같아요(참고만 하고, 기록에 맞게 조정하세요): ${input.upcoming.join(" / ")}` : ""}`;

  const prompt = `목표: ${input.goal}
이유: ${input.why}
지금 행동: ${input.current.text} (약 ${input.current.minutes}분, 완료 기준: ${input.current.criteria})

지금까지의 기록:
${history}

${ask}`;

  const raw = await parseStructured(StepSchema, STEP_SYSTEM, [{ role: "user", content: prompt }]);
  const step: Step = {
    text: clean(raw.text, 240),
    minutes: clampMinutes(raw.minutes),
    criteria: clean(raw.criteria, 240),
    coachNote: clean(raw.coachNote, 300),
  };
  if (!step.text || !step.criteria) throw new Error("다음 걸음을 확인하지 못했어요.");
  return step;
}
