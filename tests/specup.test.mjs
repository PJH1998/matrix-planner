import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

// 1.4 스펙업 효율: 에코를 새로 깎았을 때 지금보다 좋아질 확률 × 상승폭 (공식 확률 공시 기준)
const E = (cost, k, v, subs) => ({ cost, lv: 25, main: { k, v }, subs: subs.map(([key, value]) => ({ k: key, v: value })) });
const MID = [
  E(4, "cr", 22, [["cd", 15], ["atk%", 7.9], ["hp", 430], ["def", 50], ["er", 8.4]]),           // 약한 4코
  E(3, "el", 30, [["cr", 8.7], ["cd", 17.4], ["atk%", 9.4], ["basic", 8.6], ["atk", 40]]),     // 좋은 3코
  E(3, "el", 30, [["cr", 6.3], ["def%", 10], ["hp%", 7.9], ["lib", 7.1], ["er", 9.2]]),        // 나쁜 3코
  E(1, "atk%", 18, [["cr", 7.5], ["cd", 13.8], ["atk%", 8.6], ["skill", 7.9], ["er", 6.8]]),   // 좋은 1코
  E(1, "atk%", 18, [["cd", 12.6], ["hp", 360], ["def", 40], ["atk", 30], ["heavy", 7.1]]),     // 나쁜 1코
];
const N = 600;

test("부옵 수치 확률은 공식 확률 공시와 같다", () => {
  const app = loadCurrentApp();
  const pct = key => app.specUpOdds(key).map(t => +(t.p * 100).toFixed(4));
  assert.deepEqual(pct("cr"), [23.3333, 23.3333, 23.3333, 8, 8, 8, 3, 3]);
  assert.deepEqual(pct("cd"), pct("cr"));
  assert.deepEqual(pct("er"), [6.7961, 7.767, 20.3883, 24.2718, 17.4757, 14.5631, 5.8252, 2.9126]);
  for (const key of ["atk%", "hp%", "def%", "basic", "heavy", "skill", "lib", "hp"]) assert.deepEqual(pct(key), pct("er"), key);
  assert.deepEqual(pct("atk"), [6.7961, 52.4272, 37.8641, 2.9126]);
  assert.deepEqual(pct("def"), [14.5631, 44.6602, 32.0388, 8.7379]);
  assert.deepEqual(app.specUpOdds("atk").map(t => t.v), [30, 40, 50, 60]);
});

test("새 에코 부옵은 13종에서 겹치지 않게 5개, 종류마다 같은 확률", () => {
  const app = loadCurrentApp();
  const rolls = app.specUpRoll(7, 6000), count = {};
  for (const subs of rolls) {
    assert.equal(subs.length, 5);
    assert.equal(new Set(subs.map(s => s.k)).size, 5);
    subs.forEach(s => count[s.k] = (count[s.k] || 0) + 1);
  }
  assert.equal(Object.keys(count).length, 13);
  // 한 에코에 특정 종류가 있을 확률 = 5/13 ≈ 38.5%
  for (const [key, n] of Object.entries(count)) assert.ok(Math.abs(n / 6000 - 5 / 13) < 0.025, `${key} ${n / 6000}`);
  // 크리티컬 6.3/6.9/7.5가 70%
  const cr = rolls.flat().filter(s => s.k === "cr");
  assert.ok(Math.abs(cr.filter(s => s.v <= 7.5).length / cr.length - 0.7) < 0.04);
});

test("나쁜 에코일수록 바꿀 효율이 높고, 계산 뒤 저장 데이터는 그대로다", () => {
  const app = loadCurrentApp();
  app.reset({ growth: { camellya: { echoes: MID } } });
  const before = JSON.stringify(app.state());
  const r = app.specUpChar("camellya", N);
  assert.equal(JSON.stringify(app.state()), before);
  assert.equal(r.slots.length, 5);
  const at = i => r.slots.find(s => s.index === i);
  assert.ok(at(4).eff > at(3).eff, "나쁜 1코 > 좋은 1코");
  assert.ok(at(2).eff > at(1).eff, "나쁜 3코 > 좋은 3코");
  assert.ok(at(4).p > 0.4 && at(1).p < 0.02);
  for (const s of r.slots) {
    assert.ok(Math.abs(s.eff - s.p * s.gain) < 1e-9);
    assert.equal(s.effT, undefined); // 파티 총점은 보지 않는다
    if (s.p > 0) assert.ok(Math.abs(s.tries - 1 / s.p) < 1e-9);
  }
  // 같은 입력이면 같은 결과 (고정 시드) — 새로 불러온 앱에서 다시 계산
  const again = loadCurrentApp();
  again.reset({ growth: { camellya: { echoes: MID } } });
  assert.deepEqual(again.specUpChar("camellya", N), r);
});

