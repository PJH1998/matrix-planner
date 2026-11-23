import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

// 파티별 숙련도: team.skill이 있으면 그 파티만 그 배율, 없으면 전체 숙련도(state.skill)를 따른다
test("파티에 고른 숙련도는 그 파티의 보스 피해에만 반영된다", () => {
  const app = loadCurrentApp();
  const team = { slots: ["aemeath", "lynae", "mornye"], buff: null };
  const dealt = (skill, teamSkill) => {
    app.reset({ skill });
    const run = app.simulate([teamSkill ? { ...team, skill: teamSkill } : team]);
    return run.progress;
  };
  const top = dealt("top"), good = dealt("good");
  assert.ok(good < top);
  // 전체가 숙련이어도 파티에 보통을 고르면 전체 보통과 같다
  assert.equal(dealt("top", "good"), good);
  // 전체가 보통이어도 파티에 숙련을 고르면 전체 숙련과 같다
  assert.equal(dealt("good", "top"), top);
});

test("숙련도 단계: 장인 ×1 · 숙련 ×0.9 · 보통 ×0.8 · 뉴비 ×0.65", () => {
  const app = loadCurrentApp();
  const team = { slots: ["aemeath", "lynae", "mornye"], buff: null };
  app.reset({ skill: "top" });
  const hp = app.simulate([team]).res[0].hits[0].from - app.simulate([team]).res[0].hits[0].left;
  for (const [skill, mul] of [["skilled", 0.9], ["good", 0.8], ["normal", 0.65]]) {
    app.reset({ skill });
    const hit = app.simulate([team]).res[0].hits[0];
    assert.ok(Math.abs((hit.from - hit.left) - hp * mul) < 1e-6, skill);
  }
});

test("저장할 때 파티 숙련도는 알맞은 값만 남긴다", () => {
  const app = loadCurrentApp();
  const normalized = app.normalize({ teams: [
    { slots: ["hiyuki", null, null], buff: null, skill: "normal" },
    { slots: [null, null, null], buff: null, skill: "x" },
  ] });
  assert.equal(normalized.teams[0].skill, "normal");
  assert.ok(!("skill" in normalized.teams[1]));
});
