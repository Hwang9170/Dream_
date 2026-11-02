import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generatePlan, generateStep, MissingApiKeyError } from "./coach/ai";
import { clientIp, RATE_LIMIT_MESSAGE, takeToken } from "./coach/rateLimit";
import { isUnsafeAction, isUnsafeGoal, SAFETY_MESSAGE } from "./coach/safety";

export const conversationSchema = z
  .array(
    z.object({
      role: z.enum(["assistant", "user"]),
      content: z.string().min(1).max(1200),
    })
  )
  .min(1)
  .max(24);

const limitedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!takeToken(clientIp(ctx.req))) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: RATE_LIMIT_MESSAGE });
  }
  return next();
});

function serviceError(scope: string, error: unknown, message: string): TRPCError {
  console.error(`[Coach] ${scope} failed`, error);
  if (error instanceof MissingApiKeyError) {
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 연결 설정이 아직 끝나지 않았어요. (ANTHROPIC_API_KEY)" });
  }
  return new TRPCError({ code: "SERVICE_UNAVAILABLE", message });
}

const stepInput = z.object({
  mode: z.enum(["next", "smaller"]),
  goal: z.string().min(1).max(240),
  why: z.string().max(240),
  current: z.object({
    text: z.string().min(1).max(240),
    minutes: z.number().int().min(1).max(180),
    criteria: z.string().max(240),
  }),
  history: z
    .array(
      z.object({
        step: z.string().max(240),
        date: z.string().max(10),
        feeling: z.enum(["easy", "ok", "hard"]).optional(),
        reflection: z.string().max(300).optional(),
      })
    )
    .max(12),
  upcoming: z.array(z.string().max(160)).max(3),
});

export const coachRouter = router({
  plan: limitedProcedure.input(z.object({ messages: conversationSchema })).mutation(async ({ input }) => {
    try {
      const plan = await generatePlan(input.messages);
      if (isUnsafeGoal(plan.goal) || [plan.firstStep, ...plan.nextSteps].some(isUnsafeAction)) {
        return { safe: false as const, message: SAFETY_MESSAGE };
      }
      return { safe: true as const, ...plan };
    } catch (error) {
      throw serviceError("Plan", error, "첫걸음을 정리하지 못했어요. 대화는 그대로 있으니 다시 시도해 주세요.");
    }
  }),

  nextStep: limitedProcedure.input(stepInput).mutation(async ({ input }) => {
    try {
      const step = await generateStep(input);
      if (isUnsafeAction(step.text)) return { safe: false as const, message: SAFETY_MESSAGE };
      return { safe: true as const, ...step };
    } catch (error) {
      throw serviceError("Next step", error, "다음 걸음을 정리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }),
});
