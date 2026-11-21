import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

// 1.4 공명 모드: 루실라·에이메스·데니아·여우의 별자리·린네는 모드마다 반주·메커니즘·에코 세팅을 따로 갖는다
test("공명 모드 공명자와 게임 공식 명칭", () => {
  const app = loadCurrentApp();
  assert.deepEqual(app.modeIds(), ["lucilla", "aemeath", "denia", "hsin", "lynae"]);
  const names = id => app.modes(id).map(m => m.name);
  assert.deepEqual(names("lucilla"), ["공명 모드 · 서리", "공명 모드 · 에코"]);
  assert.deepEqual(names("aemeath"), ["공명 모드 · 조화 파동", "공명 모드 · 불꽃"]);
  assert.deepEqual(names("denia"), ["공명 모드 · 불꽃", "공명 모드 · 조화 밀집"]);
  assert.deepEqual(names("hsin"), ["공명 모드 · 합일", "공명 모드 · 전자"]);
  assert.deepEqual(names("lynae"), ["공명 모드 · 조화 파동", "공명 모드 · 조화 밀집"]);
  assert.deepEqual(app.modes("lucilla").map(m => m.short), ["서리", "에코"]);
  assert.ok(app.modes("hsin").every(m => m.icon));
});

test("모드마다 메커니즘과 반주가 따로다 (두 모드를 동시에 갖지 않는다)", () => {
  const app = loadCurrentApp();
  assert.deepEqual(app.inModes({ lucilla: 0 }, "syn", "lucilla").m, ["frost"]);
  assert.deepEqual(app.inModes({ lucilla: 1 }, "syn", "lucilla").m, ["echo"]);
  assert.deepEqual(app.inModes({ lynae: 0 }, "syn", "lynae").m, ["tuneW"]);
  assert.deepEqual(app.inModes({ lynae: 1 }, "syn", "lynae").m, ["tuneD"]);
  assert.equal(app.inModes({ lucilla: 0 }, "syn", "lucilla").p, 1);   // 서리: 적 디버프(파티 전체)
  assert.equal(app.inModes({ lucilla: 1 }, "syn", "lucilla").p, undefined); // 에코: 다음 캐릭터
});

test("에코 세팅은 모드마다 따로 저장하고, 첫 모드는 기존 저장 위치를 그대로 쓴다", () => {
  const app = loadCurrentApp();
  const echo = (cost, set) => ({ cost, lv: 25, main: { k: "cr", v: 22 }, subs: [], set });
  app.reset({ growth: { lucilla: {
    echoes: [echo(4)],
    alt: { 1: { echoes: [echo(4), echo(4)], echoSet: { mode: "5", a: "떠오르는 구름" } } },
  } } });
  assert.equal(app.inModes({ lucilla: 0 }, "echoes", "lucilla").length, 1);
  assert.equal(app.inModes({ lucilla: 1 }, "echoes", "lucilla").length, 2);
  // 기본 세트도 모드별 (서리 → 기도의 눈, 에코 → 떠오르는 구름)
  assert.equal(app.inModes({ lucilla: 0 }, "echoSet", "lucilla").a, "소리 없이 내려앉은 기도의 눈");
  assert.equal(app.inModes({ lucilla: 1 }, "echoSet", "lucilla").a, "떠오르는 구름");
  // 에코가 없는 모드는 체험 세팅 기준 스탯으로 계산한다
  app.reset({ growth: { lucilla: { echoes: [echo(4)] } } });
  assert.equal(app.inModes({ lucilla: 1 }, "echoes", "lucilla").length, 0);
});

