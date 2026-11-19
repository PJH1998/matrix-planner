"use strict";
/* ---------- static data ---------- */
const EL={glacio:"응결",fusion:"용융",electro:"전도",aero:"기류",spectro:"회절",havoc:"인멸"};
const EL_ORDER=["glacio","fusion","electro","aero","spectro","havoc"];
const ICON={ // original simple glyphs, not game assets
 glacio:'<svg viewBox="0 0 14 14" fill="none" stroke="#fff" stroke-width="1.6"><path d="M7 1v12M1.8 4l10.4 6M12.2 4L1.8 10"/></svg>',
 fusion:'<svg viewBox="0 0 14 14" fill="#fff"><path d="M7 1C9 4 11 5.5 11 8.5a4 4 0 0 1-8 0C3 6.5 4.5 5.5 5 4c.6 1.5 1.3 2 2 2.2C6.6 4.6 6.5 3 7 1z"/></svg>',
 electro:'<svg viewBox="0 0 14 14" fill="#fff"><path d="M8.5 1L3 8h3.5L5.5 13 11 6H7.5z"/></svg>',
 aero:'<svg viewBox="0 0 14 14" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M1.5 5h7a2 2 0 1 0-2-2M1.5 9h9.5a1.8 1.8 0 1 1-1.8 1.8"/></svg>',
 spectro:'<svg viewBox="0 0 14 14" fill="#fff"><path d="M7 1l1.4 4.6L13 7l-4.6 1.4L7 13l-1.4-4.6L1 7l4.6-1.4z"/></svg>',
 havoc:'<svg viewBox="0 0 14 14" fill="none" stroke="#fff" stroke-width="1.6"><circle cx="7" cy="7" r="5"/><path d="M7 2a5 5 0 0 1 0 10a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 0 0-5z" fill="#fff"/></svg>'
};
/* 데이터는 중개자로만 읽는다 — 공명자: CharDB(data/chars/*.js) · 보스·주기: BossDB(data/cycle.js, conds.js) · 에코: EchoDB(data/echoes.js) */
const {CharDB,BossDB,EchoDB,UIIcon,FavoriteButton,CharacterCard}=window.MP;
CharDB.check();
const DEFAULT_CHARS=CharDB.defaults(); // 기본 공명자 목록 {id,name,el,rar,role}

const DT={basic:"일반 공격",heavy:"강공격",skill:"공명 스킬",lib:"공명 해방",echo:"에코 어빌리티",coord:"협동 공격",all:"전체 피해"};
const MT={frost:"서리 효과",burn:"불꽃 효과",erosion:"풍식 효과",flare:"전자 효과",frazzle:"광학 효과",bane:"암흑 효과",anom:"이상 효과",tuneD:"조화 밀집",tuneW:"조화 파동",hack:"해킹",unison:"합일",shield:"실드",echo:"에코",coord:"협동 공격"};
const ANOM=BossDB.anom();

// 파워 서킷·보스 효과 조건 표(data/conds.js)
const COND=BossDB.conds();
const dmgShare=(id,types)=>CharDB.shareOf(id,types);
// 효과 하나가 공명자 id에게 걸리는 비율(0~1). 피해 유형 조건(일반 공격 피해 +20% 등)은 그 공명자 피해 중 해당 유형 비중만큼만 적용한다.
function condWeight(k,t,id){if(!k)return 1;const d=COND[k],c=charMap[id];if(!d||!c)return 0;
  if(d.scope==="team")return teamMeets(k,t)?1:0;
  if(d.mReq&&!d.mReq.some(x=>(synOf(id).m||[]).includes(x)))return 0;
  if(d.min&&t.slots.filter(x=>x&&(synOf(x).m||[]).some(m=>(d.m||[]).includes(m))).length<d.min)return 0;
  if((d.el||[]).includes(c.el))return 1;
  const S=synOf(id);
  if(d.w&&d.w.length){const sh=dmgShare(id,d.w);if(sh!=null)return sh;
    const w=(S.w||[]);const n=d.w.filter(x=>w.includes(x)).length;if(n)return n/Math.max(1,w.length);}
  if((d.m||[]).some(x=>(S.m||[]).includes(x))&&!(d.w&&CharDB.profile(id)))return 1;
  return 0;}
