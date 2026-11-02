// Entry point for the Vercel serverless function (bundled by scripts/build-vercel.mjs).
// All /api/* requests are routed here; static files are served by Vercel's CDN.
import { createApp } from "./app";

export default createApp();
