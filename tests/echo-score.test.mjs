import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

// 에코 점수: 부옵 한 줄 = 수치 ÷ 최대 수치, × 공명자별 가중치 × 4 (× 보정), 에코 5개 100점 만점 · 6등급
const E = (cost, k, v, subs, elem) => ({ cost, lv: 25, main: Object.assign({ k, v }, elem ? { elem } : {}), subs: subs.map(([key, value]) => ({ k: key, v: value })) });
const JUNK = [["hp", 580], ["def", 70], ["def%", 14.7], ["hp%", 11.6]];
const setOf = (el, subs) => [E(4, "cd", 44, subs[0]), E(3, "el", 30, subs[1], el), E(3, "el", 30, subs[2], el), E(1, "atk%", 18, subs[3]), E(1, "atk%", 18, subs[4])];
const score = (app, id, echoes, growth = {}) => { app.reset({ owned: { [id]: true }, growth: { [id]: Object.assign({ echoes }, growth) } }); return app.echoScore(id); };

test("등급은 높은 순서 6개, 점수 경계에서 바뀐다", () => {
  const app = loadCurrentApp();
  const grades = app.echoGrades();
  assert.deepEqual(grades.map(g => g.name), ["어자", "명식", "해일", "노도", "거랑", "경파"]);
  for (let i = 1; i < grades.length; i++) assert.ok(grades[i - 1].min > grades[i].min);
  assert.equal(grades.at(-1).min, 0);
});

test("에코가 없으면 점수 없음, 쓸모없는 부옵만 있으면 0점·경파", () => {
  const app = loadCurrentApp();
  app.reset({ owned: { hiyuki: true } });
  assert.equal(app.echoScore("hiyuki"), null);
  const s = score(app, "hiyuki", setOf("glacio", Array(5).fill(JUNK)));
  assert.equal(s.total, 0);
  assert.equal(s.grade.name, "경파");
  assert.equal(s.count, 5);
});

test("에코 한 개는 20점, 총점은 칸 점수의 합이고 100점을 넘지 않는다", () => {
  const app = loadCurrentApp();
  const best = [["cd", 21], ["atk%", 11.6], ["lib", 11.6], ["cr", 10.5], ["er", 12.4]];
  const s = score(app, "hiyuki", setOf("glacio", Array(5).fill(best)));
  s.slots.forEach(x => assert.ok(x.score <= 20 + 1e-9, `${x.score}`));
  assert.ok(Math.abs(s.total - s.slots.reduce((a, x) => a + x.score, 0)) < 1e-9 || s.total === 100);
  assert.ok(s.total <= 100);
  // 크리티컬 피해 최대치 한 줄 = 4점 (가중치 1, 보정 1 이상)
  const one = score(app, "hiyuki", setOf("glacio", [[["cd", 21], ...JUNK], JUNK, JUNK, JUNK, JUNK]));
  assert.ok(one.slots[0].score >= 4 - 1e-9 && one.slots[0].score <= 5, `${one.slots[0].score}`);
});

test("크리티컬은 목표치까지만 1, 넘는 부분은 0.25 · 크리티컬 피해는 항상 1", () => {
  const app = loadCurrentApp();
  const low = score(app, "hiyuki", setOf("glacio", [[["cr", 6.3], ...JUNK], JUNK, JUNK, JUNK, JUNK]));
  assert.equal(low.weights.cr, 1);
  const high = score(app, "hiyuki", setOf("glacio", Array(5).fill([["cr", 10.5], ...JUNK])));
  assert.ok(high.weights.cr < 1 && high.weights.cr > 0.25, `${high.weights.cr}`);
  assert.equal(high.weights.cd, 1);
});

test("피해 보너스는 그 공격의 피해 비중만큼 (60% 이상이면 1)", () => {
  const app = loadCurrentApp();
  const hiyuki = score(app, "hiyuki", setOf("glacio", Array(5).fill(JUNK))).weights;
  assert.equal(hiyuki.lib, 1);                       // 공명 해방 비중이 큰 공명자
  assert.ok((hiyuki.basic || 0) < 0.1);
  const zhezhi = score(app, "zhezhi", setOf("glacio", Array(5).fill(JUNK))).weights;
  assert.equal(zhezhi.basic, 1);                     // 일반 공격 비중이 큰 공명자
});

test("주력 스탯 고정 수치는 %로 바꾼 값만큼, 쓰지 않는 스탯은 0", () => {
  const app = loadCurrentApp();
  const w = score(app, "hiyuki", setOf("glacio", Array(5).fill(JUNK))).weights;
  assert.equal(w["atk%"], 1);
  assert.ok(w.atk > 0.3 && w.atk < 0.7, `${w.atk}`);
  assert.equal(w["hp%"] || 0, 0);
  assert.equal(w["def%"] || 0, 0);
});

test("공명 효율은 최소치까지만 센다", () => {
  const app = loadCurrentApp();
  const need = score(app, "hiyuki", setOf("glacio", [[["er", 6.8], ...JUNK], JUNK, JUNK, JUNK, JUNK]));
  assert.equal(need.weights.er, 1);
  const over = score(app, "hiyuki", setOf("glacio", Array(5).fill([["er", 12.4], ...JUNK])));
  assert.ok(over.weights.er < 1, `${over.weights.er}`);
});

test("서포터는 지원 기준 스탯·공명 효율을 세고, 유효 부옵 종류가 적은 만큼 보정한다", () => {
  const app = loadCurrentApp();
  const sup = [E(4, "cr", 22, [["hp%", 11.6], ["er", 12.4], ["hp", 580], ["cd", 21], ["atk%", 11.6]]), E(3, "er", 32, [["hp%", 11.6], ["er", 6.8]]), E(3, "hp%", 30, [["hp%", 9.4]]), E(1, "hp%", 22.8, [["hp%", 8.6]]), E(1, "hp%", 22.8, [["hp%", 7.9]])];
  const s = score(app, "suisui", sup);
  assert.ok(s.total > 0);
  assert.equal(s.weights["hp%"], 1);
  assert.equal(s.weights.cd || 0, 0);               // 크리티컬 피해 추천이 없는 서포터
  assert.equal(s.weights["atk%"] || 0, 0);
  assert.ok(s.norm > 1, `${s.norm}`);
  s.slots.forEach(x => assert.ok(x.score <= 20 + 1e-9));
});
