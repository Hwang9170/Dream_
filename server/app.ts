import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { publicPlatformScript } from "./_core/publicConfig";
import { createContext } from "./_core/context";
import { registerOAuthRoutes } from "./_core/oauth";
import { handleChatStream } from "./coach/chatStream";
import { appRouter } from "./routers";

/** API-only Express app, shared by the local server and the Vercel function. */
export function createApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  app.post("/api/coach/chat", handleChatStream);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
