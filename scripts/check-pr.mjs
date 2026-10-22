// PR guard: run with `npm run check` (compares your work to main) or in GitHub.
// Fails on things that should not reach main; warns on things worth a second look.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const base = process.env.BASE_REF || "origin/main";
const sh = (c) => execSync(c, { encoding: "utf8" }).trim();

const changed = sh(`git diff --name-status ${base}...HEAD`)
  .split("\n").filter(Boolean)
  .map((l) => { const [s, ...p] = l.split("\t"); return { status: s[0], path: p[p.length - 1] }; })
  .filter((f) => f.status !== "D");

const viteConfig = readFileSync("vite.config.js", "utf8");
const fails = [], warns = [];
const kb = (n) => Math.round(n / 1024);

for (const { path, status } of changed) {
  if (!existsSync(path)) continue;
  const size = statSync(path).size;
  const isNew = status === "A";

  if (/\.(mp4|mov|webm|avi|zip)$/i.test(path) && !path.startsWith("film/"))
    fails.push(`${path}: videos and zips do not belong in the site (${kb(size)} KB)`);
  if (/\.(png|jpe?g|webp|gif|svg|glb|gltf)$/i.test(path)) {
    if (size > 1024 * 1024) fails.push(`${path}: ${kb(size)} KB is too heavy for mobile data (limit 1024 KB)`);
    else if (size > 400 * 1024) warns.push(`${path}: ${kb(size)} KB is on the heavy side (try under 400 KB)`);
  }
  if (isNew && /^[^/]+\.html$/.test(path) && !viteConfig.includes(path))
    fails.push(`${path}: a new page in the main folder that the build does not use. Move it to lab/ or add it to vite.config.js on purpose`);
  if (isNew && /^[^/]+\.(png|jpe?g)$/.test(path))
    fails.push(`${path}: loose image in the main folder. Put it in lab/previews/ or public/`);
  if (/\.(log|DS_Store)$/.test(path)) fails.push(`${path}: junk file`);
  if (/^(dist|node_modules|exports)\//.test(path)) fails.push(`${path}: build output must not be committed`);
}

const stat = sh(`git diff --shortstat ${base}...HEAD`) || "no changes";
const commits = sh(`git rev-list --count ${base}..HEAD`);
console.log(`\n${commits} commit(s) · ${stat}\n`);
warns.forEach((w) => console.log("⚠️  " + w));
fails.forEach((f) => console.log("❌ " + f));
if (!fails.length && !warns.length) console.log("✅ Nothing suspicious");
process.exit(fails.length ? 1 : 0);
