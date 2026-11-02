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

const CHAT_SYSTEM = `당신은 '첫걸음'의 한국어 진로·꿈 탐색 코치입니다. 사용자는 대개 "내가 진짜 하고 싶은 게 뭔지 모르겠다"는 상태로 옵니다. 대화의 목적은 정답을 알려 주는 것이 아니라, 사용자의 경험 속에서 '하고 싶은 일의 단서'를 함께 캐내는 것입니다.

질문할 때 참고할 탐색 렌즈 (한 번에 하나씩, 대화 흐름에 맞게 골라 쓰세요):
- 몰입: 시간 가는 줄 몰랐던 순간, 누가 시키지 않아도 하던 일
- 어린 시절: 어릴 때 좋아했거나 되고 싶었던 것
- 부러움: 요즘 부럽다고 느낀 사람과 그 이유
- 호기심: 자꾸 검색하거나 찾아보게 되는 주제
- 강점: 주변에서 자주 부탁받거나 칭찬받는 일
- 불편함: 세상에서 바꾸고 싶은 것, 답답하게 느끼는 문제
- 가치: 돈·시간 걱정이 없다면 무엇을 하고 싶은지, 무엇을 할 때 나다운지

대화 원칙:
- 1~3개의 짧은 문장, 존댓말, 마크다운 제목·목록 없이 답합니다. 질문은 한 번에 하나만.
- 사용자의 답에서 구체적인 장면을 끌어내세요 ("그때 정확히 무엇이 좋았어요?"). 추상적인 대답이면 최근 일상의 예를 물어보세요.
- 두세 번 대화가 오가면 지금까지 보이는 공통점을 한 문장으로 비춰 주세요. 단정하지 말고 "~처럼 들려요"로 표현하세요.
- 단서가 충분히 모였다고 느껴지면(보통 4번 이상 대화 후) 화면의 '꿈 후보 찾기' 버튼으로 후보를 정리해 볼 수 있다고 한 번만 안내하세요.
- 특정 직업을 강요하거나 현실적으로 불가능하다고 깎아내리지 마세요.
- 의료·위험한 활동은 전문가와 안전을 우선하도록 표현하세요.
- 사용자가 자해나 극단적 선택을 암시하면 탐색을 멈추고, 따뜻하게 공감하며 자살예방상담전화 109(24시간)나 정신건강위기상담 1577-0199에 연락해 보도록 안내하세요.

응답 지연에 민감한 대화입니다. 바로 답을 시작하세요.`;

function chatSystem(clues: string[]): string {
  if (clues.length === 0) return CHAT_SYSTEM;
  return `${CHAT_SYSTEM}

사용자가 일상에서 따로 기록해 둔 '마음이 움직인 순간'들입니다. 대화에 자연스럽게 활용하세요:
${clues.map(c => `- ${c}`).join("\n")}`;
}

/** Streams the coach's next chat reply, calling onText for each text delta. */
export async function streamChatReply(
  turns: Turn[],
  onText: (text: string) => void,
  signal?: AbortSignal,
  clues: string[] = []
): Promise<string> {
  const messages = toClaudeMessages(turns);
  if (messages.length === 0) throw new Error("대화 내용이 비어 있어요.");

  const stream = getClient().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 4000,
      ...fallbackParams(),
      output_config: { effort: "low" },
      system: chatSystem(clues),
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

function clampMinutes(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(180, Math.round(value))) : 15;
}

function clean(value: string, max: number): string {
  return value.trim().slice(0, max);
}

const cleanList = (items: string[], max: number, count: number) =>
  items.map(item => clean(item, max)).filter(Boolean).slice(0, count);

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

const ExperimentShape = {
  text: z.string().describe("오늘~이번 주 안에 할 수 있는 구체적이고 안전한 실험 행동 한 가지"),
  minutes: z.number().int().describe("예상 소요 시간(분), 5~120"),
  criteria: z.string().describe("무엇을 하면 완료인지 한 문장"),
};
export type Experiment = { text: string; minutes: number; criteria: string };

function cleanExperiment(raw: Experiment): Experiment {
  return { text: clean(raw.text, 240), minutes: clampMinutes(raw.minutes), criteria: clean(raw.criteria, 240) };
}

// --- discover: conversation + clues → self-portrait + dream hypotheses -------

const DiscoverSchema = z.object({
  summary: z.string().describe("대화와 단서로 본 사용자의 모습을 2~3문장으로. 2인칭 존댓말('~할 때 ~해 보여요')"),
  themes: z.array(z.string()).describe("반복해서 드러난 관심 주제 2~4개, 각 2~8단어"),
  values: z.array(z.string()).describe("중요하게 여기는 가치 2~4개, 각 1~4단어"),
  strengths: z.array(z.string()).describe("드러난 강점 2~4개, 각 2~8단어"),
  dreams: z
    .array(
      z.object({
        title: z.string().describe("하고 싶은 일 후보. '~하는 사람' 또는 '~하기' 형태의 짧은 문장"),
        why: z.string().describe("대화의 어떤 단서에서 이 후보가 나왔는지 1~2문장. 사용자의 말을 근거로"),
        experiment: z.object(ExperimentShape).describe("이 후보가 정말 맞는지 확인해 볼 작고 값싼 첫 실험"),
      })
    )
    .describe("서로 결이 다른 꿈 후보 3개. 안전하고 현실적으로 탐색할 수 있어야 함"),
});
export type Discovery = z.infer<typeof DiscoverSchema>;

