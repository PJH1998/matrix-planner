import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// 에코 캡처 인식(EchoDB.parse · merge): 실제로 실패하던 캡처 4장을 tesseract로 읽은 원문(tests/fixtures/ocr/texts.json)을
// 그대로 넣어 결과를 고정한다. 글자 인식 자체(tesseract)는 브라우저에서만 돈다 — 원문은 mpOcrEchoTest로 다시 뽑을 수 있다
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = vm.createContext({ console });
context.window = context;
for (const file of ["core/hub.js", "data/echoes.js", "core/echodb.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
}
const EchoDB = context.MP.EchoDB;
const texts = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/ocr/texts.json"), "utf8"));
const plain = value => JSON.parse(JSON.stringify(value));
const read = name => {
  const e = EchoDB.merge(texts[name].map(text => EchoDB.parse(text)));
  return plain({ cost: e.cost, main: e.main, subs: e.subs });
};
const subs = rows => rows.map(([k, v]) => ({ k, v }));

test("밝은 배경에서 속성 이름이 깨진 주옵과 잘린 부옵 이름을 수치로 알아낸다", () => {
  // 「용융」이 「£8」, 「공격력」이 「격력」, 「HP」가 「A」로 읽힌 캡처. 속성은 한 패스에서만 읽혔다
  assert.deepEqual(read("fusion-er-cr-lib-hp-atk"), {
    cost: 3, main: { k: "el", v: 30, elem: "fusion" },
    subs: subs([["er", 10], ["cr", 7.5], ["lib", 8.6], ["hp", 320], ["atk%", 7.1]]),
  });
  // 「크리티컬 피해」가 「> 피해」, 「공명 해방」이 「명해방」으로 읽힌 캡처
  assert.deepEqual(read("fusion-atk-cr-hp-cd-lib"), {
    cost: 3, main: { k: "el", v: 30, elem: "fusion" },
    subs: subs([["atk%", 9.4], ["cr", 6.9], ["hp", 390], ["cd", 21], ["lib", 8.6]]),
  });
});

test("4코스트 방어력 주옵 최대치는 41.8이다", () => {
  // 전에는 최대치를 41.5로 잘못 적어서 맞게 읽은 41.8을 41.3으로 「고쳤다」
  assert.equal(EchoDB.mainStats(4).main["def%"], 41.8);
  assert.deepEqual(read("def-hp-skill-lib-def-cr"), {
    cost: 4, main: { k: "def%", v: 41.8 },
    subs: subs([["hp", 580], ["skill", 9.4], ["lib", 7.9], ["def%", 14.7], ["cr", 6.3]]),
  });
});

test("패스마다 놓친 줄이 달라도 부옵 종류별로 모아 5개를 채운다", () => {
  // 「공명 효율」이 「공명 요율」, 32.0이 52.0으로 읽힌 패스가 섞인 캡처. 마지막 HP 줄은 한 패스에서만 읽혔다
  assert.deepEqual(read("er-def-skill-lib-def-hp"), {
    cost: 3, main: { k: "er", v: 32 },
    subs: subs([["def%", 8.1], ["skill", 8.6], ["lib", 10.1], ["def", 50], ["hp%", 8.6]]),
  });
});

test("부옵 수치는 숫자를 고치지 않고 읽힌 값을 먼저 고른다", () => {
  // 「6.3%」가 「63%」로 읽혀 10.5로 맞춰진 패스와 6.3으로 맞게 읽힌 패스가 2:2 — 맞게 읽힌 값을 쓴다
  const passes = texts["def-hp-skill-lib-def-cr"].map(text => EchoDB.parse(text));
  assert.deepEqual(passes.map(e => e.subs.find(s => s.k === "cr").v).sort(), [10.5, 10.5, 6.3, 6.3]);
  assert.equal(read("def-hp-skill-lib-def-cr").subs.find(s => s.k === "cr").v, 6.3);
});