function charMeets(k,id){const d=COND[k],c=charMap[id];if(!d||!c)return false;const S=synOf(id);
  return (d.ids||[]).includes(id)||(d.w||[]).some(x=>(S.w||[]).includes(x))||(d.el||[]).includes(c.el)||(d.m||[]).some(x=>(S.m||[]).includes(x));}
function teamMeets(k,t){const d=COND[k];const n=t.slots.filter(id=>id&&charMeets(k,id)).length;return n>=((d&&d.min)||1)}
// 효과 하나가 파티 t의 공명자 id에게 적용되는지. 조건 없는 효과는 항상 적용, 모르는 조건 키는 적용하지 않는다.
function condApplies(k,t,id){if(!k)return true;const d=COND[k];if(!d)return false;if(d.scope==="team")return teamMeets(k,t);
  if(d.min&&t.slots.filter(x=>x&&(synOf(x).m||[]).some(m=>(d.m||[]).includes(m))).length<d.min)return false;return charMeets(k,id)}
const selBuff=t=>(cycle.buffs||[]).find(b=>b.id===t.buff);

// 주기 데이터는 BossDB가 data/cycle.js에서 읽는다. 주기가 바뀌면 data/cycle.js만 고친다.

const EXAMPLE_TEAMS=BossDB.examples().map(t=>({slots:[0,1,2].map(i=>(t.slots||[])[i]||null),buff:t.buff||null,example:true}));

/* ---------- admin mode ----------
   주기 설정 탭은 관리자 모드에서만 보인다. 주소 뒤에 ?admin=1 을 붙여 한 번 열면 이 브라우저에 기억되고, ?admin=0 으로 끈다.
   (정적 사이트라 진짜 잠금은 아님. 다른 사람이 켜도 자기 브라우저에만 적용되고, 모두에게 보이는 값은 data/cycle.js뿐이다.) */
const IS_ADMIN=(()=>{try{const q=new URLSearchParams(location.search).get("admin");
  if(q==="1")localStorage.setItem("mp-admin","1");else if(q==="0")localStorage.removeItem("mp-admin");
  return localStorage.getItem("mp-admin")==="1";}catch(e){return false}})();

/* ---------- state ---------- */
const LS_KEY="wuwa-matrix-planner-v1";
const stateSchema=window.MP.createStateSchema(DEFAULT_CHARS,EXAMPLE_TEAMS);
const localStateRepository=new window.MP.LocalStorageRepository(LS_KEY);
const appStore=new window.MP.AppStore(stateSchema,localStateRepository);
const appMediator=new window.MP.AppMediator({store:appStore,charDb:CharDB,echoDb:EchoDB,bossDb:BossDB});
let state=null;            // {v,owned,growth,teams,cycle,chars}
let chars=[], charMap={}, cycle=null;
let db=null, docRef=null, storeMode="local";
let selected=null;         // tap-to-place selection
let portraits={};          // charId -> file name in portraits/
// 게임 이미지(img/, 배포 때 encore.moe에서 받음)가 있으면 그것을, 없으면 portraits/ 이미지를 쓴다.
let gameImg={char:new Set(),card:new Set(),weapon:new Set(),set:new Set()};
const hasPic=id=>gameImg.char.has(id)||!!portraits[id];
// --pic은 외부 CSS에서 사용되므로 상대 URL을 넣으면 CSS 파일 위치 기준으로 해석된다. 페이지 기준 절대 URL로 고정한다.
const assetUrl=path=>new URL(path,document.baseURI).href;
const picUrl=id=>assetUrl(gameImg.char.has(id)?`img/char/${id}.webp`:"portraits/"+encodeURIComponent(portraits[id]));
const cardUrl=id=>gameImg.card.has(id)?assetUrl(`img/card/${id}.webp`):(portraits[id]?assetUrl("portraits/"+encodeURIComponent(portraits[id])):null);
let currentUser=null, fb=null;
const ui={el:null,q:"",rq:"",rel:null};