const DISCOVER_SYSTEM = `당신은 '첫걸음'의 꿈 탐색 코치입니다. 사용자의 대화와 일상 단서를 읽고, 사용자가 진짜 하고 싶어 할 만한 일의 '가설'을 세웁니다.
- 대화에 근거가 없는 내용은 지어내지 마세요. 근거가 약하면 why에 '아직 단서가 적지만'처럼 솔직하게 쓰세요.
- 꿈 후보 3개는 서로 결이 달라야 합니다(예: 만드는 일 / 돕는 일 / 배우는 일). 직업명만이 아니라 활동으로 표현해도 좋습니다.
- 각 후보의 실험은 돈이 거의 들지 않고 한두 시간 안에 해볼 수 있어야 하며, 그 일을 실제로 '맛보는' 행동이어야 합니다(영상 시청보다는 직접 작게 해보기, 그 일을 하는 사람의 글 읽기·질문하기 등).
- 위험하거나 의학적인 행동, 큰 비용·퇴사 같은 되돌리기 어려운 결정은 실험으로 제안하지 마세요.`;

export async function generateDiscovery(turns: Turn[], clues: string[]): Promise<Discovery> {
  const clueText = clues.length ? `\n\n내가 일상에서 기록한 단서:\n${clues.map(c => `- ${c}`).join("\n")}` : "";
  const messages = toClaudeMessages([
    ...turns,
    {
      role: "user",
      content: `지금까지의 대화를 바탕으로 내가 어떤 사람인지, 그리고 하고 싶은 일 후보 3개와 각각의 첫 실험을 정리해 주세요.${clueText}`,
    },
  ]);
  const raw = await parseStructured(DiscoverSchema, DISCOVER_SYSTEM, messages);
  const result: Discovery = {
    summary: clean(raw.summary, 400),
    themes: cleanList(raw.themes, 40, 4),
    values: cleanList(raw.values, 24, 4),
    strengths: cleanList(raw.strengths, 40, 4),
    dreams: raw.dreams
      .map(d => ({ title: clean(d.title, 80), why: clean(d.why, 280), experiment: cleanExperiment(d.experiment) }))
      .filter(d => d.title && d.experiment.text)
      .slice(0, 3),
  };
  if (result.dreams.length === 0) throw new Error("꿈 후보를 정리하지 못했어요.");
  return result;
}

// --- experiment: dream + logs → next experiment ------------------------------

const ExperimentSchema = z.object({
  ...ExperimentShape,
  coachNote: z.string().describe("지금까지의 기록을 짚어 주는 짧은 한두 문장. 과장 없이 담백하게"),
});
export type ExperimentSuggestion = z.infer<typeof ExperimentSchema>;

export type ExperimentLog = {
  date: string;
  text: string;
  energy: number;
  wantMore?: "yes" | "maybe" | "no";
  reflection?: string;
};

export type ExperimentRequest = {
  mode: "first" | "next" | "smaller" | "different";
  dream: { title: string; why: string; status: "exploring" | "committed" };
  current?: Experiment;
  logs: ExperimentLog[];
  profile?: string;
};

const wantMoreLabel = { yes: "더 해보고 싶음", maybe: "글쎄", no: "별로" } as const;

export function formatLogs(logs: ExperimentLog[]): string {
  if (logs.length === 0) return "(아직 기록 없음)";
  return logs
    .map(
      l =>
        `- ${l.date}: ${l.text} → 설렘 ${l.energy}/5${l.wantMore ? `, ${wantMoreLabel[l.wantMore]}` : ""}${l.reflection ? `, 메모: "${l.reflection}"` : ""}`
    )
    .join("\n");
}

const EXPERIMENT_SYSTEM = `당신은 '첫걸음'의 꿈 탐색 코치입니다. 사용자는 '하고 싶은 일 후보'를 작은 실험으로 직접 맛보며 자신에게 맞는지 확인하고 있습니다.
- 탐색 중인 후보라면: 이 일의 다른 면을 맛볼 수 있는 실험을 고르세요(혼자 해보기 → 결과물 공유하기 → 그 일을 하는 사람에게 묻기 → 작은 프로젝트). 목표는 '맞는지 판단할 정보'를 얻는 것입니다.
- 확정한 꿈이라면: 실력과 경험을 쌓는 다음 단계 행동을 고르세요.
- 설렘 점수가 낮거나 '별로'가 이어지면 같은 방향을 밀어붙이지 말고 결을 바꾼 실험을 제안하고, coachNote에서 이 후보를 내려놓아도 괜찮다고 솔직하게 말해 주세요.
- 이미 한 실험을 반복하지 마세요. 위험하거나 의학적인 행동, 큰 비용이나 퇴사 같은 되돌리기 어려운 결정은 제안하지 마세요.`;

