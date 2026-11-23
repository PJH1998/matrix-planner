import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

// 1.5.1: 무기 설명 첫 문장의 조건 없는 스탯 증가(공격력 12~24% 등)는 비전투 캐릭터 정보창에 들어간다. 재련 단계마다 값이 다르다
test("무기 상시 패시브를 재련 단계별로 최종 스탯에 넣는다", () => {
  const app = loadCurrentApp();
  const echoes = [{ cost: 4, main: { k: "cr", v: 22 }, subs: [] }];
  const atkAt = ref => { app.reset({ growth: { hiyuki: { wid: 21020086, ref, echoes } } }); return app.echoBuild("hiyuki"); };
  const r1 = atkAt(1), r5 = atkAt(5);
  // 서린 불꽃: 공격력 12% → 24%. 기본 공격력(공명자 + 무기) × 12%만큼 차이가 난다
  closeTo(r5.atk - r1.atk, 1051 * 0.12);
  // 공명 효율 무기(부동의 안개 12.8~25.6%)
  app.reset({ growth: { lily: { wid: 21030015, ref: 5, echoes } } });
  const er5 = app.echoBuild("lily").er;
  app.reset({ growth: { lily: { wid: 21030015, ref: 1, echoes } } });
  closeTo(er5 - app.echoBuild("lily").er, 12.8);
});

test("체험 세팅도 장착 무기·재련에 따라 스탯이 바뀐다", () => {
  const app = loadCurrentApp();
  app.reset({ growth: { hiyuki: { wid: 21020086, ref: 1 } } });
  const r1 = app.finalStats("hiyuki").atk;
  app.reset({ growth: { hiyuki: { wid: 21020086, ref: 5 } } });
  assert.ok(app.finalStats("hiyuki").atk > r1);
});

// 1.5.1: 「해킹 · 이탈」도 조화도 이탈이다 → 조화도 파괴 강화의 "조화도 이탈 부여 시" 효과를 받는다
test("루시·레베카(해킹)는 조화도 이탈 서킷 효과를 받는다", () => {
  const app = loadCurrentApp();
  const team = { slots: ["lucy", "rebecca", "baizhi"], buff: "tune" };
  const r = app.teamCalc(team);
  // 보관한 3.7 주기의 조화도 파괴 강화: 조화도 이탈 +25%(파티 전원) + 해킹 이탈 공명자 +30%
  closeTo(r.total / r.base, 1.55, 1e-9);
});

// 1.5.1: 공명 모드는 파티 칸 배지에서 직접 고를 수 있다. 고르지 않으면 자동(파티 조합에 가장 좋은 모드)
test("파티에 고른 공명 모드를 그대로 쓰고, 고르지 않은 공명자만 자동으로 고른다", () => {
  const app = loadCurrentApp();
  const slots = ["aemeath", "lynae", "mornye"];
  const auto = app.teamCalc({ slots, buff: null }).modes;
  for (const mode of [0, 1]) {
    const r = app.teamCalc({ slots, buff: null, modes: { aemeath: mode } });
    assert.equal(r.modes.aemeath, mode);
    assert.equal(r.modes.lynae, auto.lynae);
  }
  // 번호가 맞지 않거나 파티에 없는 공명자의 선택은 무시한다
  assert.deepEqual(app.teamCalc({ slots, buff: null, modes: { aemeath: 9, denia: 1 } }).modes, auto);
});

test("저장할 때 파티 칸에 있는 공명자의 모드 선택만 남긴다", () => {
  const app = loadCurrentApp();
  const normalized = app.normalize({ teams: [
    { slots: ["aemeath", "lynae", "mornye"], buff: "tune", modes: { aemeath: 1, denia: 0, lynae: "x" } },
    { slots: ["hiyuki", null, null], buff: null, modes: {} },
  ] });
  assert.deepEqual(normalized.teams[0], { slots: ["aemeath", "lynae", "mornye"], buff: "tune", example: false, modes: { aemeath: 1 } });
  assert.deepEqual(normalized.teams[1], { slots: ["hiyuki", null, null], buff: null, example: false });
});

// 1.6.6: 이잘키 기준 스탯은 최고 무기를 낀 정보창 값이다. 내 스탯에는 장착 무기의 상시 속성 피해가 들어가므로
// 기준 속성 피해에도 최고 무기(기준 재련)의 상시 속성 피해를 넣어야 두 번 세지 않는다
test("기준 속성 피해에 최고 무기의 상시 속성 피해를 넣는다", () => {
  const app = loadCurrentApp();
  // 여우의 별자리: 이잘키 3코 속성 1개(30) + 세트 10 + 옥궐에 피는 꽃 상시 전도 피해 12
  closeTo(app.elRef("hsin"), 52);
  // 최고 무기에 상시 속성 피해가 없으면 그대로(히유키: 3코 속성 1개 + 세트)
  closeTo(app.elRef("hiyuki"), app.ijk("hiyuki").el * 30 + 10);
  // 최고 무기를 끼고 기준과 같은 정보창 스탯이면 공명력 100 — 상시 효과 12%를 덤으로 받지 않는다
  app.reset({ growth: { hsin: { chain: 0, wid: 21050116, ref: 1, stats: { atk: 2400, cr: 75, cd: 260, b: { el: 52 } } } } });
  closeTo(app.charScore("hsin"), 100, 1e-6);
});
