import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";

const conversationSchema = z.array(
  z.object({
    role: z.enum(["assistant", "user"]),
    content: z.string().min(1).max(1200),
  })
).min(1).max(24);

function completionText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { type: "text"; text: string } =>
        typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string"
      )
      .map(part => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

function parsePlan(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("계획 형식을 읽지 못했어요.");
  const value = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  const stringField = (key: string, max = 240) => {
    const item = value[key];
    if (typeof item !== "string" || item.trim().length === 0 || item.length > max) {
      throw new Error("계획에 필요한 내용을 확인하지 못했어요.");
    }
    return item.trim();
  };
  const rawMinutes = Number(value.minutes);
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step): step is string => typeof step === "string").slice(0, 3)
    : [];
  return {
    goal: stringField("goal"),
    why: stringField("why"),
    firstStep: stringField("firstStep"),
    minutes: Number.isFinite(rawMinutes) ? Math.max(1, Math.min(180, Math.round(rawMinutes))) : 10,
    criteria: stringField("criteria"),
    nextSteps,
  };
}

const unsafeGoalPatterns = [
  /자해|자살|목숨을 끊|사람을 해치|폭발물|불법 약물/i,
];

const unsafeActionPatterns = [
  /혼자.{0,10}(?:등산|등반|암벽|빙벽|빙하)/i,
  /(?:단식|굶기|금식|하루.{0,8}굶)/i,
  /(?:약물|처방약|약).{0,16}(?:임의로|마음대로|끊기|중단|복용량|늘리기|줄이기)/i,
  /(?:처방|치료).{0,12}(?:중단|대신)/i,
  /(?:자해|자살|스스로.{0,10}(?:해치기|다치기))/i,
  /(?:통증|부상).{0,12}(?:무시|참고|견디기)/i,
  /(?:음주|술).{0,12}운전/i,
];

const riskyMountainLocation = /에베레스트|고산|빙벽|빙하|절벽|암벽|산\s*정상/i;
const riskyMountainAction = /오르|등반|건너|하강|뛰어내리|도전하|시도하/i;
const safeMountainContext = /계단|실내|안전\s*(?:교육|강습|수칙)|전문가|가이드|정보|자료|상담|준비\s*목록/i;

function isUnsafeAction(action: string): boolean {
  const unsafeMountainAttempt = riskyMountainLocation.test(action) &&
    riskyMountainAction.test(action) &&
    !safeMountainContext.test(action);
  return unsafeMountainAttempt || unsafeActionPatterns.some(pattern => pattern.test(action));
}

function needsSafetyRedirect(plan: ReturnType<typeof parsePlan>): boolean {
  return unsafeGoalPatterns.some(pattern => pattern.test(plan.goal)) ||
    [plan.firstStep, ...plan.nextSteps].some(isUnsafeAction);
}

export const coachRouter = router({
  chat: publicProcedure
    .input(z.object({ messages: conversationSchema }))
    .mutation(async ({ input }) => {
      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "당신은 한국어 목표 발견 코치입니다. 사용자의 말에서 진짜 하고 싶은 일을 찾도록 다정하고 호기심 있게 대화하세요. 한 번에 짧은 질문 하나만 하고, 사용자가 아직 모른다고 해도 부담을 주지 마세요. 목표를 성급히 단정하지 말고 현재 여건과 관심사를 자연스럽게 알아가세요. 구체적인 바람이 드러났다면 공감하고, 원할 때 오늘의 첫 행동을 함께 정리할 수 있다고 안내하세요. 치료·의학·위험한 등반 등 안전이 중요한 목표는 전문가의 지도와 안전을 우선하도록 표현하세요. 마크다운 제목이나 여러 질문 목록을 남발하지 말고 1~3개의 짧은 문장으로 답하세요.",
            },
            ...input.messages,
          ],
          maxTokens: 350,
        });
        const answer = completionText(result.choices?.[0]?.message?.content);
        if (!answer) throw new Error("AI가 답변을 보내지 않았어요.");
        return { answer };
      } catch (error) {
        console.error("[Coach] Chat request failed", error);
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "대화를 이어오지 못했어요. 입력한 내용은 남아 있으니 잠시 후 다시 시도해 주세요." });
      }
    }),

  plan: publicProcedure
    .input(z.object({ messages: conversationSchema }))
    .mutation(async ({ input }) => {
      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `사용자와의 한국어 대화를 바탕으로 목표와 첫 행동을 구체화하는 코치입니다. 대화에서 확실히 알 수 없는 동기는 과장하거나 지어내지 말고, 이유가 모호하면 "대화를 바탕으로 함께 찾는 중"처럼 짧게 표현하세요. 목표는 사용자의 표현을 존중하고, 첫 행동은 오늘 할 수 있는 낮은 난이도의 안전하고 구체적인 행동 한 가지로 제안하세요. 에베레스트 등반 목표라도 실제 등반을 바로 권하지 말고 계단 걷기처럼 안전한 기초 행동을 제안하세요. 의학적 조언이나 위험 행동은 권하지 마세요. 오직 다음 키를 가진 JSON 객체만 반환하세요: {"goal":"목표 한 문장","why":"대화에서 드러난 이유","firstStep":"오늘 당장 할 구체적인 행동","minutes":10,"criteria":"어떻게 하면 완료인지","nextSteps":["선택 가능한 후속 작은 행동"]}. minutes는 1~180 정수, nextSteps는 1~3개 문자열입니다.`,
            },
            ...input.messages,
            { role: "user", content: "우리 대화를 바탕으로 내 목표와 오늘 바로 할 수 있는 첫걸음을 JSON으로 정리해 주세요." },
          ],
          maxTokens: 500,
        });
        const raw = completionText(result.choices?.[0]?.message?.content);
        if (!raw) throw new Error("AI가 계획을 보내지 않았어요.");
        const plan = parsePlan(raw);
        if (needsSafetyRedirect(plan)) {
          return {
            safe: false as const,
            message: "이 목표에는 안전이나 전문적인 안내가 먼저 필요해 보여요. 위험한 행동은 제안하지 않을게요. 전문가와 안전한 방법을 상의한 뒤, 작은 첫걸음을 다시 정리해 봐요.",
          };
        }
        return { safe: true as const, ...plan };
      } catch (error) {
        console.error("[Coach] Plan request failed", error);
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "첫걸음을 정리하지 못했어요. 대화는 그대로 있으니 다시 시도해 주세요." });
      }
    }),
});