test("공명자 스펙만 본다: 파티 편성·파워 서킷이 달라도 결과가 같다", () => {
  const solo = loadCurrentApp();
  solo.reset({ growth: { camellya: { echoes: MID } } });
  const inTeam = loadCurrentApp();
  inTeam.reset({ growth: { camellya: { echoes: MID } }, teams: [{ slots: ["camellya", "sanhua", "verina"], buff: "general" }, { slots: ["hiyuki", "lucilla", "suisui"], buff: "negative" }] });
  assert.deepEqual(inTeam.specUpChar("camellya", N), solo.specUpChar("camellya", N));
});

test("공명 효율 최소치를 채우고 있으면, 그걸 깨는 에코는 좋아진 것으로 보지 않는다", () => {
  const app = loadCurrentApp();
  // 카멜리아 최소치 120, 지금 124.4 — 공명 효율 부옵이 있는 칸(0·2·3번)은 바꾸면 최소치를 깰 수 있다
  app.reset({ growth: { camellya: { echoes: MID } } });
  assert.equal(app.erOk("camellya"), true);
  const gated = app.specUpChar("camellya", N);
  // 같은 에코에서 공명 효율 부옵만 빼면(최소치 미달) 제한이 없어 확률이 오른다
  const noEr = MID.map(e => ({ ...e, subs: e.subs.map(s => s.k === "er" ? { k: "def", v: 40 } : s) }));
  app.reset({ growth: { camellya: { echoes: noEr } } });
  assert.equal(app.erOk("camellya"), false);
  const free = app.specUpChar("camellya", N);
  assert.ok(free.slots[2].p > gated.slots[2].p + 0.2, `${free.slots[2].p} vs ${gated.slots[2].p}`);
  // 공명 효율이 모자라도 순위를 올리지 않는다: 점수 상승 기대값으로만 정렬
  assert.equal(free.erOk, false);
});

test("전체 표: 개인 점수 기대 상승 순, 에코 미입력·체험 세팅은 빠진다", () => {
  const app = loadCurrentApp();
  app.reset({
    owned: { camellya: 1, sanhua: 1, verina: 1, hiyuki: 1, suisui: 1, jinhsi: 1, carlotta: 1 },
    growth: { camellya: { echoes: MID }, sanhua: { echoes: MID }, hiyuki: { echoes: MID }, jinhsi: { trial: 1 }, carlotta: { echoes: MID } },
    teams: [{ slots: ["camellya", "sanhua", "verina"], buff: null }, { slots: ["hiyuki", "jinhsi", "suisui"], buff: null }],
  });
  // 편성된 공명자만 고르기 (대상만 고르고 계산에는 파티를 쓰지 않는다)
  const team = app.specUpTable({ scope: "team" }, 300);
  assert.deepEqual(new Set(team.rows.map(r => r.id)), new Set(["camellya", "sanhua", "hiyuki"]));
  assert.deepEqual(team.skipped.map(s => s.id).sort(), ["jinhsi", "suisui", "verina"]);
  assert.deepEqual(team.skipped.find(s => s.id === "jinhsi"), { id: "jinhsi", skip: "trial" });
  // 보유 전체
  const all = app.specUpTable({ scope: "owned" }, 300);
  assert.equal(all.rows.length, 20);
  for (let i = 1; i < all.rows.length; i++) assert.ok(all.rows[i - 1].eff >= all.rows[i].eff);
  // 공명자 화면과 같은 값
  const camellya = app.specUpChar("camellya", 300);
  for (const s of camellya.slots) assert.equal(all.rows.find(r => r.id === "camellya" && r.index === s.index).eff, s.eff);
});

