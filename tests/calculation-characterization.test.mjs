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
  closeTo(app.charScore("shorekeeper"), 11.9);
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
    ["camellya", 33.80698414798899, 44.15244671627511],
    ["qingxiao", 76.83726086802139, 96.04657608502671],
    ["jingran", 62.09560345611809, 69.43685945114954],
    ["hsin", 76.71361908152322, 117.80654957636096],
  ];

  teams.forEach((team, index) => {
    const result = app.teamCalc(team);
    assert.equal(result.main, expected[index][0]);
    closeTo(result.base, expected[index][1]);
    closeTo(result.total, expected[index][2]);
  });

  const simulation = app.simulate(teams);
  closeTo(simulation.progress, 7.026175100545651);
  closeTo(simulation.total, 44486.073873621324);
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
  closeTo(factor.f, 1.014231562628518);
  closeTo(app.charScore("hiyuki"), 24.885915215651995);
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
