import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

// 폭주의 고릴라: 조화도 파괴는 누구나 한다. 평균 중첩은 파티 부조화 수치 누적 효율 증가(모니에)에 따라 늘어난다
test("조화도 파괴 중첩은 모니에의 부조화 수치 누적 효율 증가를 반영한다", () => {
  const app = loadCurrentApp();
  app.reset({});
  const boss = { name: "테스트", effects: [{ dmg: 50, up: 0.5, upBy: "offTune" }] };
  const mul = slots => app.bossMul({ slots, buff: null }, boss);
  const m = (slots, modes) => app.bossMul({ slots, buff: null, modes }, boss);
  near(mul(["camellya", "sanhua", "verina"]), 1.25);
  near(mul(["camellya", "sanhua", "mornye"]), 1.375); // 모니에 +50%
  near(m(["qingxiao", "denia", "shorekeeper"], { denia: 0 }), 1.25); // 데니아 불꽃 모드: 없음
  near(m(["qingxiao", "denia", "shorekeeper"], { denia: 1 }), 1.3125); // 데니아 조화 밀집 모드 +25%
  near(m(["qingxiao", "denia", "mornye"], { denia: 1 }), 1.4375); // +75%
  app.reset({ growth: { mornye: { chain: 2 }, denia: { chain: 2 } } });
  near(m(["camellya", "sanhua", "mornye"]), 1.425); // 모니에 2체인 +70%
  near(m(["qingxiao", "denia", "mornye"], { denia: 1 }), 1.5); // +120% → 유지율 최대 1
});

// 시길룸 「항로 이탈」: 이름이 다른 에코 어빌리티 수만큼 중첩 (공명자 1명당 1 + 스킬이 에코 어빌리티로 간주되는 횟수)
test("항로 이탈 중첩은 이름이 다른 에코 어빌리티 수를 센다", () => {
  const app = loadCurrentApp();
  app.reset({});
  const boss = { name: "테스트", effects: [{ stack: { per: 10, max: 5, full: 30 } }] };
  const mul = (slots, modes) => app.bossMul({ slots, buff: null, modes }, boss);
  near(mul(["camellya", "sanhua", "verina"]), 1.3);            // 3중첩
  near(mul(["phrolova", "sanhua", "verina"]), 1.4);            // 4중첩
  near(mul(["phrolova", "cantarella", "shorekeeper"]), 1.8);   // 5중첩 + 30%
  near(mul(["phrolova", "cantarella", "roccia"]), 1.8);        // 최대 5중첩
  near(mul(["lucilla", "sanhua", "verina"], { lucilla: 1 }), 1.8); // 루실라 에코 모드: 망각마다 다른 에코로 간주
});
