import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createApp() {
  const context = vm.createContext({ MP: {} });
  context.window = context;
  context.globalThis = context;
  for (const file of ["CharacterMediator.js", "EchoMediator.js", "TeamMediator.js", "BossMediator.js", "AppMediator.js"]) {
    const filename = path.join(ROOT, "src/mediators", file);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  }
  const initial = {
    owned: { alpha: true },
    growth: {},
    teams: [{ slots: ["alpha", "beta", null], buff: "keep", example: true }],
    cycle: null,
    chars: null,
    fav: {},
  };
  const store = {
    state: initial,
    load(){return this.state},
    replace(value){return this.state=value},
    save(value){this.saved=value;return true},
  };
  const charDb = {
    defaults:()=>[{ id:"alpha",name:"알파",el:"glacio" },{ id:"beta",name:"베타",el:"fusion" },{ id:"bad",name:"잘못",el:"unknown" }],
    use(value){this.used=value},
  };
  const bossDb = {
    selected:null,
    use(value){this.selected=value},
    cycle(){return this.selected||{ name:"기본 주기" }},
    examples:()=>[],
    vigor:()=>1,
  };
  const app = new context.MP.AppMediator({ store, charDb, echoDb:{}, bossDb });
  const state = app.load();
  return { app, state, charDb, bossDb, store };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("AppMediator가 캐릭터와 주기 중개자를 한 번에 결합한다", () => {
  const { app, state, charDb, bossDb } = createApp();
  const model = app.bind(state, { validElements: { glacio: true, fusion: true }, admin: false });

  assert.deepEqual(plain(model.characters.map(c=>c.id)), ["alpha", "beta"]);
  assert.equal(model.characterMap.beta.name, "베타");
  assert.equal(state.owned.beta, true);
  assert.equal(charDb.used.length, 2);
  assert.equal(model.cycle.name, "기본 주기");
  assert.equal(bossDb.selected, null);
});

test("캐릭터와 에코 상태 변경은 각 중개자를 통해서만 적용한다", () => {
  const { app, state } = createApp();
  app.bind(state, { validElements: { glacio: true, fusion: true }, admin: false });

  assert.deepEqual(plain(app.echoes.slots("alpha")), [null, null, null, null, null]);
  assert.equal(state.growth.alpha, undefined);
  app.characters.patchGrowth("alpha", { lv: 80 });
  app.echoes.patchSet("alpha", { mode:"5",a:"기본" }, { mode:"32",b:"보조" });
  assert.deepEqual(plain(state.growth.alpha), { lv:80,echoSet:{ mode:"32",a:"기본",b:"보조" } });

  assert.equal(app.characters.toggleFavorite("alpha"), true);
  assert.equal(app.characters.toggleFavorite("alpha"), false);
});

test("팀 중개자는 캐릭터 제거와 전체 슬롯 초기화를 분리한다", () => {
  const { app, state } = createApp();
  app.bind(state, { validElements: { glacio: true, fusion: true }, admin: false });

  app.teams.removeCharacter("alpha");
  assert.deepEqual(plain(state.teams[0].slots), [null, "beta", null]);
  app.teams.clearSlots();
  assert.deepEqual(plain(state.teams[0].slots), [null, null, null]);
  assert.equal(state.teams[0].buff, "keep");
  assert.equal(state.teams[0].example, true);
});

test("관리자 주기만 BossMediator에 전달한다", () => {
  const { app, state, bossDb } = createApp();
  state.cycle={ name:"사용자 주기" };
  const model=app.bind(state,{ validElements:{ glacio:true,fusion:true },admin:true });

  assert.equal(bossDb.selected,state.cycle);
  assert.equal(model.cycle.name,"사용자 주기");
});
