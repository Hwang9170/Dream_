// Produces .vercel/output (Vercel Build Output API v3):
//   static/            ← the Vite client build (dist/public)
//   functions/api.func ← the Express API bundled into a single ESM file
// Run after `vite build`.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".vercel", "output");
const clientDist = path.join(root, "dist", "public");
const funcDir = path.join(out, "functions", "api.func");

if (!fs.existsSync(path.join(clientDist, "index.html"))) {
  throw new Error("dist/public is missing — run `vite build` first");
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(funcDir, { recursive: true });
fs.cpSync(clientDist, path.join(out, "static"), { recursive: true });

await build({
  entryPoints: [path.join(root, "server", "vercel.ts")],
  outfile: path.join(funcDir, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  minify: false,
  sourcemap: false,
  // CommonJS dependencies (express etc.) need require() inside an ES module.
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
  alias: { "@shared": path.join(root, "shared") },
  logLevel: "warning",
});

fs.writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      maxDuration: 60,
    },
    null,
    2
  )
);

fs.writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/assets/(.*)$", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
        { handle: "filesystem" },
        { src: "^/api(?:/.*)?$", dest: "/api" },
        { src: "^/(.*)$", dest: "/index.html" },
      ],
    },
    null,
    2
  )
);

console.log("✓ .vercel/output ready");