const clone=o=>JSON.parse(JSON.stringify(o));
const replaceState=s=>(state=appMediator.replace(s));
function derive(){
  const model=appMediator.bind(state,{validElements:EL,admin:IS_ADMIN});chars=model.characters;charMap=model.characterMap;cycle=model.cycle;
  if(typeof characterCalculator!=="undefined")characterCalculator.reset();
}
const vigorOf=id=>BossDB.vigor(id);
// 방랑자는 속성이 달라도 한 명 — 어느 속성이든 하나가 편성되면 다른 속성 방랑자도 쓴 것으로 센다
const sameChar=(a,b)=>a===b||(!!a&&!!b&&a.startsWith("rover_")&&b.startsWith("rover_"));
function usedCount(id){let n=0;state.teams.forEach(t=>t.slots.forEach(s=>{if(sameChar(s,id))n++}));return n}

/* ---------- calculation services ----------
   계산식은 서비스에 모으고, 아래 별칭은 기존 화면 렌더링과 이벤트 코드의 호출 규약을 유지한다. */
const calculationContext={state:()=>state,chars:()=>chars,charMap:()=>charMap,cycle:()=>cycle};
const weaponCalculator=new window.MP.WeaponCalculator({state:calculationContext.state,charMap:calculationContext.charMap,charDb:CharDB,
  weapons:window.WEAPONS,weaponTypes:window.WEAPON_TYPES,weaponStats:window.WEAPON_STATS,weaponSheetFx:window.WEAPON_SHEET_FX});
const echoCalculator=new window.MP.EchoCalculator({state:calculationContext.state,charMap:calculationContext.charMap,charDb:CharDB,echoDb:EchoDB,weapons:weaponCalculator});
const characterCalculator=new window.MP.CharacterCalculator({state:calculationContext.state,chars:calculationContext.chars,charMap:calculationContext.charMap,
  cycle:calculationContext.cycle,charDb:CharDB,echoDb:EchoDB,weapons:weaponCalculator,echoes:echoCalculator});

const WMAP=weaponCalculator.map,WTYPE=weaponCalculator.types;
const WICON_BASE="https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconWeapon/";
const weaponIcon=w=>gameImg.weapon.has(w.id)?`img/weapon/${w.id}.webp`:WICON_BASE+(w.icon||`T_IconWeapon${w.id}_UI`)+".webp";
const perfList=id=>weaponCalculator.perfList(id),weaponPct=(id,wid,ref)=>weaponCalculator.weaponPct(id,wid,ref);
const charWType=id=>weaponCalculator.charType(id),defaultWeapon=id=>weaponCalculator.defaultWeapon(id),trialWeapon=id=>weaponCalculator.trialWeapon(id);
const isTrial=id=>!!(state.growth[id]||{}).trial,weaponOf=id=>weaponCalculator.weaponOf(id),bestWeaponId=id=>weaponCalculator.bestWeaponId(id),_wst=id=>weaponCalculator.stat(id);

const TYPE_REF=echoCalculator.typeRef,FLAT_ATK=echoCalculator.flatAtk,FLAT_HP=echoCalculator.flatHp,BONUS_KEYS=echoCalculator.bonusKeys;
const echoSetOf=id=>echoCalculator.setOf(id),echoSetModes=id=>echoCalculator.modesOf(id),bonusKeysOf=id=>echoCalculator.bonusKeysOf(id),scaleOf=id=>echoCalculator.scaleOf(id),ijkOf=id=>echoCalculator.ijkOf(id);
const elRefOf=id=>echoCalculator.elRefOf(id),statsWithWeapon=(id,wid)=>echoCalculator.statsWithWeapon(id,wid);
const expDmg=(main,cr,cd,bonus)=>echoCalculator.expDmg(main,cr,cd,bonus),refDmg=id=>echoCalculator.refDmg(id),weaponStatRatio=(id,wid)=>echoCalculator.weaponStatRatio(id,wid);
const echoesOf=id=>echoCalculator.echoesOf(id),dmgWeights=id=>echoCalculator.dmgWeights(id),echoCtx=id=>echoCalculator.context(id);
const echoBuild=(id,list)=>echoCalculator.build(id,list),sheetStats=id=>echoCalculator.sheetStats(id),echoRef=id=>echoCalculator.reference(id),echoFactor=id=>echoCalculator.factor(id),statFactor=id=>echoCalculator.statFactor(id);