// 1.4.2: 한 모드에만 에코를 넣으면, 빈 모드(체험 세팅 스탯)가 더 강하게 나와 뽑히던 문제
test("에코를 넣은 모드가 있으면 그 모드들 중에서만 고른다", () => {
  const app = loadCurrentApp();
  const set = "꿈으로 세상을 비추는 마음", sub = [{ k: "cr", v: 3 }, { k: "cd", v: 6 }];
  const echo = (cost, main) => ({ cost, lv: 25, main, subs: sub, set });
  const weak = [echo(4, { k: "cr", v: 22 }), echo(3, { k: "el", v: 30, elem: "electro" }), echo(3, { k: "el", v: 30, elem: "electro" }), echo(1, { k: "atk%", v: 18 }), echo(1, { k: "atk%", v: 18 })];
  const modes = (slots, buff) => app.teamCalc({ slots, buff }).modes;
  const buffs = [null, "general", "negative", "basic", "tune"];
  // 합일에만 에코 → 어느 서킷이든 합일 (빈 전자 모드는 체험 세팅이라 더 강하게 나왔다)
  app.reset({ growth: { hsin: { echoes: weak } } });
  assert.ok(app.inModes({ hsin: 1 }, "charScore", "hsin") > app.inModes({ hsin: 0 }, "charScore", "hsin"));
  for (const buff of buffs) assert.deepEqual(modes(["hsin", "suoming", "lily"], buff), { hsin: 0 }, String(buff));
  // 전자에만 에코 → 전자
  app.reset({ growth: { hsin: { alt: { 1: { echoes: weak } } } } });
  assert.deepEqual(modes(["hsin", "suoming", "lily"], "basic"), { hsin: 1 });
  // 두 모드 다 넣으면 다시 둘 다 비교한다
  app.reset({ growth: { hsin: { echoes: weak, alt: { 1: { echoes: weak } } } } });
  assert.deepEqual(modes(["rover_e", "hsin", "suisui"], "negative"), { hsin: 1 });
  assert.deepEqual(modes(["hsin", "suoming", "lily"], "basic"), { hsin: 0 });
});

test("파티 계산은 조합에 가장 좋은 모드를 고른다", () => {
  const app = loadCurrentApp();
  const modes = (slots, buff = null) => app.teamCalc({ slots, buff }).modes;
  assert.deepEqual(modes(["camellya", "sanhua", "verina"]), {});
  assert.deepEqual(modes(["hiyuki", "lucilla", "suisui"]), { lucilla: 0 });
  assert.deepEqual(modes(["hsin", "suoming", "lily"], "basic"), { hsin: 0 });       // 합일 서킷 → 합일
  assert.deepEqual(modes(["rover_e", "hsin", "suisui"], "negative"), { hsin: 1 });  // 이상 효과 서킷 → 전자
  // 메커니즘 시너지 보너스 때문에 실제 버프를 잃는 모드를 고르지 않는다 (모니에는 조화 파동·조화 밀집 둘 다)
  assert.deepEqual(modes(["aemeath", "lynae", "mornye"]), { aemeath: 0, lynae: 0 });
  assert.deepEqual(modes(["aemeath", "lynae", "mornye"], "negative"), { aemeath: 1, lynae: 0 });
  assert.deepEqual(modes(["chisa", "aemeath", "denia"], "tune"), { aemeath: 1, denia: 1 });
});

test("고른 모드가 다른 모드보다 강도가 낮지 않다", () => {
  const app = loadCurrentApp();
  for (const [slots, buff] of [[["aemeath", "lynae", "mornye"], "tune"], [["hsin", "suoming", "lily"], "negative"], [["qingxiao", "denia", "mornye"], "tune"]]) {
    const team = { slots, buff };
    const chosen = app.teamCalc(team).total;
    const ids = slots.filter(id => app.modeIds().includes(id));
    const combos = ids.reduce((all, id) => all.flatMap(m => app.modes(id).map(x => ({ ...m, [id]: x.i }))), [{}]);
    const best = Math.max(...combos.map(m => app.inModes(m, "teamCalcRaw", team)).map(r => r.total / (1 + r.syn / 100)));
    const chosenRaw = app.teamCalc(team);
    assert.ok(chosenRaw.total / (1 + chosenRaw.syn / 100) >= best - 1e-9, slots.join("/"));
    assert.ok(chosen > 0);
  }
});

test("파티 전체 반주 중 본인 제외(noSelf)와 모드별 추천 조합", () => {
  const app = loadCurrentApp();
  const aemeath = app.teamCalc({ slots: ["aemeath", "lynae", "mornye"], buff: null });
  assert.ok(!aemeath.links.some(l => l.from === "aemeath" && l.to === "aemeath"));
  // 조화 파동 모드 에이메스의 반주: 조화 파동 · 이탈을 거는 파티원은 +20%, 아니면 +10%
  assert.ok(aemeath.links.some(l => l.from === "aemeath" && l.to === "lynae" && Math.abs(l.e - 0.2) < 1e-9));
  // 여우의 별자리가 전자 모드면 「합일」 추천 조합으로 보지 않는다
  assert.ok(app.inModes({ hsin: 0 }, "teamCalcRaw", { slots: ["hsin", "suoming", "lily"], buff: null }).syn
    > app.inModes({ hsin: 1 }, "teamCalcRaw", { slots: ["hsin", "suoming", "lily"], buff: null }).syn);
});
