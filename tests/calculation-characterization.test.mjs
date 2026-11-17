import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("기본 캐릭터 데이터와 대표 강도 결과를 고정한다", () => {
  const app = loadCurrentApp();

  assert.equal(app.defaults().length, 61);
  closeTo(app.charScore("hiyuki"), 24.53671935741852);
  closeTo(app.charScore("cantarella"), 10.7757309240752);
  closeTo(app.charScore("shorekeeper"), 14);
  closeTo(app.charScore("jinhsi"), 20.73074553444892);

  assert.deepEqual(app.reference("hiyuki"), {
    sets: [["소리 없이 내려앉은 기도의 눈", 5]],
    er: { min: 120, src: "ijk", note: "120~125", adj: [] },
  });
  assert.deepEqual(app.reference("shorekeeper"), {
    sets: [["찬란한 광휘", 5]],
    er: { min: 240, src: "ijk", note: "'오류' 메인 에코면 230", adj: [] },
  });
});

test("대표 파티의 메인 딜러와 점수를 고정한다", () => {
  const app = loadCurrentApp();
  const teams = app.state().teams.slice(0, 4);
  const expected = [
    ["camellya", 34.380284147988995, 44.84040671627511],
    ["qingxiao", 75.33065376847804, 94.16331721059755],
    ["jingran", 62.55804829902035, 69.95459127620904],
    ["hsin", 74.83198996779488, 114.85260245008205],
  ];

  teams.forEach((team, index) => {
    const result = app.teamCalc(team);
    assert.equal(result.main, expected[index][0]);
    closeTo(result.base, expected[index][1]);
    closeTo(result.total, expected[index][2]);
  });

  const simulation = app.simulate(teams);
  closeTo(simulation.progress, 6.972692104553951);
  closeTo(simulation.total, 43991.44975594108);
  assert.equal(simulation.bad, 0);
});

test("에코 5세트의 스탯과 강도 환산 결과를 고정한다", () => {
  const app = loadCurrentApp();
  const set = "소리 없이 내려앉은 기도의 눈";
  const echo = (cost, main, subs) => ({ cost, lv: 25, main, subs, set });
  const echoes = [
    echo(4, { k: "cr", v: 22 }, [{ k: "cd", v: 21 }, { k: "atk%", v: 8.6 }, { k: "er", v: 9.2 }]),
    echo(3, { k: "el", v: 30, elem: "glacio" }, [{ k: "cr", v: 8.7 }, { k: "cd", v: 17.4 }, { k: "atk%", v: 9.4 }]),
    echo(3, { k: "el", v: 30, elem: "glacio" }, [{ k: "cr", v: 7.5 }, { k: "cd", v: 18.6 }, { k: "lib", v: 9.4 }]),
    echo(1, { k: "atk%", v: 18 }, [{ k: "cr", v: 6.9 }, { k: "cd", v: 16.2 }, { k: "atk", v: 50 }]),
    echo(1, { k: "atk%", v: 18 }, [{ k: "cr", v: 8.1 }, { k: "cd", v: 19.8 }, { k: "er", v: 10.8 }]),
  ];

  app.reset({ growth: { hiyuki: { lv: 90, chain: 0, echoSet: { mode: "5", a: set }, echoes } } });
  const build = app.echoBuild("hiyuki");
  const factor = app.echoFactor("hiyuki");

  closeTo(build.atk, 2144.66);
  closeTo(build.cr, 105.5);
  closeTo(build.cd, 243);
  closeTo(build.er, 120);
  closeTo(build.el, 79);
  assert.deepEqual(build.sets, [{ name: set, c: 5, on: [2, 5] }]);
  closeTo(factor.f, 1.0618522907147732);
  closeTo(app.charScore("hiyuki"), 26.054371656300372);
});

test("기존 저장 데이터의 정규화 규칙을 고정한다", () => {
  const app = loadCurrentApp();
  const normalized = app.normalize({
    teams: [{ slots: ["hiyuki", 3, null], buff: 4 }],
    sortV: 1,
    rosterView: "profile",
    growth: null,
  });

  assert.deepEqual(normalized.teams, [{ slots: ["hiyuki", null, null], buff: null, example: false }]);
  assert.deepEqual(normalized.growth, {});
  assert.equal(normalized.rosterSort, "new");
  assert.equal(normalized.rosterView, "profile");
  assert.equal(normalized.sortV, 2);
});

test("기본 보유 캐릭터의 자동 추천 결과를 고정한다", () => {
  const teams = loadCurrentApp().recommend();

  assert.equal(teams.length, 18);
  assert.deepEqual(teams.map(team => `${team.slots.join("/")}:${team.buff}`), [
    "hiyuki/lucilla/suisui:negative", "hsin/suoming/lily:basic", "qingxiao/denia/mornye:negative",
    "aemeath/lynae/mornye:negative", "augusta/iuno/shorekeeper:general", "phrolova/cantarella/roccia:general",
    "cartethyia/ciaccona/rover_a:general", "changli/brant/lupa:general", "xuanling/chisa/suisui:negative",
    "zani/phoebe/shorekeeper:negative", "jingran/lynae/verina:tune", "sigrika/qiuyuan/lily:basic",
    "lucy/rebecca/verina:tune", "carlotta/zhezhi/buling:negative", "xiangliyao/yinlin/buling:negative",
    "camellya/sanhua/baizhi:general", "jinhsi/lumi/baizhi:general", "jiyan/mortefi/jianxin:general",
  ]);
});

