import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createStore(raw = null) {
  const values = new Map(raw == null ? [] : [["test-state", raw]]);
  const storage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const context = vm.createContext({ console, localStorage: storage, MP: {} });
  context.window = context;
  context.globalThis = context;
  for (const file of ["LocalStorageRepository.js", "state-schema.js", "AppStore.js"]) {
    const filename = path.join(ROOT, "src/store", file);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  }
  const schema = context.MP.createStateSchema([{ id: "alpha" }, { id: "beta" }], [{ slots: ["alpha", null, null], buff: "base", example: true }]);
  const repository = new context.MP.LocalStorageRepository("test-state", storage);
  return { store: new context.MP.AppStore(schema, repository), values };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("저장값이 없으면 새 상태를 만들고 저장한 상태를 다시 불러온다", () => {
  const { store, values } = createStore();
  const state = store.load();

  assert.deepEqual(plain(state.owned), { alpha: true, beta: true });
  assert.equal(state.teams.length, 5);
  state.rosterView = "profile";
  assert.equal(store.save(state), true);
  assert.equal(JSON.parse(values.get("test-state")).rosterView, "profile");

  const restored = createStore(values.get("test-state")).store.load();
  assert.equal(restored.rosterView, "profile");
  assert.equal(restored.sortV, 2);
});

test("손상된 JSON은 예외를 내지 않고 새 상태로 복구한다", () => {
  const state = createStore("{broken").store.load();
  assert.deepEqual(plain(state.owned), { alpha: true, beta: true });
  assert.equal(state.rosterView, "icon");
});

test("외부에서 가져온 상태는 기존 정규화 규칙을 거쳐 교체된다", () => {
  const { store } = createStore();
  const state = store.replace({
    owned: { alpha: false },
    teams: [{ slots: ["alpha", 7, "beta"], buff: 3 }],
    rosterView: "profile",
    sortV: 1,
  });

  assert.deepEqual(plain(state.teams), [{ slots: ["alpha", null, "beta"], buff: null, example: false }]);
  assert.equal(state.rosterView, "profile");
  assert.equal(state.rosterSort, "new");
});
