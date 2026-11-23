import assert from "node:assert/strict";
import test from "node:test";

import { loadCurrentApp } from "./helpers/load-current-app.mjs";

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("기본 캐릭터 데이터와 대표 강도 결과를 고정한다", () => {
  const app = loadCurrentApp();

  assert.equal(app.defaults().length, 61);
  // 1.3.3: 딜러 점수 = 공명력, 서포터 점수 = 협주력(기준 세팅 = 100). 에코 미입력은 체험 세팅 기준 스탯
  closeTo(app.charScore("hiyuki"), 95.43983369313185);
  closeTo(app.charScore("cantarella"), 86.11000380911887);
  // 1.6.5: 세트 파티 효과를 차이가 아니라 전부 넣는다 — 파수인 찬란한 광휘(파티 공격력 +15%)가 협주력에 들어간다
  closeTo(app.charScore("shorekeeper"), 98.19676582670883);
  // 1.6.6: 기준 속성 피해에 최고 무기의 상시 속성 피해를 넣는다(금희 — 기준 무기 상시 효과가 기준과 체험 세팅에 같이 들어감)
  closeTo(app.charScore("jinhsi"), 103.81037490172953);

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
    // 1.5.1: 체험 세팅 스탯에 장착 무기와 최고 무기의 스탯 차이를 더한다(산화 4성 무기)
    // 1.6.5: 반주 「부스트」를 1.9로 나누지 않는다 · 세트 파티 효과 전부 반영 · Prydwen 측정 파티의 세트 버프도 뺀다
    ["camellya", 27.667380419609962, 36.66654179563288],
    // 1.4: 공명 모드 공명자는 파티마다 한 모드로 계산한다(데니아 조화 밀집, 여우의 별자리 전자 — 이상 효과 서킷)
    ["qingxiao", 65.4343696375669, 81.79296204695862],
    // 1.6.4: 경연은 공격력 계수 + HP 변환(HP 50,000 상한) — 체험 세팅 공격력은 가이드 값(HP 변환 포함)
    ["jingran", 61.72409928701196, 68.38813946883994],
    ["hsin", 57.6034410714534, 89.28533366075278],
  ];

  teams.forEach((team, index) => {
    const result = app.teamCalc(team);
    assert.equal(result.main, expected[index][0]);
    closeTo(result.base, expected[index][1]);
    closeTo(result.total, expected[index][2]);
  });

  const simulation = app.simulate(teams);
  // 1.6.3: 2R 점수 배율 1.1 → 1.15(3.5 공식 패치 노트), 2R 보스 HP 1.77 → 1.69(같은 영상 점수 ÷ 새 배율)
  // 1.6.5: 위 반주·세트 수정으로 경연·여우의 별자리 파티가 내려감(측정 파티 세트 버프를 빼서)
  // 1.6.6: 기준 속성 피해에 최고 무기 상시 효과 반영(여우의 별자리 파티 소폭 변화)
  closeTo(simulation.progress, 6.4470719534191865);
  closeTo(simulation.total, 39106.32562198339);
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

  // 1.5.1: 무기 상시 패시브(서린 불꽃 공격력 12%)를 비전투 최종 스탯에 넣는다
  closeTo(build.atk, 2270.78);
  closeTo(build.cr, 105.5);
  closeTo(build.cd, 243);
  closeTo(build.er, 120);
  closeTo(build.el, 79);
  assert.deepEqual(build.sets, [{ name: set, c: 5, on: [2, 5] }]);
  closeTo(factor.f, 1.1242961330510628);
  closeTo(app.charScore("hiyuki"), 112.42961330510627);
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
  // 1.6.5: 서브 딜러 교환 — 절지는 카를로타에게, 금희는 연무(협동 공격). 루미(빠른 협주 아님)는 사용감 감점
  // 1.6.6: 기준 속성 피해에 최고 무기 상시 효과를 넣어 마지막 두 파티(카를로타 · 기염) 순서가 바뀜
  assert.deepEqual(teams.map(team => `${team.slots.join("/")}:${team.buff}`), [
    "hiyuki/lucilla/suisui:negative", "hsin/suoming/lily:basic", "qingxiao/denia/mornye:tune",
    "aemeath/lynae/mornye:tune", "augusta/iuno/shorekeeper:general", "phrolova/cantarella/roccia:general",
    "cartethyia/ciaccona/rover_a:general", "changli/brant/lupa:general", "xuanling/chisa/suisui:negative",
    "sigrika/qiuyuan/lily:basic", "jingran/lynae/verina:tune", "jinhsi/yuanwu/shorekeeper:general",
    "lucy/rebecca/verina:tune", "zani/phoebe/baizhi:negative", "xiangliyao/yinlin/buling:negative",
    "camellya/sanhua/baizhi:general", "carlotta/zhezhi/buling:negative", "jiyan/mortefi/jianxin:general",
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
  // 1.5.1: 스펙트럴 트리거 상시 패시브(공격력 12%) 포함
  closeTo(app.echoFactor("lucy").f, 0.5481150887060864);
  closeTo(app.charScore("lucy"), 54.811508870608634);
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
  closeTo(lucy.echoFactor("lucy").f, 0.5481150887060864);
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
  // 1.6.6: 서포터도 크리티컬·크리티컬 피해·피해 보너스를 유효로 본다(에코 점수 0.5배와 같은 규칙)
  assert.equal(app.usefulStat("lily", "cr"), true);
  assert.equal(app.usefulStat("lily", "cd"), true);
  assert.equal(app.usefulStat("lily", "lib"), true);
  assert.equal(app.usefulStat("lily", "atk%"), false); // HP 계수

  app.reset({ growth: { lily: { wid: 21030076, echoes: echoes(82.96) } } });
  closeTo(app.sheetStats("lily").er, 260);
  assert.deepEqual(app.teamCalc(team).supx.map(x => x.e), [0.28, 0.28]);
  assert.equal(app.usefulStat("lily", "er"), true); // 1.6.6: 기준치를 넘은 공명 효율도 0.5배로 유효
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
  assert.equal(app.usefulStat("mornye", "er"), true); // 1.6.6: 기준치를 넘어도 유효(에코 점수 0.5배)
  app.reset({ growth: { mornye: { chain: 1, stats: { er: 260 } } } });
  closeTo(app.teamCalc({ slots: ["camellya", "sanhua", "mornye"], buff: null }).supx.find(x => x.from === "mornye" && x.to === "camellya")?.e || 0, 0.4 / 1.9);

  const suisuiTeam = ["hiyuki", "lucilla", "suisui"];
  const low = buff("suisui", 200, suisuiTeam, "hiyuki");
  const high = buff("suisui", 260, suisuiTeam, "hiyuki");
  closeTo(high - low, 0.12 / 1.9);

  const shoreTeam = ["augusta", "iuno", "shorekeeper"];
  assert.ok(buff("shorekeeper", 240, shoreTeam, "augusta") > buff("shorekeeper", 100, shoreTeam, "augusta"));

  // 브렌트의 공효 → 공격력 전환은 전투 중 효과라 공명력이 아니라 개인 피해에 들어간다
  const brant = er => {app.reset({ growth: { brant: { stats: { atk: 2000, cr: 70, cd: 210, er } } } });return app.damage("brant")};
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
  assert.equal(app.usefulStat("jianxin", "cr"), true); // 1.6.6: 서포터도 크리티컬·크리티컬 피해 유효
  assert.equal(app.usefulStat("youhu", "cd"), true);
  assert.equal(app.usefulStat("jianxin", "heavy"), true);  // 피해 비중 12.1%
  assert.equal(app.usefulStat("taoqi", "heavy"), false);   // 피해 비중 0
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
  assert.equal(app.usefulStat("taoqi", "er"), true); // 1.6.6: 기준치를 넘은 공명 효율도 서포터 딜 스탯(0.5배)으로 유효
});

test("상시 체인 스탯은 최종 스탯에 더하고 체인 배율에서는 그 몫을 뺀다", () => {
  const app = loadCurrentApp();
  const base = app.finalStats("qingxiao").cr;
  app.reset({ growth: { qingxiao: { chain: 1 } } });
  closeTo(app.finalStats("qingxiao").cr, base + 16);
  // 청초는 이잘키 기준 크리티컬이 100%라 기준 스탯에서 1체인 크리티컬 몫이 0 → Prydwen 배율 그대로
  closeTo(app.chainRemain("qingxiao"), 1.151);
  // 데니아 1체인 크리티컬 피해 +30%는 기준 스탯에서도 피해를 올리므로 Prydwen 배율보다 작게 남는다
  app.reset({ growth: { denia: { chain: 1 } } });
  assert.ok(app.chainRemain("denia") < 1.068);
  // 스탯 직접 입력은 게임 화면 값이라 체인 스탯을 더하지 않는다
  app.reset({ growth: { qingxiao: { chain: 1, stats: { atk: 2400, cr: 80, cd: 230 } } } });
  closeTo(app.finalStats("qingxiao").cr, 80);
});

test("서포터 체인은 버프력에 곱하고, 협주력은 기준 세팅이 100이다", () => {
  const app = loadCurrentApp();
  const team = { slots: ["jiyan", "verina", null], buff: null };
  app.reset({ growth: { verina: { stats: { atk: 2500, er: 220 } } } });
  const amp0 = app.teamCalc(team).amp;
  closeTo(app.charScore("verina"), 100);
  app.reset({ growth: { verina: { chain: 6, stats: { atk: 2500, er: 220 } } } });
  assert.ok(amp0 > 0);
  closeTo(app.teamCalc(team).amp, amp0 * 1.2);
  // 1.6.5: 협주력에 세트 파티 효과(체인과 무관)도 들어가므로 6체인 협주력은 120보다 조금 낮다
  const score6 = app.charScore("verina");
  assert.ok(score6 > 110 && score6 < 120, String(score6));
  // 파수인·모니에는 supCond가 체인을 직접 읽으므로 buffChain = 1
  app.reset({ growth: { mornye: { stats: { er: 260 } } } });
  const m0 = app.charScore("mornye");
  app.reset({ growth: { mornye: { chain: 6, stats: { er: 260 } } } });
  assert.ok(app.charScore("mornye") >= m0);
});

test("에코 미입력과 체험 세팅은 공식 가이드 스탯을 쓴다", () => {
  const app = loadCurrentApp();
  // 에코도 스탯 직접 입력도 없으면 체험 세팅 기준 스탯(무기·체인은 사용자 설정)
  closeTo(app.finalStats("jiyan").atk, 2200);
  closeTo(app.finalStats("jiyan").cr, 70);
  // 체험 세팅 무기(상시 5성 R1 · 푸른물결의 빛)는 최고 무기(청룡의 천장)와 스탯 차이만큼 더한다 (1.5.1)
  // 공격력 부옵 36.45% → 공격력 +374, 크리티컬 피해 −48.6, 상시 패시브 속성 피해 −12
  app.reset({ growth: { jiyan: { trial: true } } });
  const sheet = app.finalStats("jiyan");
  closeTo(sheet.atk, 2573.977, 1e-6);
  closeTo(sheet.cr, 70);
  closeTo(sheet.cd, 211.4, 1e-9);
  // 1.6.6: 기준 속성 피해에 최고 무기 상시 효과(12%)가 들어가 체험 세팅(가이드 속성 40%)이 기준보다 낮다
  assert.ok(app.charScore("jiyan") > 65);
  // 가이드에 공격력이 없는 공명자는 이잘키 기준 공격력(2100)으로 채우고, 체험 무기(물결의 파동) 차이를 더한다
  app.reset({ growth: { zani: { trial: true } } });
  closeTo(app.finalStats("zani").atk, 2350.857, 1e-6);
  // 혼자 잰 dps는 버프를 되돌리지 않는다
  closeTo(app.refBuff("yuanwu"), 1);
  assert.ok(app.refBuff("aemeath") > 1);
});

test("경연은 공격력 계수이고 HP는 50,000까지만 강해진다", () => {
  const app = loadCurrentApp();
  const set = "황천길을 밝히는 등불";
  const echo = (cost, main, subs) => ({ cost, lv: 25, main, subs, set });
  const build = (a, b) => [
    echo(4, { k: "cr", v: 22 }, [{ k: "cd", v: 21 }, { k: "cr", v: 8.1 }, a, b]),
    echo(3, { k: "el", v: 30, elem: "fusion" }, [{ k: "cr", v: 8.1 }, { k: "cd", v: 16.2 }, a, b]),
    echo(3, { k: "el", v: 30, elem: "fusion" }, [{ k: "cr", v: 8.1 }, { k: "cd", v: 16.2 }, a, b]),
    echo(1, { k: "hp%", v: 22.8 }, [{ k: "cr", v: 8.1 }, { k: "cd", v: 16.2 }, a, b]),
    echo(1, { k: "hp%", v: 22.8 }, [{ k: "cr", v: 8.1 }, { k: "cd", v: 16.2 }, a, b]),
  ];
  const hp = { k: "hp%", v: 10.1 }, atk = { k: "atk%", v: 10.1 }, def = { k: "def%", v: 10.1 };
  const run = (a, b) => {
    app.reset({ growth: { jingran: { lv: 90, chain: 0, echoSet: { mode: "5", a: set }, echoes: build(a, b) } } });
    return { stats: app.finalStats("jingran"), score: app.charScore("jingran"), echo: app.echoScore("jingran") };
  };
  const overCap = run(hp, hp), mixed = run(hp, atk), useless = run(hp, def);

  // HP 변환: HP 1000당 공격력 +36 · 용융 피해 +1.5% (스탯 화면, HP 50,000 상한)
  assert.ok(overCap.stats.hp > 50000 && mixed.stats.hp < 50000);
  closeTo(mixed.stats.atk - useless.stats.atk, (313 + 413) * 0.101 * 5, 1e-6); // 공격력% 10.1 × 5줄 (HP는 같다)
  // HP가 넘치는 세팅보다 HP를 상한 근처에서 멈추고 공격력을 단 세팅이 강하다
  assert.ok(mixed.score > overCap.score);
  assert.ok(mixed.score > useless.score);
  // 공격력 부옵은 유효, HP 부옵은 상한을 넘은 몫만큼 덜 쳐준다
  assert.equal(mixed.echo.weights["atk%"], 1);
  assert.equal(mixed.echo.weights["hp%"], 1);
  assert.ok(overCap.echo.weights["hp%"] < 1);
  assert.equal(app.usefulStat("jingran", "atk%"), true);
});

test("연무는 방어력 계수로 계산한다", () => {
  const app = loadCurrentApp();
  // 공명 스킬·해방·변주·공명 회로 피해가 방어력 계수 — 기준 방어력은 공식 가이드 3500
  assert.deepEqual(app.ijk("yuanwu").main, ["def", 3500]);
  assert.equal(app.usefulStat("yuanwu", "def%"), true);
  assert.equal(app.usefulStat("yuanwu", "atk%"), false);
  closeTo(app.charScore("yuanwu"), 69.66050392670157); // 1.6.6: 기준 속성 피해에 최고 무기 상시 효과
});