export async function generateExperiment(input: ExperimentRequest): Promise<ExperimentSuggestion> {
  const ask = {
    first: "이 후보를 확인해 볼 첫 실험을 제안해 주세요.",
    next: "방금 실험을 마쳤어요. 기록을 보고 다음 실험을 제안해 주세요.",
    smaller: "지금 실험이 부담스러워요. 같은 방향이지만 10분 안에 확실히 해낼 수 있도록 훨씬 작게 쪼갠 실험을 제안해 주세요.",
    different: "지금 실험은 마음이 잘 안 가요. 같은 후보를 전혀 다른 방식으로 맛볼 수 있는 실험을 제안해 주세요.",
  }[input.mode];

  const prompt = `하고 싶은 일 후보: ${input.dream.title} (${input.dream.status === "committed" ? "확정한 꿈" : "탐색 중"})
이 후보가 나온 이유: ${input.dream.why || "(없음)"}
${input.profile ? `나에 대한 요약: ${input.profile}\n` : ""}${input.current ? `지금 실험: ${input.current.text} (약 ${input.current.minutes}분, 완료 기준: ${input.current.criteria})\n` : ""}
지금까지의 실험 기록:
${formatLogs(input.logs)}

${ask}`;

  const raw = await parseStructured(ExperimentSchema, EXPERIMENT_SYSTEM, [{ role: "user", content: prompt }]);
  const result = { ...cleanExperiment(raw), coachNote: clean(raw.coachNote, 300) };
  if (!result.text || !result.criteria) throw new Error("다음 실험을 확인하지 못했어요.");
  return result;
}

// --- insight: everything so far → what the records say -------------------------

const InsightSchema = z.object({
  headline: z.string().describe("지금까지의 기록에서 가장 두드러진 발견 한 문장"),
  patterns: z.array(z.string()).describe("기록에서 보이는 구체적인 패턴 2~4개. 실험·점수·메모를 근거로"),
  focus: z.string().describe("지금 가장 에너지가 올라가는 후보의 제목(목록의 제목 그대로). 판단이 어려우면 빈 문자열"),
  suggestion: z.string().describe("다음 1~2주 동안 해 볼 것에 대한 제안 2~3문장. 확정/계속 탐색/내려놓기 중 무엇이 좋을지 포함"),
});
export type Insight = z.infer<typeof InsightSchema>;

export type InsightRequest = {
  profile?: string;
  dreams: { title: string; status: "exploring" | "committed" | "paused" | "dropped"; note?: string; logs: ExperimentLog[] }[];
  clues: string[];
};

const statusLabel = { exploring: "탐색 중", committed: "확정", paused: "쉬는 중", dropped: "내려놓음" } as const;

const INSIGHT_SYSTEM = `당신은 '첫걸음'의 꿈 탐색 코치입니다. 사용자가 여러 '하고 싶은 일 후보'를 실험하며 남긴 기록(설렘 점수 1~5, 더 해보고 싶은지, 메모)과 일상 단서를 분석해, 사용자가 스스로를 더 잘 알도록 돕습니다.
- 숫자와 메모를 구체적인 근거로 드세요("영상 편집 실험 3번 모두 설렘 4점 이상").
- 후보들 사이의 공통점(예: 혼자 몰입할 때 vs 사람을 도울 때)을 찾아 주세요.
- 기록이 적으면 그렇다고 솔직하게 말하고, 판단보다 다음 실험을 제안하세요.
- 사용자의 가치를 판단하거나 특정 선택을 강요하지 마세요.`;

export async function generateInsight(input: InsightRequest): Promise<Insight> {
  const dreams = input.dreams
    .map(d => `## ${d.title} (${statusLabel[d.status]}${d.note ? `, 메모: ${d.note}` : ""})\n${formatLogs(d.logs)}`)
    .join("\n\n");
  const prompt = `${input.profile ? `나에 대한 요약: ${input.profile}\n\n` : ""}하고 싶은 일 후보와 실험 기록:
${dreams}

일상 단서:
${input.clues.length ? input.clues.map(c => `- ${c}`).join("\n") : "(없음)"}

지금까지의 기록을 보고 내가 무엇을 할 때 살아나는지 분석해 주세요.`;

  const raw = await parseStructured(InsightSchema, INSIGHT_SYSTEM, [{ role: "user", content: prompt }]);
  return {
    headline: clean(raw.headline, 200),
    patterns: cleanList(raw.patterns, 240, 4),
    focus: clean(raw.focus, 80),
    suggestion: clean(raw.suggestion, 500),
  };
}