const CHAIN_MUL=characterCalculator.chain,BONUS_BASE=characterCalculator.bonusBase;
const NOSYN_W=characterCalculator.noSynergyWeight,NOSYN_MIN=characterCalculator.noSynergyMin,SYN_BONUS=characterCalculator.synergyBonus;
const dpsFactor=id=>characterCalculator.dpsFactor(id),chainMul=id=>characterCalculator.chainMul(id),charScore=id=>characterCalculator.score(id),ampOf=id=>characterCalculator.amp(id);
const SUP_CTX=characterCalculator.supportContext();
const teamCalculator=new window.MP.TeamCalculator({state:calculationContext.state,charMap:calculationContext.charMap,cycle:calculationContext.cycle,
  charDb:CharDB,bossDb:BossDB,echoDb:EchoDB,characters:characterCalculator,echoes:echoCalculator,condWeight,selectedBuff:selBuff,
  damageLabels:DT,mechanicLabels:MT,elementLabels:EL,anomalies:ANOM});
const synOf=id=>teamCalculator.synOf(id),circuitMul=(t,id)=>teamCalculator.circuitMul(t,id),typeShare=(id,k)=>teamCalculator.typeShare(id,k),hasM=(id,ms)=>teamCalculator.hasMechanic(id,ms);
const outroVals=(g,ids,x)=>teamCalculator.outroValues(g,ids,x),outroGain=(g,x,ids)=>teamCalculator.outroGain(g,x,ids),usesAmp=id=>teamCalculator.usesAmp(id);
const outroMap=(ids,main,wOf)=>teamCalculator.outroMap(ids,main,wOf),ATK_BASE=teamCalculator.atkBase,setFxGain=(f,x)=>teamCalculator.setFxGain(f,x);
const teamCalc=t=>teamCalculator.teamCalc(t),_tc=teamCalculator.cache,teamBase=t=>teamCalculator.teamBase(t),teamScore=t=>teamCalculator.teamScore(t);
const MAX_ROUNDS=teamCalculator.maxRounds,S_REF=teamCalculator.strengthRef,DMG_EXP=teamCalculator.damageExp,SKILL_LV=teamCalculator.skillLevels;
const skillMul=()=>teamCalculator.skillMul(),partyDamage=score=>teamCalculator.partyDamage(score),mainDps=t=>teamCalculator.mainDps(t),simulate=teams=>teamCalculator.simulate(teams);
const permutations=a=>teamCalculator.permutations(a),bestOrder=()=>teamCalculator.bestOrder(),bestOrder_=()=>teamCalculator.bestOrderInternal();
const pairLinks=(a,b)=>teamCalculator.pairLinks(a,b),teamSynergy=t=>teamCalculator.teamSynergy(t);
function clamp(v,a,b){return Math.max(a,Math.min(b,isFinite(v)?v:a))}