test("루시와 레베카의 1+2+2 에코 세트를 순서대로 배정한다", () => {
  const app = loadCurrentApp();
  const expected = {
    mode: "122",
    a: "꿈을 깨뜨리는 망령의 악몽",
    b: "끊임없는 잔향",
    c: "마음을 엮은 꿈의 그림자",
  };
  assert.deepEqual(app.echoSet("lucy"), expected);
  assert.deepEqual(app.echoSet("rebecca"), expected);
  assert.notEqual(app.echoSet("hiyuki").mode, "122");

  const echoes = [
    { cost: 4, main: { k: "cr", v: 22 }, subs: [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 1, main: { k: "atk%", v: 18 }, subs: [] },
    { cost: 1, main: { k: "atk%", v: 18 }, subs: [] },
  ];
  app.reset({ growth: { lucy: { echoes } } });
  assert.deepEqual(app.echoes("lucy").map(echo => echo.set), [expected.a, expected.b, expected.b, expected.c, expected.c]);
  const build = app.echoBuild("lucy");
  assert.deepEqual(build.sets, [
    { name: expected.a, c: 1, on: [1] },
    { name: expected.b, c: 2, on: [2] },
    { name: expected.c, c: 2, on: [2] },
  ]);
  assert.deepEqual(build.fx.map(effect => [effect.set, effect.pc, effect.k, effect.eff]), [
    [expected.a, 1, "basic", 31.5],
    [expected.a, 1, "heavy", 31.5],
  ]);
  closeTo(app.echoFactor("lucy").f, 0.5174585734842625);
  closeTo(app.charScore("lucy"), 9.102381612909657);
});

test("비전투 최종 스탯에 장착 무기 부옵을 포함하고 조건부 세트 효과는 배율에서 제외한다", () => {
  const app = loadCurrentApp();
  const echoes = [
    { cost: 4, main: { k: "heal", v: 26 }, subs: [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 1, main: { k: "hp%", v: 18 }, subs: [] },
    { cost: 1, main: { k: "hp%", v: 18 }, subs: [] },
  ];
  app.reset({ growth: { lily: { wid: 21030076, echoSet: { mode: "5", a: "추억에 붉게 물든 꽃" }, echoes } } });

  const sheet = app.sheetStats("lily");
  closeTo(sheet.er, 177.04);
  closeTo(sheet.hp, 31300.8);
  assert.equal(sheet.atk, 1051);

  const lucy = loadCurrentApp();
  lucy.reset({ growth: { lucy: { echoes: [
    { cost: 4, main: { k: "cr", v: 22 }, subs: [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 1, main: { k: "atk%", v: 18 }, subs: [] },
    { cost: 1, main: { k: "atk%", v: 18 }, subs: [] },
  ] } } });
  assert.ok(lucy.echoBuild("lucy").fx.some(effect => effect.eff > 0));
  closeTo(lucy.echoFactor("lucy").f, 0.5174585734842625);
});

test("서포터 유효 옵션과 릴리 공효 190~260 구간을 실제 최종 공효로 판정한다", () => {
  const app = loadCurrentApp();
  const echoes = er => [
    { cost: 4, main: { k: "heal", v: 26 }, subs: er ? [{ k: "er", v: er }] : [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 3, main: { k: "el", v: 30, elem: "spectro" }, subs: [] },
    { cost: 1, main: { k: "hp%", v: 18 }, subs: [] },
    { cost: 1, main: { k: "hp%", v: 18 }, subs: [] },
  ];
  const team = { slots: ["hsin", "suoming", "lily"], buff: null };

  app.reset({ growth: { lily: { wid: 21030076, echoes: echoes(0) } } });
  closeTo(app.sheetStats("lily").er, 177.04);
  assert.equal(app.teamCalc(team).supx.length, 0);
  assert.equal(app.usefulStat("lily", "er"), true);
  assert.equal(app.usefulStat("lily", "hp%"), true);
  assert.equal(app.usefulStat("lily", "cr"), false);

  app.reset({ growth: { lily: { wid: 21030076, echoes: echoes(82.96) } } });
  closeTo(app.sheetStats("lily").er, 260);
  assert.deepEqual(app.teamCalc(team).supx.map(x => x.e), [0.28, 0.28]);
  assert.equal(app.usefulStat("lily", "er"), false);
  assert.equal(app.usefulStat("mornye", "def%"), true);
  assert.equal(app.usefulStat("mornye", "hp%"), false);
  assert.equal(app.usefulStat("baizhi", "hp%"), true);
});

test("모니에·수수·파수인 버프와 브렌트 전투 공격력이 입력 공효를 따른다", () => {
  const app = loadCurrentApp();
  const buff = (id, er, slots, to) => {
    app.reset({ growth: { [id]: { stats: { er } } } });
    return app.teamCalc({ slots, buff: null }).supx.find(x => x.from === id && x.to === to)?.e || 0;
  };
  const mornyeTeam = ["qingxiao", "denia", "mornye"];
  closeTo(buff("mornye", 100, mornyeTeam, "qingxiao"), 0);
  closeTo(buff("mornye", 260, mornyeTeam, "qingxiao"), 0.4 / 1.9);
  assert.equal(app.usefulStat("mornye", "er"), false);
  buff("mornye", 250, mornyeTeam, "qingxiao");
  assert.equal(app.usefulStat("mornye", "er"), true);
  app.reset({ growth: { mornye: { chain: 1, stats: { er: 260 } } } });
  closeTo(app.teamCalc({ slots: ["camellya", "sanhua", "mornye"], buff: null }).supx.find(x => x.from === "mornye" && x.to === "camellya")?.e || 0, 0.4 / 1.9);

  const suisuiTeam = ["hiyuki", "lucilla", "suisui"];
  const low = buff("suisui", 200, suisuiTeam, "hiyuki");
  const high = buff("suisui", 260, suisuiTeam, "hiyuki");
  closeTo(high - low, 0.12 / 1.9);

  const shoreTeam = ["augusta", "iuno", "shorekeeper"];
  assert.ok(buff("shorekeeper", 240, shoreTeam, "augusta") > buff("shorekeeper", 100, shoreTeam, "augusta"));

  const brant = er => {app.reset({ growth: { brant: { stats: { atk: 2000, cr: 70, cd: 210, er } } } });return app.charScore("brant")};
  assert.ok(brant(280) > brant(150));
});

test("서포터 10명의 지원 기준과 기본 무기를 캐릭터별로 구분한다", () => {
  const app = loadCurrentApp();
  const cases = {
    baizhi: [{ hp: 30000, er: 220 }, 21050036],
    buling: [{ atk: 2400, er: 160 }, 21050024],
    jianxin: [{ er: 134 }, 21040023],
    lily: [{ hp: 40000, er: 260 }, 21030076],
    mornye: [{ def: 3200, er: 260 }, 21010066],
    shorekeeper: [{ hp: 20000, er: 240 }, 21050036],
    suisui: [{ hp: 40000, er: 260 }, 21050096],
    taoqi: [{ def: 4000, er: 126 }, 21010024],
    verina: [{ atk: 2500, er: 220 }, 21050024],
    youhu: [{ er: 100 }, 21040024],
  };
  for (const [id, [targets, weapon]] of Object.entries(cases)) {
    assert.deepEqual(app.supportTargets(id), targets, id);
    assert.equal(app.weapon(id).w?.id, weapon, id);
    assert.equal(app.supportProgress(id).total, Object.keys(targets).length, id);
  }
  assert.equal(app.usefulStat("jianxin", "cr"), false);
  assert.equal(app.usefulStat("youhu", "cd"), false);
  assert.equal(app.usefulStat("verina", "atk%"), true);
  assert.equal(app.usefulStat("buling", "atk%"), true);
  assert.equal(app.weapon("jianxin").pct, null);
  assert.equal(app.weapon("taoqi").pct, null);
  assert.equal(app.weapon("shorekeeper").pct, 100);
});

test("서포터 전용 무기의 명시된 팀 버프는 장착했을 때만 적용한다", () => {
  const app = loadCurrentApp();
  for (const [support, otherWeapon] of [
    ["shorekeeper", 21050024],
    ["mornye", 21010024],
    ["suisui", 21050024],
    ["lily", 21030024],
  ]) {
    const team = { slots: ["hiyuki", "lucilla", support], buff: null };
    const withSignature = app.teamCalc(team);
    assert.ok(withSignature.weaponx.some(x => x.from === support), support);
    app.reset({ growth: { [support]: { wid: otherWeapon } } });
    const withoutSignature = app.teamCalc(team);
    assert.equal(withoutSignature.weaponx.length, 0, support);
    assert.ok(withSignature.total > withoutSignature.total, support);
    app.reset();
  }
});

test("복링 2체인과 도기 5체인 구름 세트의 공효 기준을 낮춘다", () => {
  const app = loadCurrentApp();
  app.reset({ growth: { buling: { chain: 2 }, taoqi: { chain: 5 } } });
  assert.equal(app.supportProgress("buling").targets.er, 130);
  assert.equal(app.supportProgress("taoqi").targets.er, 126);
  app.reset({ growth: { taoqi: { chain: 5, echoSet: { mode: "5", a: "떠오르는 구름" } } } });
  assert.equal(app.supportProgress("taoqi").targets.er, 100);
  assert.equal(app.usefulStat("taoqi", "er"), false);
});
