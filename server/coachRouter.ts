import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generateDiscovery, generateExperiment, generateInsight, MissingApiKeyError } from "./coach/ai";
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
  .max(30);

/** Free-form "moments that moved me" the user logged outside the chat. */
export const cluesSchema = z.array(z.string().min(1).max(200)).max(20).default([]);

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

const experimentSchema = z.object({
  text: z.string().min(1).max(240),
  minutes: z.number().int().min(1).max(180),
  criteria: z.string().max(240),
});

const logSchema = z.object({
  date: z.string().max(10),
  text: z.string().max(240),
  energy: z.number().int().min(1).max(5),
  wantMore: z.enum(["yes", "maybe", "no"]).optional(),
  reflection: z.string().max(300).optional(),
});

const dreamStatus = z.enum(["exploring", "committed", "paused", "dropped"]);

export const coachRouter = router({
  /** Conversation + clues → self-portrait and three dream hypotheses, each with a first experiment. */
  discover: limitedProcedure
    .input(z.object({ messages: conversationSchema, clues: cluesSchema }))
    .mutation(async ({ input }) => {
      try {
        const result = await generateDiscovery(input.messages, input.clues);
        const dreams = result.dreams.filter(d => !isUnsafeGoal(d.title) && !isUnsafeAction(d.experiment.text));
        if (dreams.length === 0) return { safe: false as const, message: SAFETY_MESSAGE };
        return { safe: true as const, ...result, dreams };
      } catch (error) {
        throw serviceError("Discover", error, "꿈 후보를 정리하지 못했어요. 대화는 그대로 있으니 다시 시도해 주세요.");
      }
    }),

  /** Next (or first / smaller / different) experiment for one dream. */
  experiment: limitedProcedure
    .input(
      z.object({
        mode: z.enum(["first", "next", "smaller", "different"]),
        dream: z.object({
          title: z.string().min(1).max(80),
          why: z.string().max(280),
          status: z.enum(["exploring", "committed"]),
        }),
        current: experimentSchema.optional(),
        logs: z.array(logSchema).max(12),
        profile: z.string().max(400).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (isUnsafeGoal(input.dream.title)) return { safe: false as const, message: SAFETY_MESSAGE };
      try {
        const result = await generateExperiment(input);
        if (isUnsafeAction(result.text)) return { safe: false as const, message: SAFETY_MESSAGE };
        return { safe: true as const, ...result };
      } catch (error) {
        throw serviceError("Experiment", error, "다음 실험을 정리하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    }),

  /** Reads every dream's experiment log and reports what energises the user. */
  insight: limitedProcedure
    .input(
      z.object({
        profile: z.string().max(400).optional(),
        dreams: z
          .array(
            z.object({
              title: z.string().min(1).max(80),
              status: dreamStatus,
              note: z.string().max(200).optional(),
              logs: z.array(logSchema).max(12),
            })
          )
          .min(1)
          .max(8),
        clues: cluesSchema,
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await generateInsight(input);
      } catch (error) {
        throw serviceError("Insight", error, "기록을 분석하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    }),
});