/* ---------- persistence ---------- */
let saveTimer=null;
function setSave(cls,text){const el=document.getElementById("save");el.className="save "+cls;el.lastElementChild.textContent=text}
function persist(){
  try{if(!(typeof undoTeams!=="undefined"&&undoTeams)&&state.cur&&state.cur.cycle===cycle.name&&typeof simCache!=="undefined"&&simCache){const a=state.cur.actual;state.cur=Object.assign(snapRecord(),{actual:a||{}})}}catch(e){}
  const saved=(typeof undoTeams!=="undefined"&&undoTeams)?Object.assign({},state,{teams:undoTeams}):state; // 추천 미리보기 중엔 적용 전 편성을 저장
  appMediator.save(saved);
  if(!docRef){setSave("ok","이 브라우저에 저장됨");refreshExport();return}
  setSave("busy","저장 중");
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{await fb.fsM.setDoc(docRef,{data:JSON.stringify(saved),savedAt:Date.now()});setSave("ok","내 계정에 저장됨")}
    catch(e){setSave("busy","계정 저장 실패 · 브라우저에 보관됨")}
  },700);
  refreshExport();
}
const FB_VER="10.12.2";
async function connect(){
  const cfg=window.FIREBASE_CONFIG;
  if(!cfg||!cfg.apiKey){renderAuth();renderStoreInfo();return}
  try{
    const base=`https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [appM,authM,fsM]=await Promise.all([import(base+"firebase-app.js"),import(base+"firebase-auth.js"),import(base+"firebase-firestore.js")]);
    const app=appM.initializeApp(cfg);
    fb={auth:authM.getAuth(app),fs:fsM.getFirestore(app),authM,fsM};
    renderAuth();
    authM.onAuthStateChanged(fb.auth,async u=>{
      currentUser=u;renderAuth();
      if(!u){docRef=null;storeMode="local";setSave("ok","이 브라우저에 저장됨");renderStoreInfo();return}
      docRef=fsM.doc(fb.fs,"users",u.uid);
      try{
        setSave("busy","계정에서 불러오는 중");
        const snap=await fsM.getDoc(docRef);storeMode="account";
        let parsed=null;
        if(snap.exists()){try{parsed=JSON.parse(snap.data().data)}catch(e){}}
        if(parsed){replaceState(parsed);derive();renderAll();appMediator.save(state);setSave("ok","내 계정에서 불러옴")}
        else persist(); // 이 계정의 첫 로그인: 지금 브라우저의 데이터를 계정에 올림
      }catch(e){docRef=null;storeMode="local";setSave("busy","계정 데이터를 불러오지 못함 · 브라우저에 저장")}
      renderStoreInfo();
    });
  }catch(e){fb=null;renderAuth();}
}
function renderAuth(){
  const b=document.getElementById("authBtn");
  if(!fb){b.hidden=true;return}
  b.hidden=false;
  b.textContent=currentUser?`로그아웃 (${currentUser.displayName||currentUser.email||"계정"})`:"Google로 로그인";
}
document.getElementById("authBtn").addEventListener("click",async()=>{
  if(!fb)return;
  try{
    if(currentUser) await fb.authM.signOut(fb.auth);
    else await fb.authM.signInWithPopup(fb.auth,new fb.authM.GoogleAuthProvider());
  }catch(e){flash("로그인하지 못했습니다: "+(e&&e.code||"오류"))}
});

/* ---------- portraits (portraits/ 폴더 + 빌드 때 만드는 index.json) ---------- */
function matchChar(fname){
  const base=fname.replace(/\.[^.]+$/,"").normalize("NFC").trim().toLowerCase().replace(/[\s_\-·]/g,"");
  return chars.find(c=>c.id.toLowerCase().replace(/[_\-]/g,"")===base||c.name.replace(/[\s·]/g,"").toLowerCase()===base);
}
async function loadPortraits(){
  try{
    const r=await fetch("portraits/index.json",{cache:"no-cache"});if(!r.ok)return;
    const files=await r.json();if(!Array.isArray(files))return;
    const m={};files.forEach(f=>{if(typeof f!=="string")return;const c=matchChar(f);if(c)m[c.id]=f});
    portraits=m;rerenderPlan();renderRoster();renderInvest();renderRecords();
  }catch(e){}
}
async function loadGameImages(){
  try{const r=await fetch("img/index.json",{cache:"no-cache"});if(!r.ok)return;const j=await r.json();
    gameImg={char:new Set(j.char||[]),card:new Set(j.card||[]),weapon:new Set((j.weapon||[]).map(Number)),set:new Set((j.set||[]).map(Number))};
    rerenderPlan();renderRoster();renderInvest();renderRecords();if(profId&&$("#prof").open)renderProfile();
  }catch(e){}
}