test("공명 모드 공명자는 에코를 입력한 모드마다 따로 계산한다", () => {
  const app = loadCurrentApp();
  const echoMode = MID.map(e => ({ ...e, subs: [] }));
  app.reset({ owned: { lucilla: 1 }, growth: { lucilla: { echoes: MID, alt: { 1: { echoes: echoMode } } } } });
  const frost = app.specUpChar("lucilla", 300, 0), echo = app.specUpChar("lucilla", 300, 1);
  assert.equal(frost.mode, 0);
  assert.equal(echo.mode, 1);
  assert.ok(frost.slots[1].p < 0.05);                 // 서리 모드: 좋은 에코라 잘 안 바뀐다
  assert.ok(echo.slots.every(s => s.p > 0.9));        // 에코 모드: 부옵 없는 에코라 거의 항상 좋아진다
  // 모드를 안 주면 보고 있는 모드
  app.setView("lucilla", 1);
  assert.equal(app.specUpChar("lucilla", 300).mode, 1);
  // 전체 표에는 두 모드가 다 들어간다
  const t = app.specUpTable({ scope: "owned" }, 300);
  assert.deepEqual([...new Set(t.rows.map(r => r.mode))].sort(), [0, 1]);
  // 에코를 입력하지 않은 모드는 빠진다 (체험 세팅으로 계산되므로 깎을 에코가 없다)
  app.reset({ owned: { lucilla: 1 }, growth: { lucilla: { echoes: MID } } });
  assert.deepEqual([...new Set(app.specUpTable({ scope: "owned" }, 300).rows.map(r => r.mode))], [0]);
});

test("결과는 공명자·모드별로 캐싱하고, 육성 데이터가 바뀐 공명자(모드)만 다시 계산한다", () => {
  const app = loadCurrentApp();
  const echoMode = MID.map(e => ({ ...e, subs: [] }));
  const growth = { camellya: { echoes: MID }, sanhua: { echoes: MID }, lucilla: { echoes: MID, alt: { 1: { echoes: echoMode } } } };
  const owned = { camellya: 1, sanhua: 1, lucilla: 1 }, IDS = ["camellya", "sanhua", "lucilla"];
  const clone = x => JSON.parse(JSON.stringify(x));
  app.reset({ owned, growth: clone(growth) });
  const first = app.specUpTable({ ids: IDS }, 200);
  assert.equal(app.specUpComputes(), 4);                     // 카멜리아, 산화, 루실라(서리), 루실라(에코)
  app.specUpTable({ ids: IDS }, 200);
  app.specUpChar("camellya", 200);
  assert.equal(app.specUpComputes(), 4);                     // 그대로면 다시 계산하지 않는다
  // 파티 편성·다른 공명자 변경은 영향 없음
  app.reset({ owned, growth: clone(growth), teams: [{ slots: ["camellya", "sanhua", "verina"], buff: "general" }] });
  assert.deepEqual(app.specUpTable({ ids: IDS }, 200).rows, first.rows);
  assert.equal(app.specUpComputes(), 4);
  // 산화 에코 한 칸 수정 → 산화만
  const g2 = clone(growth); g2.sanhua.echoes[4].subs[0] = { k: "cr", v: 10.5 };
  app.reset({ owned, growth: g2 });
  app.specUpTable({ ids: IDS }, 200);
  assert.equal(app.specUpComputes(), 5);
  // 루실라 에코 모드 에코만 수정 → 루실라(에코)만
  g2.lucilla.alt[1].echoes[0] = { ...g2.lucilla.alt[1].echoes[0], subs: [{ k: "cd", v: 21 }] };
  app.reset({ owned, growth: g2 });
  app.specUpTable({ ids: IDS }, 200);
  assert.equal(app.specUpComputes(), 6);
  // 공통 데이터(체인) 수정 → 그 공명자의 모든 모드
  g2.lucilla.chain = 2;
  app.reset({ owned, growth: g2 });
  app.specUpTable({ ids: IDS }, 200);
  assert.equal(app.specUpComputes(), 8);
});
