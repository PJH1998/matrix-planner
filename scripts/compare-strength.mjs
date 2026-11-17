// 강도 계산 비교 도구 — 옛 계산(git 기준점)과 지금 작업 트리의 계산을 같은 입력으로 돌려 차이를 본다.
// 사용법: node scripts/compare-strength.mjs [기준 ref=main] [--all]
//   --all  비교한 파티를 전부 출력한다(기본은 변화가 큰 15개)
// 상황 두 가지를 비교한다.
//   빈 상태  : 육성 정보 없음(새로 온 사용자)
//   가이드   : 모든 공명자가 공식 가이드 추천 스탯을 직접 입력한 상태(어느 정도 키운 사용자)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const ref = args.find((a) => !a.startsWith("--")) || "main";
const showAll = args.includes("--all");
const ROOT = process.cwd();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mp-compare-"));
const base = path.join(tmp, "base");
execFileSync("git", ["worktree", "add", "-q", "--detach", base, ref], { stdio: "inherit" });

try {
  const load = async (dir) => (await import(pathToFileURL(path.join(dir, "tests/helpers/load-current-app.mjs")).href)).loadCurrentApp();
  const oldApp = await load(base);
  const newApp = await load(ROOT);

  const chars = newApp.defaults();
  const byId = Object.fromEntries(chars.map((c) => [c.id, c]));
  const dealers = chars.filter((c) => c.role !== "support").map((c) => c.id);
  const supports = chars.filter((c) => c.role === "support").map((c) => c.id);

  // 비교할 파티: 최우선 조합 + 메인 딜러마다 궁합이 가장 높은 딜러 1명·서포터 1명
  const teams = new Map();
  const addTeam = (ids) => { const key = ids.join(","); if (!teams.has(key) && new Set(ids).size === ids.length) teams.set(key, ids); };
  newApp.presets().forEach(addTeam);
  chars.filter((c) => c.role === "dps").forEach((c) => {
    const pairs = newApp.pairs(c.id);
    const best = (list) => list.filter((x) => x !== c.id).sort((a, b) => (pairs[b] || 0) - (pairs[a] || 0))[0];
    addTeam([c.id, best(dealers), best(supports)]);
  });

  const guideStats = () => {
    const growth = {};
    chars.forEach((c) => {
      const g = newApp.guide(c.id);
      if (!g) return;
      const stats = {};
      ["atk", "hp", "def", "cr", "cd", "er"].forEach((k) => { if (g[k] != null) stats[k] = g[k]; });
      if (Object.keys(stats).length) growth[c.id] = { stats };
    });
    return { growth };
  };

  const rank = (values) => { const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = []; order.forEach(([, i], k) => (r[i] = k)); return r; };
  const spearman = (a, b) => { const ra = rank(a), rb = rank(b), n = a.length; const d2 = ra.reduce((s, r, i) => s + (r - rb[i]) ** 2, 0); return 1 - (6 * d2) / (n * (n * n - 1)); };
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const name = (ids) => ids.map((id) => byId[id]?.name || id).join(" + ");

  for (const [label, patch] of [["빈 상태", null], ["가이드", guideStats()]]) {
    oldApp.reset(patch); newApp.reset(patch);
    const rows = [...teams.values()].map((ids) => {
      const team = { slots: ids, buff: null };
      return { ids, old: oldApp.teamCalc(team).total, now: newApp.teamCalc(team).total };
    });
    const oldMed = median(rows.map((r) => r.old)), newMed = median(rows.map((r) => r.now));
    rows.forEach((r) => { r.ratio = (r.now / newMed) / (r.old / oldMed); });
    console.log(`\n## ${label} — 파티 ${rows.length}개`);
    console.log(`중앙값 옛 ${oldMed.toFixed(2)} / 새 ${newMed.toFixed(2)} (배율 ${(newMed / oldMed).toFixed(3)}), 순위 상관 ${spearman(rows.map((r) => r.old), rows.map((r) => r.now)).toFixed(3)}`);
    const changed = rows.filter((r) => Math.abs(r.old - r.now) > 1e-9).length;
    console.log(`값이 바뀐 파티 ${changed}개`);
    const list = rows.slice().sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)));
    (showAll ? list : list.slice(0, 15)).forEach((r) => {
      console.log(`  ${r.old.toFixed(2).padStart(8)} → ${r.now.toFixed(2).padStart(8)}  (중앙값 대비 ×${r.ratio.toFixed(2)})  ${name(r.ids)}`);
    });

    const recOld = oldApp.recommend(), recNew = newApp.recommend();
    const recName = (rec) => (rec?.teams || rec || []).slice?.(0, 6).map((t) => name((t.slots || t).filter(Boolean))) || [];
    console.log("  자동 추천 (옛):", recName(recOld).join(" | ") || "-");
    console.log("  자동 추천 (새):", recName(recNew).join(" | ") || "-");
  }
} finally {
  execFileSync("git", ["worktree", "remove", "--force", base]);
  fs.rmSync(tmp, { recursive: true, force: true });
}
