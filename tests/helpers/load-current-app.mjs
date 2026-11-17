import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function run(context, relativePath) {
  const filename = path.join(ROOT, relativePath);
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

export function loadCurrentApp() {
  const context = vm.createContext({
    console,
    URLSearchParams,
    location: { search: "" },
    localStorage: memoryStorage(),
  });
  context.window = context;
  context.globalThis = context;

  run(context, "core/hub.js");
  for (const file of ["src/store/LocalStorageRepository.js", "src/store/state-schema.js", "src/store/AppStore.js", "src/components/Icon.js", "src/components/FavoriteButton.js", "src/components/CharacterCard.js"]) run(context, file);
  run(context, "data/chars/_list.js");
  for (const id of context.MP.CHAR_LIST) run(context, `data/chars/${id}.js`);
  for (const file of ["data/cycle.js", "data/conds.js", "data/weapons.js", "data/echoes.js", "data/teams.js"]) run(context, file);
  for (const file of ["core/chardb.js", "core/bossdb.js", "core/echodb.js"]) run(context, file);

  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const appStart = html.indexOf("(()=>{");
  const persistence = html.indexOf("/* ---------- persistence ---------- */", appStart);
  const simulation = html.indexOf("/* ---------- boss-run simulation ----------", persistence);
  const renderSynergy = html.indexOf("function synChips", simulation);
  if ([appStart, persistence, simulation, renderSynergy].some((index) => index < 0)) throw new Error("index.html 계산 구간을 찾지 못했습니다.");

  const strengthCode = html.slice(appStart, persistence);
  const simulationCode = html.slice(simulation, renderSynergy);
  const expose = `
    function echoSetOf(id){const g=state.growth[id]||{};if(g.echoSet&&g.echoSet.a)return g.echoSet;const r=(CharDB.sets(id)||[])[0];
      if(!r)return {mode:"5",a:EchoDB.setNames()[0]||"",b:""};const names=[];for(let i=0;i<r.length;i+=2){if(typeof r[i]!=="string")break;names.push(r[i].split("|")[0])}
      return {mode:names.length>1?"32":"5",a:names[0]||"",b:names[1]||""}}
    state=appStore.fresh();derive();
    window.__calcTest={
      reset(patch){state=appStore.normalize(Object.assign(appStore.fresh(),clone(patch||{})));derive();_tc.clear();return clone(state)},
      state:()=>clone(state),
      defaults:()=>clone(DEFAULT_CHARS),
      reference:id=>({sets:clone(CharDB.sets(id)),er:clone(CharDB.erMin(id))}),
      charScore,
      teamCalc:t=>clone(teamCalc(clone(t))),
      simulate:teams=>clone(simulate(clone(teams))),
      echoBuild:(id,list)=>clone(echoBuild(id,list==null?undefined:clone(list))),
      echoFactor:id=>clone(echoFactor(id)),
      normalize:s=>clone(appStore.normalize(clone(s)))
    };
  })();`;
  vm.runInContext(strengthCode + simulationCode + expose, context, { filename: "index-calculation-harness.js" });
  const copy = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  return new Proxy(context.__calcTest, {
    get(target, property) {
      const value = target[property];
      return typeof value === "function" ? (...args) => copy(value(...args)) : copy(value);
    },
  });
}
