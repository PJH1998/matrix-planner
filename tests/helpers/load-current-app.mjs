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
  for (const file of ["src/store/LocalStorageRepository.js", "src/store/state-schema.js", "src/store/AppStore.js", "src/mediators/CharacterMediator.js", "src/mediators/EchoMediator.js", "src/mediators/TeamMediator.js", "src/mediators/BossMediator.js", "src/mediators/AppMediator.js", "src/services/WeaponCalculator.js", "src/services/EchoCalculator.js", "src/services/DealerCalculator.js", "src/services/SupportCalculator.js", "src/services/CharacterCalculator.js", "src/services/TeamCalculator.js", "src/services/RecommendationService.js", "src/services/SpecUpManager.js", "src/components/Icon.js", "src/components/FavoriteButton.js", "src/components/CharacterCard.js"]) run(context, file);
  run(context, "data/chars/_list.js");
  for (const id of context.MP.CHAR_LIST) run(context, `data/chars/${id}.js`);
  // 특성 테스트는 주기가 바뀌어도 값이 그대로여야 하므로 보관한 3.7 주기로 고정한다 (data/cycle.js는 문법 확인용으로만 먼저 읽는다)
  for (const file of ["data/cycle.js", "data/archive/cycle-3.7-s2p3.js", "data/conds.js", "data/weapons.js", "data/echoes.js", "data/teams.js", "data/trial.js"]) run(context, file);
  for (const file of ["core/chardb.js", "core/bossdb.js", "core/echodb.js"]) run(context, file);

  const appSource = fs.readFileSync(path.join(ROOT, "src/app/core.js"), "utf8");
  const persistence = appSource.indexOf("/* ---------- persistence ---------- */");
  if (persistence < 0) throw new Error("앱 코어의 계산 구간을 찾지 못했습니다.");

  const strengthCode = `(()=>{\n${appSource.slice(0, persistence)}`;
  const expose = `
    state=appMediator.replace(appStore.fresh());derive();
    const recommendationTestService=new window.MP.RecommendationService({state:calculationContext.state,chars:calculationContext.chars,
      charMap:calculationContext.charMap,cycle:calculationContext.cycle,charDb:CharDB,characters:characterCalculator,teams:teamCalculator,vigorOf,
      bestBuffs:t=>{if(!t.slots.some(Boolean))return new Set();const scores=(cycle.buffs||[]).map(b=>[b.id,teamScore({...t,buff:b.id})]);
        const max=Math.max(...scores.map(x=>x[1])),base=teamScore({...t,buff:null});return !(max>base+1e-9)?new Set():new Set(scores.filter(x=>x[1]>=max-1e-9).map(x=>x[0]))}});
    // 스펙업 캐시 확인용: 실제로 다시 계산한 횟수를 센다
    {const compute=specUp.computeChar.bind(specUp);specUp.computes=0;specUp.computeChar=(...a)=>{specUp.computes++;return compute(...a)}}
    window.__calcTest={
      reset(patch){state=appMediator.replace(Object.assign(appStore.fresh(),clone(patch||{})));derive();_tc.clear();return clone(state)},
      state:()=>clone(state),
      defaults:()=>clone(DEFAULT_CHARS),
      reference:id=>({sets:clone(CharDB.sets(id)),er:clone(CharDB.erMin(id))}),
      supportTargets:id=>clone(CharDB.supportTargets(id)),
      weapon:id=>clone(weaponOf(id)),
      supportProgress:id=>clone(echoCalculator.supportProgress(id)),
      charScore,
      damage:id=>characterCalculator.damage(id),
      refBuff:id=>characterCalculator.dealers.refBuff(id),
      chainRemain:id=>characterCalculator.dealers.chainRemain(id),
      finalStats:id=>clone(echoCalculator.finalStats(id)),
      ijk:id=>clone(echoCalculator.ijkOf(id)),
      teamCalc:t=>clone(teamCalc(clone(t))),
      modes:id=>clone(CharDB.modes(id)),
      modeIds:()=>CharDB.ids().filter(id=>CharDB.hasModes(id)),
      setView:(id,i)=>{CharDB.setView(id,i)},
      inModes:(modes,name,...args)=>clone(CharDB.withModes(clone(modes),()=>({syn:id=>CharDB.syn(id),echoSet:id=>echoSetOf(id),echoes:id=>echoesOf(id),charScore:id=>charScore(id),teamCalcRaw:t=>teamCalculator.teamCalcRaw(clone(t))})[name](...args))),
      simulate:teams=>clone(simulate(clone(teams))),
      specUpChar:(id,samples,mode)=>{const n=specUp.samples;if(samples)specUp.samples=samples;try{return clone(specUp.forChar(id,mode))}finally{specUp.samples=n}},
      specUpTable:(opts,samples)=>{const n=specUp.samples;if(samples)specUp.samples=samples;try{return clone(specUp.table(opts||{}))}finally{specUp.samples=n}},
      specUpComputes:()=>specUp.computes,
      specUpOdds:key=>clone(specUp.tierOdds(key)),
      specUpRoll:(seed,n)=>{const r=specUp.rng(seed);return Array.from({length:n},()=>specUp.rollSubs(r))},
      erOk:id=>echoCalculator.erOk(id),
      echoBuild:(id,list)=>clone(echoBuild(id,list==null?undefined:clone(list))),
      sheetStats:id=>clone(sheetStats(id)),
      echoFactor:id=>clone(echoFactor(id)),
      usefulStat:(id,key)=>echoCalculator.usefulStat(id,key),
      echoSet:id=>clone(echoSetOf(id)),
      echoes:id=>clone(echoesOf(id)),
      recommend:()=>clone(recommendationTestService.recommend()),
      pairs:id=>clone(CharDB.pairs(id)),
      guide:id=>clone(CharDB.guide(id)),
      presets:()=>clone(window.MP.TEAM_PRESETS||[]),
      normalize:s=>clone(appStore.normalize(clone(s)))
    };
  })();`;
  vm.runInContext(strengthCode + expose, context, { filename: "index-calculation-harness.js" });
  const copy = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  return new Proxy(context.__calcTest, {
    get(target, property) {
      const value = target[property];
      return typeof value === "function" ? (...args) => copy(value(...args)) : copy(value);
    },
  });
}
