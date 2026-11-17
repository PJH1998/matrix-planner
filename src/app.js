(()=>{
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
  if(d.min&&t.slots.filter(x=>x&&(synOf(x).m||[]).some(m=>(d.m||[]).includes(m))).length<d.min)return 0;
  if((d.el||[]).includes(c.el))return 1;
  const S=synOf(id);
  if(d.w&&d.w.length){const sh=dmgShare(id,d.w);if(sh!=null)return sh;
    const w=(S.w||[]);const n=d.w.filter(x=>w.includes(x)).length;if(n)return n/Math.max(1,w.length);}
  if((d.m||[]).some(x=>(S.m||[]).includes(x))&&!(d.w&&CharDB.profile(id)))return 1;
  return 0;}
function charMeets(k,id){const d=COND[k],c=charMap[id];if(!d||!c)return false;const S=synOf(id);
  return (d.w||[]).some(x=>(S.w||[]).includes(x))||(d.el||[]).includes(c.el)||(d.m||[]).some(x=>(S.m||[]).includes(x));}
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
const picUrl=id=>gameImg.char.has(id)?`img/char/${id}.webp`:"portraits/"+encodeURIComponent(portraits[id]);
const cardUrl=id=>gameImg.card.has(id)?`img/card/${id}.webp`:(portraits[id]?"portraits/"+encodeURIComponent(portraits[id]):null);
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
  weapons:window.WEAPONS,weaponTypes:window.WEAPON_TYPES,weaponStats:window.WEAPON_STATS});
const echoCalculator=new window.MP.EchoCalculator({state:calculationContext.state,charMap:calculationContext.charMap,charDb:CharDB,echoDb:EchoDB,weapons:weaponCalculator});
const characterCalculator=new window.MP.CharacterCalculator({state:calculationContext.state,chars:calculationContext.chars,charMap:calculationContext.charMap,
  cycle:calculationContext.cycle,charDb:CharDB,weapons:weaponCalculator,echoes:echoCalculator});

const WMAP=weaponCalculator.map,WTYPE=weaponCalculator.types,TRIAL_MUL=weaponCalculator.trialMul;
const WICON_BASE="https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconWeapon/";
const weaponIcon=w=>gameImg.weapon.has(w.id)?`img/weapon/${w.id}.webp`:WICON_BASE+(w.icon||`T_IconWeapon${w.id}_UI`)+".webp";
const perfList=id=>weaponCalculator.perfList(id),weaponPct=(id,wid,ref)=>weaponCalculator.weaponPct(id,wid,ref);
const charWType=id=>weaponCalculator.charType(id),defaultWeapon=id=>weaponCalculator.defaultWeapon(id),trialWeapon=id=>weaponCalculator.trialWeapon(id);
const isTrial=id=>!!(state.growth[id]||{}).trial,weaponOf=id=>weaponCalculator.weaponOf(id),bestWeaponId=id=>weaponCalculator.bestWeaponId(id),_wst=id=>weaponCalculator.stat(id);

const TYPE_REF=echoCalculator.typeRef,FLAT_ATK=echoCalculator.flatAtk,FLAT_HP=echoCalculator.flatHp,BONUS_KEYS=echoCalculator.bonusKeys;
const echoSetOf=id=>echoCalculator.setOf(id),bonusKeysOf=id=>echoCalculator.bonusKeysOf(id),scaleOf=id=>echoCalculator.scaleOf(id),ijkOf=id=>echoCalculator.ijkOf(id);
const elRefOf=id=>echoCalculator.elRefOf(id),statsWithWeapon=(id,wid)=>echoCalculator.statsWithWeapon(id,wid);
const expDmg=(main,cr,cd,bonus)=>echoCalculator.expDmg(main,cr,cd,bonus),refDmg=id=>echoCalculator.refDmg(id),weaponStatRatio=(id,wid)=>echoCalculator.weaponStatRatio(id,wid);
const echoesOf=id=>echoCalculator.echoesOf(id),dmgWeights=id=>echoCalculator.dmgWeights(id),echoCtx=id=>echoCalculator.context(id);
const echoBuild=(id,list)=>echoCalculator.build(id,list),echoRef=id=>echoCalculator.reference(id),echoFactor=id=>echoCalculator.factor(id),statFactor=id=>echoCalculator.statFactor(id);

const CHAIN_MUL=characterCalculator.chain,ROLE_W=characterCalculator.roleWeight,BONUS_BASE=characterCalculator.bonusBase,MAIN_SUB_RATIO=characterCalculator.mainSubRatio;
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

/* ---------- render: pool ---------- */
const $=s=>document.querySelector(s);
function tokenHTML(c,extra=""){
  const bonus=(cycle.dmgBonus||{})[c.id];
  const pic=hasPic(c.id),sq=gameImg.char.has(c.id);
  return CharacterCard.token({character:c,bonus,pictureUrl:pic?picUrl(c.id):"",hasPicture:pic,squarePicture:sq,elementName:EL[c.el],extra,escape:esc});
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function renderFilter(){
  const box=$("#elFilter");
  box.innerHTML=`<button data-el="" aria-pressed="${!ui.el}">전체</button>`+EL_ORDER.map(e=>`<button data-el="${e}" class="eb" title="${EL[e]}" aria-label="${EL[e]}" aria-pressed="${ui.el===e}">${UIIcon.element(e,{className:"eli"})}</button>`).join("");
}
// 공명자 정렬: rar 5성 먼저(같으면 속성 순) / desc·asc 강함순(캐릭터 점수) / name 이름순. ownedFirst면 보유 공명자를 앞에
// 출시 순서는 공명자 파일의 release (클수록 최근). 실제 배너 순서 기준 (1.0 초기 캐릭터는 초상화 번호)
// (3.0 린네→모니에, 3.1 에이메스→루크, 3.2 시그리카, 3.3 히유키→데니아, 3.4 루시·레베카→루실라). 신캐는 숫자를 이어서 추가
function sortChars(list,mode,ownedFirst){const sc={};const S=id=>sc[id]??(sc[id]=charScore(id));
  const cmp={new:(a,b)=>(CharDB.release(b.id)||999)-(CharDB.release(a.id)||999)||a.name.localeCompare(b.name,"ko"),rar:(a,b)=>b.rar-a.rar||EL_ORDER.indexOf(a.el)-EL_ORDER.indexOf(b.el)||a.name.localeCompare(b.name,"ko"),
    desc:(a,b)=>S(b.id)-S(a.id),asc:(a,b)=>S(a.id)-S(b.id),name:(a,b)=>a.name.localeCompare(b.name,"ko")}[mode||"rar"]||((a,b)=>0);
  return list.sort((a,b)=>(ownedFirst?(+!!state.owned[b.id])-(+!!state.owned[a.id]):0)||cmp(a,b));}
function renderPool(){
  const q=ui.q.trim();
  const list=chars.filter(c=>state.owned[c.id]).filter(c=>!ui.el||c.el===ui.el).filter(c=>!q||c.name.includes(q)||c.id.includes(q.toLowerCase()));
  sortChars(list,state.poolSort);$("#poolSort").value=state.poolSort||"rar";
  $("#poolCount").textContent=`${list.length}명`;
  const pool=$("#pool");
  if(!list.length){pool.innerHTML=`<p class="hint" style="grid-column:1/-1">${chars.some(c=>state.owned[c.id])?"검색 결과가 없습니다.":"보유 캐릭터 탭에서 가진 공명자를 체크하세요."}</p>`;return}
  pool.innerHTML=list.map(c=>{
    const max=vigorOf(c.id),left=max-usedCount(c.id);
    const cnt=`<span class="cnt ${max>1?"dbl":""}" title="남은 배치 횟수">${left}/${max}</span>`;
    return `<div class="tok ${left<=0?"used":""} ${selected===c.id?"sel":""}" data-drag="${left>0?1:0}" data-id="${c.id}" data-src="pool" role="button" tabindex="0" aria-label="${esc(c.name)} 남은 ${left}회">${tokenHTML(c,cnt)}</div>`;
  }).join("");
}


/* ---------- team calculation rendering ---------- */
function synChips(t){
  const {links,combos}=teamSynergy(t);let h="";
  combos.forEach(c=>h+=`<span class="chip syn star" title="추천 조합: ${esc(c.ids.map(id=>charMap[id]?charMap[id].name:id).join(" · "))}">★ ${esc(c.name)}</span>`);
  const mech={};links.filter(l=>l.k==="mech").forEach(l=>{(mech[l.tag]=mech[l.tag]||new Set()).add(t.slots[l.i]);mech[l.tag].add(t.slots[l.j])});
  Object.entries(mech).forEach(([tag,s])=>h+=`<span class="chip syn" title="${esc([...s].map(id=>charMap[id].name).join(" · "))}">⛓ ${esc(MT[tag])}</span>`);
  const r=teamCalc(t),nm=id=>charMap[id]?charMap[id].name:id;
  if(r.main){const g=Math.round((r.gain[r.main]||0)*100);if(g>0)h+=`<span class="chip syn" title="메인 딜러가 파티원 반주·파티 버프로 받는 피해 증가(추정). 같은 종류 피해 보너스는 더하기라 평소 보너스 90% 기준으로 줄여 계산">메인 딜러 궁합 +${g}%</span>`}
  r.links.filter(l=>!l.party&&l.e>=0.01).forEach(l=>h+=`<span class="chip syn" title="반주 스킬: ${esc((synOf(l.from).o)||"")}">${esc(nm(l.from))} → ${esc(nm(l.to))} +${Math.round(l.e*100)}%</span>`);
  const pb={};r.links.filter(l=>l.party).forEach(l=>{(pb[l.from]=pb[l.from]||[]).push(l)});
  Object.entries(pb).forEach(([g,ls])=>h+=`<span class="chip syn" title="파티 버프: ${esc(synOf(g).o||"")}">${esc(nm(g))} 파티 버프 +${Math.round(Math.max(...ls.map(l=>l.e))*100)}%</span>`);
  r.setx.filter(l=>Math.abs(l.e)>=0.01).forEach(l=>h+=`<span class="chip syn" title="에코 세트 효과(기준 세트 대비)${l.t.length?": "+esc(l.t.join(", ")):""}">${esc(nm(l.from))} 세트 → ${esc(nm(l.to))} ${l.e>0?"+":""}${Math.round(l.e*100)}%</span>`);
  r.supx.filter(l=>l.e>=0.01).forEach(l=>h+=`<span class="chip syn" title="서포터 조건부 효과(추정): ${esc(l.t.join(", "))}">${esc(nm(l.from))} → ${esc(nm(l.to))} +${Math.round(l.e*100)}%</span>`);
  r.needs.forEach(id=>{const nd=CharDB.needs(id);h+=`<span class="chip" title="이 메커니즘을 가진 파티원이 없어 피해를 ×${nd.mul}로 계산합니다(추정)">${esc(nm(id))}: ${esc(nd.txt)}</span>`});
  if(r.weak.length)h+=`<span class="chip" title="서포터 없는 파티에서 다른 둘에게 반주 이득을 거의 못 받는 공명자는 피해 비중을 ×${NOSYN_W}로 낮춰 계산합니다">반주 시너지 없음: ${esc(r.weak.map(nm).join(", "))}</span>`;
  // cycle power circuit ↔ party mechanics
  const buff=selBuff(t);
  if(buff){const have=[...new Set((buff.effects||[]).map(e=>e.cond).filter(k=>k&&teamMeets(k,t)))];
    if(have.length) h+=`<span class="chip g" title="선택한 파워 서킷의 조건을 이 파티가 만족합니다">서킷 맞춤: ${esc(have.map(k=>COND[k].label).join(", "))}</span>`;}
  return h;
}

/* ---------- hover overlay ---------- */
const tip=document.createElement("div");tip.id="tip";tip.setAttribute("role","tooltip");document.body.appendChild(tip);
function tipHTML(id){
  const c=charMap[id],S=synOf(id);if(!c)return"";
  const ob=(S.ob||[]).map(t=>t==="el"?EL[c.el]+" 피해":DT[t]).filter(Boolean);
  const ROLE={dps:"메인 딜러",sub:"서브 딜러",support:"서포터"};
  const trial=state.owned[id]&&isTrial(id);
  return `<div class="th"><b>${esc(c.name)}</b><span class="elx" style="--ec:var(--${c.el})">${UIIcon.element(c.el)}${EL[c.el]}</span><span class="chip">${ROLE[c.role]||""}</span>${trial?`<span class="chip tipTrial">체험 세팅</span>`:""}</div>
  ${trial?`<div class="tr"><p class="tipTrialTxt">육성하지 않은 체험 세팅으로 계산 중 (90레벨 · 상시 무기 R1 · 스킬 8레벨 · 약한 에코)</p></div>`:""}
  <div class="tr"><span class="tl"><span>반주 스킬</span><span>${S.p?"파티 전체":"다음 캐릭터"}</span></span><p>${esc(S.o||"정보 없음").replace(/(\d+(?:\.\d+)?%)/g,"<em>$1</em>")}</p>${ob.length?`<div class="tc">${ob.map(x=>`<span class="chip g">${esc(x)} ↑</span>`).join("")}</div>`:""}</div>
  ${(S.w||[]).length?`<div class="tr"><span class="tl">주력 피해</span><div class="tc">${S.w.map(x=>`<span class="chip">${DT[x]}</span>`).join("")}</div></div>`:""}
  ${(S.m||[]).length?`<div class="tr"><span class="tl">메커니즘</span><div class="tc">${S.m.map(x=>`<span class="chip syn">${MT[x]}</span>`).join("")}</div></div>`:""}`;
}
let tipFor=null;
document.addEventListener("mouseover",e=>{
  const tk=e.target.closest&&e.target.closest(".tok[data-id]");
  if(!tk||dragData){if(tipFor&&!(e.target.closest&&e.target.closest("#tip"))){tip.classList.remove("on");tipFor=null}return}
  if(tipFor===tk)return;tipFor=tk;tip.innerHTML=tipHTML(tk.dataset.id)+(tk.dataset.src==="slot"?`<div class="tl">우클릭하면 해제</div>`:"");tip.classList.add("on");
  const r=tk.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;
  let x=r.right+10,y=r.top;if(x+tw>innerWidth-8)x=r.left-tw-10;if(x<8)x=Math.max(8,Math.min(innerWidth-tw-8,r.left));
  if(y+th>innerHeight-8)y=Math.max(8,innerHeight-th-8);
  tip.style.left=x+"px";tip.style.top=y+"px";
});
document.addEventListener("dragstart",()=>{tip.classList.remove("on");tipFor=null},true);
addEventListener("scroll",()=>{tip.classList.remove("on");tipFor=null},true);

/* ---------- render: teams ---------- */
// 파티마다 강화 효과별 강도를 계산해 가장 높은 것을 추천한다 (동률이면 모두 추천)
function bestBuffs(t){if(!t.slots.some(Boolean))return new Set();
  const sc=(cycle.buffs||[]).map(b=>[b.id,teamScore({...t,buff:b.id})]);const mx=Math.max(...sc.map(x=>x[1]));
  const base=teamScore({...t,buff:null});if(!(mx>base+1e-9))return new Set();
  return new Set(sc.filter(x=>x[1]>=mx-1e-9).map(x=>x[0]));}
function buffOptions(sel,t){const best=t?bestBuffs(t):new Set();
  return `<option value="">강화 효과 선택</option>`+(cycle.buffs||[]).map(b=>`<option value="${esc(b.id)}" ${sel===b.id?"selected":""}${best.has(b.id)?' class="rec" style="color:#e6c36a;font-weight:700"':""}>${esc(b.name)}${best.has(b.id)?" · 추천":""}</option>`).join("")}
function teamWarnings(t){
  const out=[];const ids=t.slots.filter(Boolean);
  const dps=ids.map(id=>charMap[id]).filter(c=>c&&c.role==="dps");
  // 보스별 유리/불리: 보스 특성 태그(실드·합일·전자 효과 등)를 이 파티가 만족하면 유리, 메인 딜러 속성을 보스가 저항하면 불리
  const buff=selBuff(t);const btags=new Set(buff?(buff.effects||[]).map(e=>e.cond).filter(Boolean):[]);
  const md=mainDps(t),mel=md&&charMap[md].el;
  if(ids.length)(cycle.bosses||[]).forEach(b=>{
    const tags=(b.effects||[]).flatMap(f=>f.tags||[]).filter(x=>COND[x]);
    const good=tags.filter(x=>teamMeets(x,t));
    const bad=b.res&&b.res===mel;
    if(bad)out.push(`<span class="chip bad" title="메인 딜러(${esc(charMap[md].name)}) 속성 ${EL[mel]}을 이 보스가 저항합니다">${esc(b.name)} 불리</span>`);
    else if(good.length)out.push(`<span class="chip g" title="보스 특성과 맞는 요소: ${esc([...new Set(good)].map(x=>COND[x].label).join(", "))}">${esc(b.name)} 유리</span>`);
  });
  return out.join("");
}
// 예상 점수 + 보스별 예상 진행 (예측치)
function fcastHTML(i){const r=simCache&&simCache.res[i];if(!r||!r.hits.length)return `<span class="none">예상 없음</span>`;
  const tip=`예상 점수·진행 · 예측치\n점수: 준 피해 × 4,750점(1R 보스 1마리) × 라운드 점수 배율 1R 1.0 / 2R 1.1 / 3R 이후 1.25\n진행: 앞 파티가 남긴 HP를 이어받음, 라운드별 HP 1R 1 / 2R 1.77 / 3R 3.36배, 4R 이후 ×2.1씩(추정), 숙련도 ${(SKILL_LV[state.skill]||SKILL_LV.top).label}`;
  const rows=r.hits.map(h=>`<li class="${h.resisted?"res":""}"><span class="bn">${h.round}R ${esc(h.name)}${h.resisted?" <em>저항</em>":""}</span><span class="hp">${Math.round(h.from)}% → ${h.left>0?`<b>${Math.round(h.left)}%</b>`:`<b class="kill">처치</b>`}</span></li>`).join("");
  return `<div class="fc-h" title="${esc(tip)}"><span>예상</span><b>${Math.round(r.pts).toLocaleString()}</b><span>점</span></div><ul class="fc-l">${rows}</ul>`;}
function scoreTip(t){const r=teamCalc(t);if(!r.main)return "";
  return `메인 딜러: ${charMap[r.main].name} (반주·파티 버프 +${Math.round((r.gain[r.main]||0)*100)}%)\n서포터 딜증 +${Math.round(r.amp)}% · 메커니즘·추천 조합 +${Math.round(r.syn)}%${r.weak.length?`\n반주 시너지 없음(비중 ×${NOSYN_W}): ${r.weak.map(id=>charMap[id].name).join(", ")}`:""}\n${t.buff?`파워 서킷 반영 +${r.circuit.toFixed(1)}`:"강화 효과를 고르면 파워 서킷이 반영됩니다"}`;}
let simCache=null;
function renderTeams(){
  queueMicrotask(()=>{const el=$("#ptsTotal");if(el)el.innerHTML=simCache&&simCache.total?`예상 총점 <b>${Math.round(simCache.total).toLocaleString()}</b>`:""});
  const ss=$("#skillSel");if(ss)ss.value=state.skill||"top";
  simCache=simulate(state.teams);
  const order=state.teams.map((t,i)=>({t,i,s:teamScore(t)}));
  const box=$("#teams");
  box.innerHTML=state.teams.map((t,i)=>{
    const els=[...new Set(t.slots.filter(Boolean).map(id=>charMap[id]&&charMap[id].el).filter(Boolean))];
    const sc=teamScore(t);
    const sy=teamSynergy(t);
    const chips=synChips(t);
    const linked=new Set(sy.links.flatMap(l=>[l.i,l.j]));
    const lk=si=>{if(si===0)return"";const on=sy.adj[si];const a=t.slots[si-1],b=t.slots[si];if(!a||!b)return"";
      const l=sy.links.filter(x=>x.i===si-1&&x.j===si).map(x=>x.txt);return `<span class="lnk ${on?"on":""}" title="${esc(on?l.join("\n"):"연결된 시너지 없음")}">${on?"✓":""}</span>`};
    return `<div class="team${sy.adj.wrap?" wrap":""}" data-team="${i}">
      <div class="no">${String(i+1).padStart(2,"0")}<small>${t.example?"예시":"PARTY"}</small></div>
      ${t.slots.map((id,si)=>{const c=id&&charMap[id];return `<div class="slot ${c?"filled":"empty"}${linked.has(si)?" syn":""}" data-team="${i}" data-slot="${si}">${lk(si)}${c?`<div class="tok" data-drag="1" data-id="${c.id}" data-src="slot" data-team="${i}" data-slot="${si}">${tokenHTML(c)}</div>`:""}</div>`}).join("")}
      <div class="meta">
        <div class="row"><span class="score" title="${esc(scoreTip(t))}">강도 <b>${sc.toFixed(1)}</b>${t.buff&&sc>teamBase(t)?`<small class="up">+${Math.round((sc/teamBase(t)-1)*100)}%</small>`:""}</span>
          <div class="mini"><button data-act="up" data-team="${i}" aria-label="위로">▲</button><button data-act="down" data-team="${i}" aria-label="아래로">▼</button><button data-act="del" data-team="${i}" aria-label="파티 삭제">✕</button></div></div>
        <div class="row"><select data-buff="${i}" aria-label="${i+1}번 파티 강화 효과">${buffOptions(t.buff,t)}</select></div>
        <div class="row">${teamWarnings(t)}</div>

      </div>
      <div class="fcast">${fcastHTML(i)}</div>
      <div class="synbox">${chips||`<span class="none">시너지 없음</span>`}</div>
    </div>`;
  }).join("") || `<p class="hint">파티가 없습니다. “+ 파티 추가”를 누르세요.</p>`;
}

/* ---------- render: intel ---------- */
function renderIntel(){
  $("#cycleTag").textContent=(cycle.name||"").toUpperCase();
  const em=cycle.emergency&&charMap[cycle.emergency.id];
  const bonusIds=Object.keys(cycle.dmgBonus||{}).filter(id=>charMap[id]);
  $("#intel").innerHTML=`
  <div class="panel"><div class="ph">이번 주기 적 <span class="sp period">${esc(cycle.period||"")}</span></div><div class="body">
    ${(cycle.bosses||[]).map((b,i)=>`<div class="boss"><span class="ix">${String(i+1).padStart(2,"0")}</span><div><b>${esc(b.name)}</b>${b.tentative?` <span class="chip" title="한국어 공식 표기를 확인하지 못한 이름입니다. 주기 설정 탭에서 고칠 수 있습니다.">가칭</span>`:""} ${b.res?`<span class="chip el" style="--ec:var(--${b.res})">${EL[b.res]} 저항</span>`:`<span class="chip">저항 동일</span>`}<p>${esc(b.note||"")}</p>${(b.effects||[]).length?`<ul class="fx">${b.effects.map(f=>`<li class="${f.kind==="threat"?"t":"b"}"><span>${f.kind==="threat"?"주의":"유리"}${f.round?" · "+esc(f.round):""}</span>${esc(f.text)}</li>`).join("")}</ul>`:""}</div></div>`).join("")}
  </div></div>
  <div class="panel"><div class="ph">파워 서킷 (강화 효과)</div><div class="body">
    ${(cycle.buffs||[]).map(b=>`<div class="buff"><b>${esc(b.name)}</b> <span class="tag">${esc(b.type||"")}</span><ul>${(b.effects||[]).map(e=>`<li>${esc(e.text)}</li>`).join("")}</ul></div>`).join("")}
  </div></div>
  <div class="panel"><div class="ph">배치 횟수 · 강화 공명자</div><div class="body">
    <div><span class="lbl">배치 2회</span><div class="ench" style="margin-top:4px">${(cycle.vigor2||[]).filter(id=>charMap[id]).map(id=>`<span class="chip">${esc(charMap[id].name)}</span>`).join("")}${em?`<span class="chip g" title="${esc(cycle.emergency.note||"")}">${esc(em.name)} (긴급 +${cycle.emergency.extraVigor||1})</span>`:""}</div></div>
    <div><span class="lbl">피해 증가</span><div class="ench" style="margin-top:4px">${bonusIds.map(id=>`<span class="chip w">${esc(charMap[id].name)} +${cycle.dmgBonus[id]}%</span>`).join("")}</div></div>
  </div></div>`;
}

/* ---------- render: roster ---------- */
function renderRoster(){
  const q=ui.rq.trim();
  $("#rElFilter").innerHTML=`<button data-el="" aria-pressed="${!ui.rel}">전체</button>`+EL_ORDER.map(e=>`<button data-el="${e}" class="eb" title="${EL[e]}" aria-label="${EL[e]}" aria-pressed="${ui.rel===e}">${UIIcon.element(e,{className:"eli"})}</button>`).join("");
  const list=chars.filter(c=>(!q||c.name.includes(q))&&(!ui.rel||c.el===ui.rel));
  sortChars(list,state.rosterSort||"new",true);$("#rosterSort").value=state.rosterSort||"new";
  const fav=state.fav||{};list.sort((a,b)=>(+!!fav[b.id])-(+!!fav[a.id])); // 즐겨찾기는 어떤 정렬이든 맨 앞 (안정 정렬이라 그 안의 순서는 유지)
  $("#ownCount").textContent=`보유 ${chars.filter(c=>state.owned[c.id]).length} / ${chars.length}`;
  const pm=state.rosterView==="profile";$("#rgrid").classList.toggle("pmode",pm);
  document.querySelectorAll("[data-rview]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.rview===(pm?"profile":"icon"))));
  if(pm){$("#rgrid").innerHTML=list.map(profCardHTML).join("")||`<p class="hint">조건에 맞는 공명자가 없습니다.</p>`;return}
  $("#rgrid").innerHTML=list.map(c=>{
    const g=state.growth[c.id]||{};const on=!!state.owned[c.id];const wp=weaponOf(c.id);
    const extra=(g.trial?`<span class="rlv rtr" title="체험 세팅 (육성 안 함)">체험</span>`:`<span class="rlv"><small>Lv.</small>${g.lv??90}</span>`)+`<span class="rch" title="공명 체인">${+g.chain||0}<small>돌파</small></span>`+
      (wp.w?`<span class="rwep q${wp.w.q}" title="${esc(wp.w.name)} R${wp.ref}">${UIIcon.weapon(weaponIcon(wp.w))}<b>R${wp.ref}</b></span>`:"")+
      (on?"":`<span class="roff">미보유</span>`)+favBtn(c,"rfav");
    return `<div class="tok rcard ${on?"":"off"}" data-id="${c.id}" role="button" tabindex="0" aria-label="${esc(c.name)} 설정${on?"":" (미보유)"}">${tokenHTML(c,extra)}</div>`;
  }).join("")||`<p class="hint">조건에 맞는 공명자가 없습니다.</p>`;
}
const favBtn=(c,cls)=>FavoriteButton.render({character:c,className:cls,active:!!(state.fav||{})[c.id],escape:esc});
// 프로필 모드 카드: 전신 그림 + 속성·성급·레벨·돌파·무기
function profCardHTML(c){const g=state.growth[c.id]||{};const on=!!state.owned[c.id];const wp=weaponOf(c.id);const pic=cardUrl(c.id);
  return CharacterCard.profile({character:c,growth:g,owned:on,weapon:wp,pictureUrl:pic,elementName:EL[c.el],favoriteHtml:favBtn(c,"pfav"),weaponIconUrl:wp.w?weaponIcon(wp.w):"",escape:esc})}
function toggleOwned(id){const on=appMediator.characters.toggleOwned(id);
  if(!on)appMediator.teams.removeCharacter(id);
  persist();renderRoster();rerenderPlan();flash(`${charMap[id].name}: ${on?"보유":"미보유"}`);}

/* ---------- profile: stats ---------- */
const BASE_STATS=[["hp","HP",""],["atk","공격력",""],["def","방어력",""],["er","공명 효율","%"],["cr","크리티컬","%"],["cd","크리티컬 피해","%"]];
function statSum(id){const c=charMap[id];const sf=statFactor(id);return sf?`스탯 배율 ${(sf.f*100).toFixed(0)}%${sf.echo?" (에코 세팅 사용 중)":""}`:c.role==="support"?"서포터는 강도에 쓰지 않음":"입력 전 (레벨 기준으로 계산)"}

/* ---------- profile: 에코 세팅 ----------
   에코 5칸(카드) + 세트 구성(5세트 / 3+2세트) + 요약 줄. 저장: growth.echoes[5], growth.echoSet {mode:"5"|"32", a, b} */
let pfTabSel=null,echoSel=null,echoEdit=null;const echoMsg={};
function pfTab(id){if(pfTabSel)return pfTabSel;const g=state.growth[id]||{};return g.stats&&!echoesOf(id).length?"stat":"echo"}
function echoSlots(id){return appMediator.echoes.slots(id)}
// 세트 구성. 저장값이 없으면 공명자의 주력 세트(3+2 등)를 기본으로
const SLOT_COST=[4,3,3,1,1];
const fmtV=(k,v)=>`${+(+v).toFixed(1)}${EchoDB.PCT_KEYS.has(k)?"%":""}`;
const echoLab=(k,elem)=>k==="el"&&elem?`${EL[elem]} 피해`:k==="atk%"?"공격력":k==="hp%"?"HP":k==="def%"?"방어력":EchoDB.LABEL[k]||k;
const ST_ICON=new Set(["atk","hp","def","er","cr","cd","basic","heavy","skill","lib","echo","glacio","fusion","electro","aero","spectro","havoc"]);
const statIcon=(k,elem)=>{const n=({"atk%":"atk","hp%":"hp","def%":"def",el:elem})[k]||k;return ST_ICON.has(n)?`<img class="sti" src="icons/st-${n}.png" alt="">`:`<i class="sti"></i>`};
const setIconUrl=name=>{const x=EchoDB.setIcon(name);if(!x)return "";return gameImg.set&&gameImg.set.has(x[0])?`img/set/${x[0]}.webp`:`https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconElementAttri/${x[1]}.webp`};
// 이 공명자에게 쓸모 있는 부옵인지 (흐리게 표시할지 판단)
function subUseful(id,k){const sc=scaleOf(id);if(k==="cr"||k==="cd"||k==="er")return true;
  if(k==="atk%"||k==="atk")return sc==="atk";if(k==="hp%"||k==="hp")return sc==="hp";if(k==="def%"||k==="def")return sc==="def";
  if(["basic","heavy","skill","lib"].includes(k))return CharDB.share(id,k)>=0.08;return false}
function echoHTML(id){
  const c=charMap[id];const E=echoSlots(id);const n=E.filter(Boolean).length;const S=echoSetOf(id);const sets=EchoDB.setNames();
  const cost=E.reduce((a,e)=>a+(e?+e.cost:0),0);
  const opt=v=>sets.map(x=>`<option${x===v?" selected":""}>${esc(x)}</option>`).join("");
  const setbar=`<div class="esetbar"><div class="seg2" role="group" aria-label="세트 구성"><button type="button" data-esmode="5" aria-pressed="${S.mode==="5"}">5세트</button><button type="button" data-esmode="32" aria-pressed="${S.mode==="32"}">3+2세트</button></div>
    <label class="esel"><img src="${setIconUrl(S.a)}" alt="" onerror="this.style.visibility='hidden'"><select data-eseta aria-label="세트">${opt(S.a)}</select><em>×${S.mode==="5"?5:3}</em></label>
    ${S.mode==="32"?`<label class="esel"><img src="${setIconUrl(S.b)}" alt="" onerror="this.style.visibility='hidden'"><select data-esetb aria-label="두 번째 세트">${opt(S.b)}</select><em>×2</em></label>`:""}
    <span class="ecostc${cost>12?" bad":""}">코스트 ${cost}/12</span><span class="estat-msg" id="pfEOcr"></span></div>`;
  const card=(e,i)=>{const m=echoMsg[id+":"+i];const msg=m?`<div class="ec-msg${/실패/.test(m)?" err":""}">${esc(m)}</div>`:"";const sel=echoSel===i?" sel":"";
    if(!e)return `<div class="ecard empty${sel}" data-eslot="${i}"><div class="ec-plus">+</div><div>캡처 붙여넣기</div><small>Ctrl+V · 끌어다 놓기 · 눌러서 선택</small><button type="button" class="ec-b" data-enew="${i}">직접 입력</button>${msg}</div>`;
    const ed=echoEdit===i;const F=EchoDB.FIXED[e.cost];
    const head=`<div class="ec-h"><select class="ec-cost" data-ecost="${i}" aria-label="코스트">${[4,3,1].map(x=>`<option value="${x}"${x===+e.cost?" selected":""}>${x}코</option>`).join("")}</select><span class="ec-sp"></span>
      <button type="button" class="ec-b" data-ecap="${i}" title="캡처로 다시 읽기">캡처</button><button type="button" class="ec-b" data-eedit="${i}">${ed?"완료":"수정"}</button><button type="button" class="ec-b" data-edel="${i}" title="지우기" aria-label="에코 ${i+1} 지우기">✕</button></div>`;
    if(ed)return `<div class="ecard${sel}" data-eslot="${i}">${head}${echoEditHTML(e,i)}${msg}</div>`;
    const subs=[0,1,2,3,4].map(j=>{const x=(e.subs||[])[j];if(!x)return `<div class="ec-sub none"><i class="sti"></i><span>—</span></div>`;
      return `<div class="ec-sub t${EchoDB.tier(x.k,x.v)}${subUseful(id,x.k)?" good":" off"}">${statIcon(x.k)}<span>${esc(echoLab(x.k))}</span><b>${fmtV(x.k,x.v)}</b></div>`}).join("");
    return `<div class="ecard${sel}" data-eslot="${i}">${head}
      <div class="ec-main">${statIcon(e.main.k,e.main.elem)}<span>${esc(echoLab(e.main.k,e.main.elem))}</span><b>${fmtV(e.main.k,e.main.v)}</b></div>
      ${F?`<div class="ec-fix"><span>${F[0]==="hp"?"HP":"공격력"}</span><span>${F[1].toLocaleString()}</span></div>`:""}
      <div class="ec-subs">${subs}</div>${msg}</div>`};
  const tiers=`<div class="etier"><span>부옵 수치 단계</span><span><i style="background:#7d8791"></i>1~2</span><span><i style="background:#ffffff"></i>3~4</span><span><i style="background:#6fe08a"></i>5~6</span><span><i style="background:#ffd23f"></i>7</span><span><i style="background:#ff5c5c"></i>8 (최대)</span><span>· 금색 테두리 = 이 공명자의 유효 부옵, 흐린 줄 = 효과 없음</span></div>`;
  return `${setbar}<div class="ecards">${E.map(card).join("")}</div>${tiers}${n?echoSumHTML(id):`<p class="sbnote" style="text-align:left;margin-top:10px">에코 화면 캡처를 칸마다 붙여넣으면 주옵·부옵을 읽어 최종 스탯을 계산합니다. 세트는 위에서 5세트 / 3+2세트로 고르세요.${c.role==="support"?" 서포터는 본인 강도에 스탯을 쓰지 않고, 세트가 파티원에게 주는 효과만 반영합니다.":""}</p>`}
   ${n?`<button type="button" class="btn ghost sclear" id="pfEClear">에코 모두 지우기</button>`:""}`}
function echoSumHTML(id){const c=charMap[id];const eb=echoBuild(id);if(!eb)return "";const sf=statFactor(id);const sc=scaleOf(id);const I=ijkOf(id);const gd=CharDB.guide(id)||{};const X=eb.screen;
  const erm=CharDB.erMin(id);(erm.adj||[]).forEach(a=>{const x=eb.sets.find(z=>z.name===a.set);if(x&&x.c>=a.n){erm.min+=a.d;erm.adjText=`${a.set} ${a.n}세트 ${a.d>0?"+":""}${a.d}`}});
  {const m=(erm.note||"").match(/(\d)체인 이상/);const ch=+((state.growth[id]||{}).chain)||0;if(m&&ch>=+m[1])erm.note+=` — 지금 ${ch}돌이라 실제 요구치는 더 낮을 수 있음`}
  const erLow=X.er+0.05<erm.min;
  // 막대: 금색 눈금 = 기준(공식 가이드 추천 → 이잘키). 눈금은 막대의 77% 위치
  const bar=(label,v,ref,unit,warn,tip)=>{const w=ref?Math.min(100,v/ref*77):0;return `<div class="es-st${warn?" warn":""}" title="${esc(tip||"")}"><span>${label}<b>${unit==="%"?v.toFixed(1)+"%":Math.round(v).toLocaleString()}</b></span><div class="ebar"><i style="width:${w}%"></i>${ref?`<u style="left:77%"></u>`:""}</div></div>`};
  const mainV=sc==="hp"?X.hp:X.atk,mainRef=sc==="hp"?(gd.hp||I.main[1]):(gd.atk||I.main[1]);
  const crRef=gd.cr||I.cr,cdRef=gd.cd||I.cd;
  const fx=eb.fx.filter(f=>f.to!=="next"&&f.eff>0).map(f=>`${echoLab(f.k,f.elem)} +${+f.eff.toFixed(1)}`);
  return `<div class="esum2"><div class="es-score"><span>스탯 배율</span><b>${sf?(sf.f*100).toFixed(0)+"%":"–"}</b></div>
    ${bar(sc==="hp"?"HP":"공격력",mainV,mainRef,"",false,`기준 ${Math.round(mainRef).toLocaleString()}`)}
    ${bar("크리티컬",X.cr,crRef,"%",false,`기준 ${crRef}%${gd.cr?" (공식 가이드 추천)":""}`)}
    ${bar("크리 피해",X.cd,cdRef,"%",false,`기준 ${cdRef}%${gd.cd?" (공식 가이드 추천)":""}`)}
    ${bar(`${EL[c.el]} 피해`,X.el,elRefOf(id),"%",false,`기준 ${elRefOf(id)}%`)}
    ${bar("공명 효율",X.er,erm.min,"%",erLow,`최소 ${erm.min}%${erm.src==="guide"?" (공식 가이드)":erm.est?" (추정)":" (이잘키)"}`)}
    <div class="es-note">${eb.sets.map(x=>`<img class="esi" src="${setIconUrl(x.name)}" alt="" onerror="this.remove()">${esc(x.name)} ${x.c}개${x.on.length?` (${x.on.map(p=>p+"세트").join("·")})`:""}`).join(" · ")}${fx.length?` · 조건부 효과(유지율 반영): ${fx.join(", ")}`:""}${Object.entries(X.types).filter(([k,v])=>v>0).length?` · 피해 보너스: ${Object.entries(X.types).filter(([k,v])=>v>0).map(([k,v])=>`${EchoDB.LABEL[k]} ${v.toFixed(1)}%`).join(", ")}`:""}</div>
    ${erm.note||erm.adjText?`<div class="es-note">공명 효율 최소치 ${erm.min}%: ${[erm.adjText?`${esc(erm.adjText)} 적용`:"",erm.note?esc(erm.note):""].filter(Boolean).join(" · ")}</div>`:""}
    ${erLow?`<div class="es-note warn">공명 효율이 최소치보다 ${(erm.min-X.er).toFixed(1)}% 낮아 사이클이 밀릴 수 있어요. 다른 칸의 부옵, 3코 공명 효율 주옵, 떠오르는 구름 2세트로 채우는 걸 먼저 고려하세요. (강도에는 반영하지 않음)</div>`:""}
    ${echoSlots(id).filter(Boolean).length<5?`<div class="es-note">에코 ${echoSlots(id).filter(Boolean).length}/5 — 빈 칸은 스탯 0으로 계산합니다.</div>`:""}</div>`}
function echoEditHTML(e,i){const M=(EchoDB.mainStats(e.cost)||{}).main||{};
  const mainOpts=Object.keys(M).map(k=>`<option value="${k}"${k===e.main.k?" selected":""}>${esc(k==="el"?"속성 피해":echoLab(k)+(EchoDB.PCT_KEYS.has(k)&&["atk%","hp%","def%"].includes(k)?"%":""))}</option>`).join("");
  const subKeys=EchoDB.subKeys();
  const row=(j,x)=>`<select data-esk="${i}:${j}" aria-label="부옵 ${j+1}"><option value="">(없음)</option>${subKeys.map(k=>`<option value="${k}"${x&&x.k===k?" selected":""}>${esc(echoLab(k))}${["atk%","hp%","def%"].includes(k)?"%":["atk","hp","def"].includes(k)?" (고정)":""}</option>`).join("")}</select><input type="number" step="any" data-esv="${i}:${j}" value="${x?x.v:""}" aria-label="부옵 ${j+1} 수치">`;
  return `<div class="eedit"><select data-emk="${i}" aria-label="주옵">${mainOpts}</select><input type="number" step="any" data-emv="${i}" value="${e.main.v}" aria-label="주옵 수치">
    ${e.main.k==="el"?`<select data-eme="${i}" aria-label="속성">${EL_ORDER.map(x=>`<option value="${x}"${x===e.main.elem?" selected":""}>${EL[x]} 피해</option>`).join("")}</select><span></span>`:""}
    ${[0,1,2,3,4].map(j=>row(j,(e.subs||[])[j])).join("")}</div>`}
function saveEchoes(id,arr){const g=state.growth[id]=state.growth[id]||{};g.echoes=arr.some(Boolean)?arr:undefined;if(!g.echoes)delete g.echoes;
  persist();requestAnimationFrame(()=>{renderProfile();renderRoster();rerenderPlan()})} // 입력칸 change·blur 처리 중에 다시 그리지 않도록 다음 프레임에
function saveEchoSet(id,patch){appMediator.echoes.patchSet(id,echoSetOf(id),patch);persist();requestAnimationFrame(()=>{renderProfile();renderRoster();rerenderPlan()})}
function newEcho(id,i){const cost=SLOT_COST[i]||1;const M=(EchoDB.mainStats(cost)||{}).main||{};const k=cost===4?"cr":cost===3?"el":"atk%";
  return {cost,main:Object.assign({k,v:M[k]},k==="el"?{elem:(charMap[id]||{}).el}:{}),subs:[]}}
function echoQueue(id,files){const E=echoSlots(id);const free=[];if(echoSel!=null&&files.length===1)free.push(echoSel);
  E.forEach((e,i)=>{if(!e&&!free.includes(i))free.push(i)});
  files.slice(0,free.length).forEach((f,k)=>ocrEcho(id,f,free[k]));
  if(files.length>free.length){const m=$("#pfEOcr");if(m)m.textContent=free.length?`빈 칸이 ${free.length}개라 ${files.length-free.length}장은 넣지 못했어요.`:"빈 칸이 없어요. 바꿀 카드를 눌러 고른 뒤 다시 붙여넣으세요."}}
/* 에코 캡처 인식: 줄마다 배경 밝기가 달라(강조 줄) 한 가지 흑백 기준으로는 글자가 깨질 때가 있다.
   기준을 바꿔 가며 몇 번 읽고, 부옵 5줄이 숫자 수정 없이 읽히면 바로 멈춘다. 가장 잘 읽힌 결과를 쓴다. */
const ECHO_PASSES=[[130,0],[150,2],[115,0],[150,0]];
let _ew=null;
function echoWorker(){return _ew||(_ew=loadTesseract().then(async T=>{const w=await T.createWorker("kor+eng");await w.setParameters({tessedit_pageseg_mode:"6"});return w}).catch(e=>{_ew=null;throw e}))}
let _eq=Promise.resolve();
async function readEcho(blob){const w=await echoWorker();const got=[];
  for(const [th,sc] of ECHO_PASSES){const cv=await prepImage(blob,th,sc||0);const {data}=await w.recognize(cv);const e=EchoDB.parse(data.text);
    if(e&&e.main)got.push(e);if(got.length===1&&e&&e.subs.length>=5&&!e.subFix)break} // 첫 번째에 깨끗이 읽히면 바로 끝
  return EchoDB.merge(got)}
async function ocrEcho(id,blob,i){const key=id+":"+i;echoMsg[key]="글자 인식 중… (처음 한 번은 10초 정도 걸립니다)";if(profId===id)renderProfile();
  const job=_eq.then(()=>readEcho(blob));_eq=job.catch(()=>{});
  try{const e=await job;if(!e||!e.main)throw new Error("에코 옵션을 찾지 못했습니다. 주옵부터 부옵까지 보이게 캡처해 주세요.");
    const arr=echoSlots(id);arr[i]={cost:e.cost,main:e.main,subs:e.subs};
    delete echoMsg[key];echoSel=null;saveEchoes(id,arr);
  }catch(err){echoMsg[key]="인식 실패: "+err.message;if(profId===id)renderProfile()}}
function statsHTML(id){
  const c=charMap[id];const st=(state.growth[id]||{}).stats||{};const b=st.b||{};
  const I=ijkOf(id),sc=scaleOf(id);
  const ph=(k,grp)=>grp?`${k==="el"?elRefOf(id):TYPE_REF}`:k===sc?`${I.main[1]}`:k==="cr"?`${I.cr}`:k==="cd"?`${I.cd}`:"–";
  const row=(k,label,unit,val,grp,icon)=>`<label class="sr">${icon?`<img src="${icon}" alt="">`:`<i class="noi"></i>`}<span>${label}</span><input type="number" step="any" min="0" data-st="${k}" ${grp?`data-grp="b"`:""} value="${val??""}" placeholder="${ph(k,grp)}"><em>${unit}</em></label>`;
  const bk=bonusKeysOf(id);
  const tab=pfTab(id);
  return `<div class="ptabs" role="tablist"><button type="button" data-ptab="echo" aria-pressed="${tab==="echo"}">에코 세팅</button><button type="button" data-ptab="stat" aria-pressed="${tab==="stat"}">스탯 직접 입력</button></div>
   ${tab==="echo"?echoHTML(id):`<div class="pf-sec"><span>스탯</span><b id="pfStSum">${statSum(id)}</b></div>
   <div class="paste" id="pfPaste" tabindex="0"><span>스탯 화면 캡처를 <b>Ctrl+V</b>로 붙여넣거나 끌어다 놓으세요.</span> <button type="button" class="btn" id="pfPick">이미지 선택</button><input type="file" accept="image/*" id="pfFile" hidden><span id="pfOcr" class="ocr"></span></div>
   <p class="sbnote">기준(이 정도면 잘 키웠다${I.est?" · 표에 없어 추정":""}): ${sc==="hp"?"HP":sc==="def"?"방어력":"공격력"} ${I.main[1].toLocaleString()} · 크리티컬 ${I.cr}% · 크리티컬 피해 ${I.cd}% · 3코 ${esc(I.cfg)}<br>칸에 흐리게 보이는 숫자가 기준입니다. 주 스탯·크리티컬·크리티컬 피해를 넣으면 이 기준과 비교해 강도에 반영합니다.</p>
   <div class="srs">${BASE_STATS.map(([k,l,u])=>row(k,l,u,st[k],false,`icons/st-${k}.png`)).join("")}</div>
   <div class="sdiv"><span>피해 보너스</span></div>
   <p class="sbnote">비워 둔 칸은 기준치(속성 ${elRefOf(id)}% · 주력 피해 유형 ${TYPE_REF}%)로 계산합니다. 속성 기준 = 3코 속성 피해 개수 × 30 + 세트 10${I.node?" + 속성 노드 12":""}</p>
   <div class="srs">${bk.map(k=>row(k,k==="el"?`${EL[c.el]} 피해`:`${BONUS_KEYS[k]} 피해`,"%",b[k],true,k==="el"?`icons/st-${c.el}.png`:`icons/st-${k}.png`)).join("")}</div>
   <button type="button" class="btn ghost sclear" id="pfStClear">스탯 지우기</button>`}`;
}
let _tess=null;
function loadTesseract(){return _tess||(_tess=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";sc.onload=()=>res(window.Tesseract);sc.onerror=()=>{_tess=null;rej(new Error("글자 인식 도구를 불러오지 못했습니다"))};document.head.appendChild(sc);}))}
async function prepImage(blob,th,scale){ // 확대 + 흑백 반전(어두운 배경의 흰 글씨 → 흰 바탕 검은 글씨). th: 밝기 기준(기본 150)
  th=th||150;const bm=await createImageBitmap(blob);const k=scale||Math.max(1,Math.min(3,1400/bm.width));
  const cv=document.createElement("canvas");cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);
  const x=cv.getContext("2d");x.drawImage(bm,0,0,cv.width,cv.height);const im=x.getImageData(0,0,cv.width,cv.height),d=im.data;
  for(let i=0;i<d.length;i+=4){const v=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];const o=v>th?0:255;d[i]=d[i+1]=d[i+2]=o;d[i+3]=255}
  x.putImageData(im,0,0);return cv;}
function parseStats(text,bk){
  // 1) 항목 이름으로 찾고, 2) 못 찾은 기본 스탯은 스탯 화면의 고정 순서(HP·공격력·방어력·공명 효율·크리티컬·크리티컬 피해)로 채운다.
  const PCT=new Set(["er","cr","cd"]);
  const val=(str,pct)=>{const t=str.replace(/[Oo]/g,"0").replace(/[lI|]/g,"1").replace(/,/g,"");
    if(pct){const m=t.match(/(\d+\.\d)/)||t.match(/(\d+)/);return m?parseFloat(m[1]):null}
    const m=t.match(/(\d+)/);return m?parseFloat(m[1]):null};
  const lines=text.split(/\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.replace(/[Oo](?=[\d.%])|(?<=[\d.])[Oo]/g,"0").match(/(\d[\d,]*(?:\.\d+)?)\s*%?\s*$/);return {l,num:m?m[1]:null,pct:/%|\d\.\d/.test(m?m[0]:"")}}).filter(x=>x.num);
  const out={b:{}},used=new Set();
  const RULES=[[/크리티컬\s*피해/,"cd"],[/크리티컬|크리티칼/,"cr"],[/공명\s*효율/,"er"],[/공격력/,"atk"],[/방어력/,"def"],[/\bHP\b|H\s*P|체력/i,"hp"],
    [/(응결|용융|전도|기류|회절|인멸)\s*피해/,"b.el"],[/일반\s*공격/,"b.basic"],[/강\s*공격/,"b.heavy"],[/공명\s*스킬/,"b.skill"],[/공명\s*해방/,"b.lib"],[/에코\s*어빌리티/,"b.echo"]];
  lines.forEach((x,i)=>{for(const [re,k] of RULES){if(re.test(x.l)){const isB=k.startsWith("b.");const v=val(x.num,isB||PCT.has(k));
    if(v!=null){if(isB){if(out.b[k.slice(2)]==null)out.b[k.slice(2)]=v}else if(out[k]==null)out[k]=v;used.add(i)}break}}});
  const ORDER=["hp","atk","def","er","cr","cd"];const base=lines.slice(0,6);
  if(base.length===6) ORDER.forEach((k,i)=>{if(out[k]==null&&!used.has(i)){out[k]=val(base[i].num,PCT.has(k));used.add(i)}});
  // 이름을 못 읽은 '피해 보너스' 줄: 이 공명자에게 필요한 보너스 칸 중 빈 칸에 순서대로
  const freeB=(bk||[]).filter(k=>out.b[k]==null);
  lines.forEach((x,i)=>{if(used.has(i)||!freeB.length)return;if(/보너스|피해/.test(x.l)){out.b[freeB.shift()]=val(x.num,true);used.add(i)}});
  return out;}
async function ocrStats(blob){
  const m=$("#pfOcr");if(m)m.textContent="글자 인식 중… (처음 한 번은 10초 정도 걸립니다)";
  try{const T=await loadTesseract();const cv=await prepImage(blob);
    const {data}=await T.recognize(cv,"kor+eng");const got=parseStats(data.text,bonusKeysOf(profId));
    const keys=Object.keys(got).filter(k=>k!=="b");const bkeys=Object.keys(got.b);
    if(!keys.length&&!bkeys.length)throw new Error("스탯을 찾지 못했습니다. 항목 이름과 숫자가 함께 보이게 캡처해 주세요.");
    const g=state.growth[profId]=state.growth[profId]||{};const st=g.stats=Object.assign({},g.stats||{});st.b=Object.assign({},st.b||{},got.b);keys.forEach(k=>st[k]=got[k]);
    persist();renderProfile();renderRoster();rerenderPlan();
    const mm=$("#pfOcr");if(mm)mm.textContent=`인식 완료: ${[...keys.map(k=>(BASE_STATS.find(x=>x[0]===k)||[,k])[1]),...bkeys.map(k=>BONUS_KEYS[k]+" 보너스")].join(", ")}. 숫자가 맞는지 확인해 주세요.`;
    return got;
  }catch(e){const mm=$("#pfOcr");if(mm)mm.textContent="인식 실패: "+e.message;}
}
window.mpOcrTest=async (url,id)=>{const b=await fetch(url).then(r=>r.blob());const T=await loadTesseract();const cv=await prepImage(b);const {data}=await T.recognize(cv,"kor+eng");return {text:data.text,parsed:parseStats(data.text,id?bonusKeysOf(id):["el","heavy"])}};
window.mpDebug={teamCalc:(ids,buff)=>teamCalc({slots:ids,buff:buff||null}),charScore:id=>charScore(id),recommend:()=>recommendTeams(),syn:id=>synOf(id),teamSyn:ids=>teamSynergy({slots:ids,buff:null}),sim:()=>simulate(state.teams),order:()=>bestOrder().map(t=>t.slots.join("/")),chars:()=>chars.map(c=>c.id),sorted:m=>sortChars(chars.slice(),m).map(c=>c.id),statF:id=>statFactor(id),weapon:id=>{const w=weaponOf(id);return {id:w.w&&w.w.id,pct:w.pct}}};

/* ---------- profile dialog ---------- */
let profId=null;
function openProfile(id){if(profId!==id){pfTabSel=null;echoSel=null;echoEdit=null}profId=id;renderProfile();const d=$("#prof");if(!d.open)d.showModal();}
function setGrowth(id,patch){appMediator.characters.patchGrowth(id,patch);persist();renderProfile();renderRoster();rerenderPlan();}
function renderProfile(){
  const id=profId,c=charMap[id];if(!c)return;const g=state.growth[id]||{};const wp=weaponOf(id);const lv=g.lv??90,ch=+g.chain||0;
  const t=charWType(id);const l=perfList(id);const pmap=Object.fromEntries(l.map(x=>[x.id,x]));const top=l[0];
  const ws=Object.values(WMAP).filter(w=>w.type===t&&w.q>=3).sort((a,b)=>((pmap[b.id]||{}).p||0)-((pmap[a.id]||{}).p||0)||b.q-a.q||a.id-b.id);
  const ROLE={dps:"메인 딜러",sub:"서브 딜러",support:"서포터"};
  $("#prof").innerHTML=`<form method="dialog" class="pf">
   <div class="pf-l"><div class="face${cardUrl(id)?" pic":""}${gameImg.card.has(id)?" tall":""}" style="--ec:var(--${c.el})${cardUrl(id)?`;--pic:url('${cardUrl(id)}')`:""}"><span class="elb">${UIIcon.element(c.el)}</span></div></div>
   <div class="pf-r">
    <div class="pf-h"><h3>${esc(c.name)}</h3><span class="chip el" style="--ec:var(--${c.el})">${EL[c.el]}</span><span class="chip">${c.rar}★</span><span class="chip">${ROLE[c.role]||""}</span><span class="chip">${WTYPE[t]||""}</span>
      <button class="x" value="close" aria-label="닫기">✕</button></div>
    <div class="pf-toggles"><label class="pf-own"><input type="checkbox" class="sw" id="pfOwn" ${state.owned[id]?"checked":""}> 보유</label>
    <label class="pf-own" title="육성하지 않은 공명자는 매트릭스에서 게임이 주는 체험 세팅으로 씁니다"><input type="checkbox" class="sw" id="pfTrial" ${g.trial?"checked":""}> 체험 세팅 (육성 안 함)</label>
    <span class="pf-own" style="margin-left:auto">캐릭터 점수 <b id="pfScore" style="color:#e6c36a;font-family:var(--f-num);margin-left:4px">${charScore(id).toFixed(1)}</b></span></div>
    ${g.trial?`<p class="pf-trial">매트릭스 체험 세팅으로 계산합니다: <b>90레벨 · ${wp.w?esc(wp.w.name):"상시 무기"} R1 · 스킬 8레벨 · 약한 에코</b>. 공명 체인만 지금 설정을 따릅니다. 스킬·에코 손실은 예측치(×${TRIAL_MUL})입니다.</p>`:""}
    <div class="pf-row2">
     <div class="${g.trial?"pf-hide":""}"><div class="pf-sec"><span>레벨</span><b>Lv.${lv}</b></div>
      <div class="pf-lv"><input type="range" min="1" max="90" value="${lv}" id="pfLv" aria-label="레벨"><input type="number" min="1" max="90" value="${lv}" id="pfLvN" aria-label="레벨 숫자"></div></div>
     <div><div class="pf-sec"><span>공명 체인 (돌파)</span><b>${ch}돌파 · DPS ${Math.round(chainMul(id)*100)}%</b></div>
      <div class="seg" id="pfCh">${[0,1,2,3,4,5,6].map(n=>`<button type="button" data-v="${n}" aria-pressed="${ch===n}">${n}</button>`).join("")}</div></div>
    </div>
    <div class="${g.trial?"pf-hide":""}">
    <div class="pf-sec"><span>무기</span><b>${wp.w?esc(wp.w.name):"없음"}${wp.pct!=null?` · 성능 ${wp.pct.toFixed(1)}%`:""}</b></div>
    <div class="wgrid" id="pfW">${ws.map(w=>{const e=pmap[w.id];const sel=wp.w&&wp.w.id===w.id;
      return `<button type="button" class="wt q${w.q}" data-w="${w.id}" aria-pressed="${sel}" title="${esc(w.name)}${e?` · ${e.p.toFixed(1)}% (R${e.r} 기준)`:" · 성능 데이터 없음(추정)"}">
        <span class="wi">${UIIcon.weapon(weaponIcon(w))}</span>
        <span class="wn">${esc(w.name)}</span><span class="wp">${e?e.p.toFixed(0)+"%":"–"}</span>${top&&top.id===w.id?`<span class="wbest">추천</span>`:""}</button>`}).join("")}</div>
    <div class="seg" id="pfR" style="max-width:420px">${[1,2,3,4,5].map(n=>`<button type="button" data-v="${n}" aria-pressed="${wp.ref===n}">R${n}</button>`).join("")}</div>
    </div>
   </div>
   <div class="pf-s${g.trial?" pf-dim":""}">${statsHTML(id)}<input type="file" accept="image/*" id="pfEFile" multiple hidden></div>
   </form>`;
}
/* ---------- render: cycle/data ---------- */
function unknownConds(){return [...new Set((cycle.buffs||[]).flatMap(b=>(b.effects||[]).map(e=>e.cond)).concat((cycle.bosses||[]).flatMap(b=>(b.effects||[]).flatMap(f=>f.tags||[]))).filter(k=>k&&!COND[k]&&!['dodge','any'].includes(k)))]}
function renderCycleView(){
  $("#cycleView").innerHTML=`<dl class="kv"><dt>주기</dt><dd>${esc(cycle.name||"")}</dd><dt>기간</dt><dd>${esc(cycle.period||"")}</dd><dt>보스</dt><dd>${(cycle.bosses||[]).length}종</dd><dt>강화 효과</dt><dd>${(cycle.buffs||[]).map(b=>esc(b.name)).join(", ")}</dd><dt>상태</dt><dd>${IS_ADMIN&&state.cycle?"이 브라우저에서 수정한 값 사용 중":"cycle.js 기본값 사용 중"}</dd></dl>
  <p class="prose">필드 설명은 <code>data/cycle.js</code> 맨 위 주석에 있습니다. 강화 효과의 <b>cond</b>와 보스 효과의 <b>tags</b>에 쓸 수 있는 조건 키: ${Object.entries(COND).map(([k,d])=>`<code>${k}</code>(${esc(d.label)})`).join(", ")}</p>
  ${unknownConds().length?`<p class="prose" style="color:var(--bad)">알 수 없는 조건 키: ${unknownConds().map(esc).join(", ")} — data/conds.js에 추가하거나 키를 고치세요. 이 효과는 강도 계산에서 빠집니다.</p>`:""}
  ${cycle.source?`<p class="prose">출처: ${esc(cycle.source)}</p>`:""}`;
  $("#cycleJson").value=JSON.stringify(cycle,null,2);
}
function renderCharJson(){ $("#charJson").value="[\n"+chars.map(c=>"  "+JSON.stringify(c)).join(",\n")+"\n]"; }
function refreshExport(){ const b=$("#exportBox"); if(b) b.value=JSON.stringify(state); }
function renderStoreInfo(){
  $("#storeInfo").innerHTML=`<dt>저장 위치</dt><dd>${"이 브라우저"}</dd><dt>보유 공명자</dt><dd>${chars.filter(c=>state.owned[c.id]).length} / ${chars.length}</dd><dt>파티 수</dt><dd>${state.teams.length}</dd>`;
}
/* ---------- 매트릭스 남은 시간 ---------- */
function cycleEnd(){if(cycle.endsAt){const d=new Date(cycle.endsAt);if(!isNaN(d))return d}
  const m=String(cycle.period||"").match(/(\d{4}-\d{2}-\d{2})\s*$/);return m?new Date(m[1]+"T04:00:00+08:00"):null}
function renderLeft(){const el=$("#cycleLeft");if(!el)return;const e=cycleEnd();if(!e){el.textContent="";return}
  const ms=e-Date.now();if(ms<=0){el.textContent="종료됨 · 다음 주기 대기";el.className="left end";return}
  const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),mi=Math.floor(ms%36e5/6e4);
  el.textContent=`종료까지 ${d?d+"일 ":""}${h}시간${d?"":` ${mi}분`}`;el.className="left"+(ms<864e5?" soon":"");el.title=`종료: ${e.toLocaleString("ko-KR")}`}
setInterval(renderLeft,60000);

/* ---------- 육성 투자 효율 ---------- */
const PULLS={char:95,weapon:70}; // 기대 연차 수 (추정): 한정 캐릭터 1명(50:50 포함), 픽업 무기 1개
function totalNow(){return simulate(state.teams).total||0}
function withGrowth(id,patch,fn){const had=Object.prototype.hasOwnProperty.call(state.growth,id);const old=state.growth[id];
  state.growth[id]=Object.assign({},old||{},patch);try{return fn()}finally{if(had)state.growth[id]=old;else delete state.growth[id]}}
function investCandidates(id){const c=charMap[id];if(!c)return [];const g=state.growth[id]||{};const out=[];const ch=+g.chain||0;
  if(c.rar===5&&ch<6)out.push({label:`공명 체인 ${ch}돌파 → ${ch+1}돌파`,patch:{chain:ch+1},cost:PULLS.char});
  const wp=weaponOf(id);const top=perfList(id)[0];
  if(top&&WMAP[top.id].q===5&&(!wp.w||wp.w.id!==top.id))out.push({label:`무기 ${WMAP[top.id].name} (R1)`,patch:{wid:top.id,wr:5,ref:1},cost:PULLS.weapon,wid:top.id});
  else if(wp.w&&wp.w.q===5&&wp.ref<5)out.push({label:`${wp.w.name} 재련 R${wp.ref} → R${wp.ref+1}`,patch:{ref:wp.ref+1},cost:PULLS.weapon,wid:wp.w.id});
  return out;}
function renderInvest(){const body=$("#invBody");if(!body)return;
  const scope=$("#invScope").value;const inTeam=new Set(state.teams.flatMap(t=>t.slots.filter(Boolean)));
  const ids=(scope==="team"?[...inTeam]:chars.filter(c=>state.owned[c.id]).map(c=>c.id)).filter(id=>charMap[id]);
  const base=totalNow();const rows=[];
  ids.forEach(id=>{const cs=charScore(id);investCandidates(id).forEach(k=>{
    const r=withGrowth(id,k.patch,()=>({tot:inTeam.has(id)?totalNow():base,cs:charScore(id)}));
    const dT=r.tot-base,dC=cs?(r.cs/cs-1)*100:0;rows.push({id,k,dT,dC,eff:inTeam.has(id)?dT/k.cost*10:null,effC:dC/k.cost*10,inTeam:inTeam.has(id)});});});
  invRows=rows;drawInvest();}
// 정렬: 예상 총점 변화(dT) · 캐릭터 점수(dC) · 10연차당(eff). 편성 밖 공명자는 총점 기준 정렬에서 항상 뒤로
let invRows=[];const invSort={k:"eff",dir:-1};
function drawInvest(){const body=$("#invBody");const base=totalNow();const rows=invRows.slice();const {k,dir}=invSort;
  const val=r=>k==="dT"?(r.inTeam?r.dT:null):k==="dC"?r.dC:(r.eff!=null?r.eff:null);
  rows.sort((a,b)=>{const va=val(a),vb=val(b);if(va==null&&vb==null)return b.effC-a.effC;if(va==null)return 1;if(vb==null)return -1;return dir<0?vb-va:va-vb;});
  document.querySelectorAll(".thsort").forEach(b=>{const on=b.dataset.k===k;b.classList.toggle("on",on);b.querySelector("i").textContent=on?(dir<0?" ▼":" ▲"):" ↕";b.setAttribute("aria-sort",on?(dir<0?"descending":"ascending"):"none")});
  const scope=$("#invScope").value;
  body.innerHTML=rows.map((r,i)=>{const c=charMap[r.id];const w=r.k.wid&&WMAP[r.k.wid];
    return `<tr><td class="score">${i+1}</td><td><span class="nmc"><span class="pt"><span class="th" ${hasPic(r.id)?`style="background-image:url('${picUrl(r.id)}')"`:""}></span></span>${esc(c.name)}</span></td>
    <td>${w?UIIcon.weapon(weaponIcon(w),{className:"wmini"}):""}${esc(r.k.label)}</td>
    <td class="score">${r.inTeam?`<b class="${r.dT>0?"up":""}">${r.dT>=0?"+":""}${Math.round(r.dT).toLocaleString()}점</b> <small>(${base?((r.dT/base)*100).toFixed(1):0}%)</small>`:`<span class="mut">편성 밖</span>`}</td>
    <td class="score">+${r.dC.toFixed(1)}%</td><td class="score">≈ ${r.k.cost}연차</td>
    <td class="score">${r.eff!=null?`<b>+${Math.round(r.eff).toLocaleString()}점</b>`:`+${r.effC.toFixed(1)}%`}</td></tr>`}).join("")||`<tr><td colspan="7" class="mut">${scope==="team"?"편성된 공명자가 없습니다. 배치 화면에서 파티를 먼저 짜 주세요.":"보유 공명자가 없습니다."}</td></tr>`;}

/* ---------- 주기별 기록 ---------- */
function snapRecord(){const sim=simCache||simulate(state.teams);
  return {cycle:cycle.name||"",period:cycle.period||"",savedAt:new Date().toISOString(),
    teams:state.teams.map((t,i)=>({slots:t.slots.slice(),buff:t.buff,pred:Math.round((sim.res[i]||{}).pts||0)})).filter(t=>t.slots.some(Boolean)),
    total:Math.round(sim.total||0),actual:{}};}
function archiveIfCycleChanged(){if(state.cur&&state.cur.cycle&&state.cur.cycle!==cycle.name&&state.cur.teams&&state.cur.teams.length){
  state.records.unshift(Object.assign({},state.cur,{auto:true}));}
  const keep=state.cur&&state.cur.cycle===cycle.name?state.cur.actual:{};state.cur=Object.assign(snapRecord(),{actual:keep||{}});}
function recCard(r,idx){const ks=Object.keys(r.actual||{});const sum=ks.reduce((a,k)=>a+(+r.actual[k]||0),0);const has=ks.length;const predIn=ks.reduce((a,k)=>a+((r.teams[k]||{}).pred||0),0);
  return `<div class="panel rec"><div class="ph">${esc(r.cycle)}${idx==null?` <span class="chip g">진행 중</span>`:r.auto?` <span class="chip">자동 기록</span>`:` <span class="chip">직접 저장</span>`}<span class="sp period">${esc(r.period||"")} · ${new Date(r.savedAt).toLocaleDateString("ko-KR")}</span>${idx!=null?`<button class="btn ghost danger rdel" data-del="${idx}">삭제</button>`:""}</div>
   <table class="rt"><thead><tr><th>파티</th><th>공명자</th><th>예상</th><th>실제 점수</th></tr></thead><tbody>
   ${r.teams.map((t,i)=>`<tr><td class="score">${String(i+1).padStart(2,"0")}</td><td><span class="rmem">${t.slots.map(id=>id&&charMap[id]?`<span class="pt"><span class="th" title="${esc(charMap[id].name)}" ${hasPic(id)?`style="background-image:url('${picUrl(id)}')"`:""}></span></span>`:"").join("")}<span class="mut">${t.slots.filter(Boolean).map(id=>charMap[id]?esc(charMap[id].name):"").join(" · ")}</span></span></td>
     <td class="score">${t.pred.toLocaleString()}</td><td><input type="number" min="0" step="1" class="ract" data-rec="${idx==null?"cur":idx}" data-i="${i}" value="${(r.actual||{})[i]??""}" placeholder="–"></td></tr>`).join("")}
   </tbody><tfoot><tr><td colspan="2"><b>합계</b></td><td class="score"><b>${(r.total||0).toLocaleString()}</b></td><td class="score"><b>${has?sum.toLocaleString():"–"}</b>${has&&predIn?` <small class="${sum>=predIn?"up":"down"}" title="실제 점수를 입력한 파티의 예상 합(${predIn.toLocaleString()}) 대비">(예상 대비 ${sum>=predIn?"+":""}${((sum/predIn-1)*100).toFixed(1)}%)</small>`:""}</td></tr></tfoot></table></div>`;}
function renderRecords(){const el=$("#recList");if(!el)return;if(state.cur&&state.cur.cycle===cycle.name){const a=state.cur.actual;state.cur=Object.assign(snapRecord(),{actual:a||{}})}
  el.innerHTML=(state.cur?recCard(state.cur,null):"")+state.records.map((r,i)=>recCard(r,i)).join("")||`<p class="hint">기록이 없습니다.</p>`;}

/* ---------- 업데이트 노트 (updates.js) ---------- */
function renderUpdates(){const el=$("#updList");if(!el)return;const U=window.UPDATES||[];
  // 버전마다 접었다 펼 수 있는 카드, 2열 배치. 가장 최신만 펼친 상태로 시작
  el.innerHTML=U.map((u,i)=>`<details class="panel upd-a"${i===0?" open":""}><summary><div class="ph">${u.ver?`<span class="upd-v">v${esc(u.ver)}</span>`:""}<span class="upd-d">${esc(u.date)}</span>${i===0?`<span class="chip syn star">NEW</span>`:""}<span class="upd-t">${esc(u.title||"")}</span><span class="upd-n">${(u.items||[]).length}건</span></div></summary>
   <ul class="upd-l">${(u.items||[]).map(it=>Array.isArray(it)?`<li>${esc(it[0])}${it.length>1?`<ul>${it.slice(1).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</li>`:`<li>${esc(it)}</li>`).join("")}</ul></details>`).join("");
  const nx=$("#updNext"),N=window.UPCOMING||[];
  if(nx)nx.innerHTML=N.length?`<section class="panel upd-next"><div class="ph"><span class="upd-v">예정</span><span class="upd-t">업데이트 예정</span><span class="upd-n">준비 중인 기능이며 내용은 바뀔 수 있습니다</span></div><div class="upd-g">${N.map(n=>`<div><div class="upd-t" style="margin-top:10px">${esc(n.title)}</div><ul class="upd-l">${(n.items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div></section>`:"";
  // 최신 업데이트를 아직 안 봤으면 탭에 점 표시
  const latest=(U[0]||{}).ver||(U[0]||{}).date;let seen=null;try{seen=localStorage.getItem("mp-upd-seen")}catch(e){}
  const tab=$("#updTab");if(tab)tab.classList.toggle("dot",!!latest&&seen!==latest&&location.hash!=="#updates");
  if(location.hash==="#updates"&&latest){try{localStorage.setItem("mp-upd-seen",latest)}catch(e){}}}
window.addEventListener("hashchange",()=>{if(location.hash==="#updates")renderUpdates()});

function renderAll(){renderFilter();renderPool();renderTeams();renderIntel();renderRoster();renderCycleView();renderCharJson();renderStoreInfo();refreshExport();renderLeft();renderInvest();renderRecords();renderUpdates()}
function rerenderPlan(){renderPool();renderTeams();renderStoreInfo()}

/* ---------- placement logic ---------- */
function place(id,ti,si,from){
  const t=state.teams[ti]; if(!t||!charMap[id]) return;
  if(from){ // move/swap between slots
    const src=state.teams[from.team];
    const prev=t.slots[si];
    t.slots[si]=id; src.slots[from.slot]=prev||null;
    if(from.team===ti&&from.slot===si) return;
  }else{
    if(vigorOf(id)-usedCount(id)<=0 && !sameChar(t.slots[si],id)) return flash(id.startsWith("rover_")?"방랑자는 속성과 관계없이 한 명만 편성할 수 있습니다.":"배치 횟수를 모두 사용했습니다.");
    t.slots[si]=id;
  }
  if(t.slots.filter(x=>x===id).length>1){ // same character twice in one party is not allowed
    if(from){const src=state.teams[from.team];src.slots[from.slot]=id;t.slots[si]=null}
    else t.slots[si]=null;
    flash("같은 파티에 같은 공명자는 넣을 수 없습니다.");
  }
  t.example=false; persist(); rerenderPlan();
}
function unplace(ti,si){const t=state.teams[ti];if(!t)return;t.slots[si]=null;t.example=false;persist();rerenderPlan()}
let flashT=null;
function flash(msg){setSave("busy",msg);clearTimeout(flashT);flashT=setTimeout(()=>setSave("ok",storeMode==="account"?"내 계정에 저장됨":"이 브라우저에 저장됨"),1800)}

/* ---------- events ---------- */
/* 드래그 편성: 브라우저 기본 드래그(HTML5 DnD) 대신 포인터 이벤트로 직접 처리한다.
   (드래그 관련 브라우저 확장이 기본 드래그 이벤트를 가로채면 🚫 표시만 뜨고 놓을 수 없던 문제)
   · 마우스·펜만 해당. 터치는 기존대로 탭해서 넣기 / 길게 눌러 빼기(스크롤과 안 겹치게).
   · 누른 뒤 5px 이상 움직이면 드래그 시작, 그 전에 떼면 평소 클릭(첫 빈 칸에 넣기)으로 처리.
   · 움직임 처리는 프레임당 한 번(requestAnimationFrame), 리스너는 누르고 있는 동안에만 붙인다. */
let dragData=null,overSlot=null,overPool=false;
/* 놓을 칸 찾기: 칸 위가 아니어도(칸 사이 틈, 파티 카드 여백 등) 같은 파티 카드 안이면 가로 위치가 가장 가까운 칸으로 본다. */
function slotAt(e){const t=e.target;if(!t||!t.closest)return null;const s=t.closest(".slot");if(s)return s;
  const card=t.closest(".team");if(!card)return null;const ss=[...card.querySelectorAll(".slot")];if(!ss.length)return null;
  return ss.map(x=>{const r=x.getBoundingClientRect();return [x,Math.abs(e.clientX-(r.left+r.width/2))]}).sort((a,b)=>a[1]-b[1])[0][0]}
function setOver(sl){if(overSlot===sl)return;if(overSlot)overSlot.classList.remove("over");overSlot=sl||null;if(overSlot)overSlot.classList.add("over")}
const DRAG_PX=5;let press=null,ghost=null,rafId=0,lastPt=null,suppressClick=false;
function dragTargetAt(x,y){if(ghost)ghost.style.visibility="hidden";const el=document.elementFromPoint(x,y);if(ghost)ghost.style.visibility="";
  return {el,sl:el?slotAt({target:el,clientX:x}):null,pool:!!(el&&el.closest&&el.closest("#pool"))}}
function dragFrame(){rafId=0;if(!dragData||!lastPt)return;const {x,y}=lastPt;
  ghost.style.transform=`translate3d(${x-press.ox}px,${y-press.oy}px,0)`;
  const t=dragTargetAt(x,y);setOver(t.sl);const op=dragData.src==="slot"&&t.pool&&!t.sl;if(op!==overPool){overPool=op;$("#pool").classList.toggle("over",op)}}
function startDrag(){const tk=press.tk;
  dragData={id:tk.dataset.id,src:tk.dataset.src,team:+tk.dataset.team,slot:+tk.dataset.slot};
  tip.classList.remove("on");tipFor=null;if(selected)setPick(null);
  const r=tk.getBoundingClientRect();ghost=tk.cloneNode(true);ghost.classList.add("dnd-ghost");ghost.removeAttribute("data-id");
  ghost.style.width=r.width+"px";ghost.style.height=r.height+"px";document.body.appendChild(ghost);
  tk.classList.add("dragging");document.body.classList.add("dnd");try{getSelection().removeAllRanges()}catch(_){}}
function endDrag(drop){
  if(rafId){cancelAnimationFrame(rafId);rafId=0}
  const d=dragData;let t=null;if(drop&&d&&lastPt)t=dragTargetAt(lastPt.x,lastPt.y);
  setOver(null);if(overPool){overPool=false;$("#pool").classList.remove("over")}
  if(ghost){ghost.remove();ghost=null}document.querySelectorAll(".tok.dragging").forEach(n=>n.classList.remove("dragging"));document.body.classList.remove("dnd");
  dragData=null;
  if(t&&d){if(t.sl)place(d.id,+t.sl.dataset.team,+t.sl.dataset.slot,d.src==="slot"?{team:d.team,slot:d.slot}:null);
    else if(d.src==="slot"&&t.pool)unplace(d.team,d.slot);}
}
function onPMove(e){if(!press||e.pointerId!==press.id)return;lastPt={x:e.clientX,y:e.clientY};
  if(!dragData){if(Math.hypot(e.clientX-press.x,e.clientY-press.y)<DRAG_PX)return;startDrag()}
  if(!rafId)rafId=requestAnimationFrame(dragFrame)}
function onPUp(e){if(!press||e.pointerId!==press.id)return;const was=!!dragData;
  if(was){lastPt={x:e.clientX,y:e.clientY};endDrag(e.type==="pointerup");suppressClick=true;setTimeout(()=>{suppressClick=false},0)}
  press=null;removeEventListener("pointermove",onPMove);removeEventListener("pointerup",onPUp);removeEventListener("pointercancel",onPUp)}
document.addEventListener("pointerdown",e=>{
  if(e.pointerType==="touch"||e.button!==0||press)return;
  const tk=e.target.closest&&e.target.closest(".tok[data-drag='1']");if(!tk)return;
  e.preventDefault(); // 글자 선택·이미지 기본 드래그 방지
  const r=tk.getBoundingClientRect();press={id:e.pointerId,tk,x:e.clientX,y:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top};lastPt=null;
  addEventListener("pointermove",onPMove,{passive:true});addEventListener("pointerup",onPUp);addEventListener("pointercancel",onPUp)});
// 드래그를 끝낸 직후 따라오는 클릭(첫 빈 칸에 넣기 등)은 무시
document.addEventListener("click",e=>{if(suppressClick){e.stopPropagation();e.preventDefault();suppressClick=false}},true);
addEventListener("keydown",e=>{if(e.key==="Escape"&&dragData){endDrag(false);press=null}});
addEventListener("blur",()=>{if(dragData){endDrag(false);press=null}});
document.addEventListener("dragstart",e=>{if(e.target.closest&&e.target.closest(".tok"))e.preventDefault()}); // 남은 기본 드래그 차단
/* 우클릭 동작은 마우스 오른쪽 버튼 누름(pointerdown, button 2)에서 바로 처리한다.
   '우클릭 허용' 확장 프로그램들은 contextmenu 이벤트를 가로채서(사이트 처리 무력화) 우클릭 기능이 안 먹는 경우가 있다.
   contextmenu는 메뉴를 막는 용도로만 쓰고, 터치 길게 누르기 등 포인터 우클릭이 없을 때만 대신 처리한다. */
const RIGHT_ACTS=[]; // [선택자, 처리 함수(요소)]
function rightAct(target){for(const [sel,fn] of RIGHT_ACTS){const el=target&&target.closest&&target.closest(sel);if(el){fn(el);return true}}return false}
let lastRightAt=0;
document.addEventListener("pointerdown",e=>{if(e.button!==2||e.pointerType==="touch")return;if(rightAct(e.target)){lastRightAt=Date.now()}});
// 배치·보유 캐릭터 화면에서는 우클릭 기능이 없는 곳에서도 브라우저 메뉴를 띄우지 않는다(입력칸·글 선택 중일 때는 그대로)
const NO_MENU="#v-plan,#v-roster,#prof";
document.addEventListener("contextmenu",e=>{const t=e.target;const hit=RIGHT_ACTS.some(([sel])=>t.closest&&t.closest(sel));
  if(!hit){if(t.closest&&t.closest(NO_MENU)&&!t.closest("input,textarea,select,[contenteditable]")&&!String(getSelection&&getSelection()).trim())e.preventDefault();return}
  e.preventDefault();if(Date.now()-lastRightAt>700)rightAct(e.target)});
RIGHT_ACTS.push([".slot .tok",tk=>unplace(+tk.dataset.team,+tk.dataset.slot)]);
/* 보유 공명자 우클릭 → 칸 고르기: 우클릭한 공명자를 집어 든 상태가 되고, 원하는 칸(빈 칸·찬 칸 모두)을 누르면 거기에 넣는다.
   찬 칸이면 원래 있던 공명자와 바뀐다. 같은 공명자를 다시 우클릭하거나 Esc·빈 곳 클릭이면 취소. */
function pickHover(e){setOver(slotAt(e))}
function setPick(id){selected=id;tip.classList.remove("on");tipFor=null;document.body.classList.toggle("picking",!!id);renderPool();
  if(id)document.addEventListener("mouseover",pickHover);else{document.removeEventListener("mouseover",pickHover);setOver(null)}
  if(id)flash(`${charMap[id].name}: 넣을 칸을 누르세요 (Esc 취소)`)}
RIGHT_ACTS.push(["#pool .tok[data-src=pool]",tk=>{
  if(tk.classList.contains("used"))return flash(tk.dataset.id.startsWith("rover_")?"방랑자는 속성과 관계없이 한 명만 편성할 수 있습니다.":"배치 횟수를 모두 사용했습니다.");
  setPick(selected===tk.dataset.id?null:tk.dataset.id)}]);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&selected)setPick(null)});
document.addEventListener("click",e=>{if(selected&&!(e.target.closest&&(e.target.closest("#teams")||e.target.closest("#pool"))))setPick(null)});
// long press to remove (touch)
let lp=null;
document.addEventListener("touchstart",e=>{const tk=e.target.closest&&e.target.closest(".slot .tok");if(!tk)return;lp=setTimeout(()=>{unplace(+tk.dataset.team,+tk.dataset.slot);lp=null},550)},{passive:true});
["touchend","touchmove","touchcancel"].forEach(ev=>document.addEventListener(ev,()=>{clearTimeout(lp)},{passive:true}));
// tap-to-place
document.getElementById("pool").addEventListener("click",e=>{
  const tk=e.target.closest(".tok"); if(!tk||tk.classList.contains("used")) return;
  if(selected){setPick(null);return}
  quickPlace(tk.dataset.id);
});
// 초상화를 누르면 위에서부터 첫 번째 빈 칸(같은 공명자가 없는 파티)에 넣는다. 빈 칸이 없으면 파티를 하나 추가한다.
function quickPlace(id){
  if(vigorOf(id)-usedCount(id)<=0) return flash(id.startsWith("rover_")?"방랑자는 속성과 관계없이 한 명만 편성할 수 있습니다.":"배치 횟수를 모두 사용했습니다.");
  let ti=state.teams.findIndex(t=>!t.slots.includes(id)&&t.slots.some(x=>!x));
  if(ti<0){state.teams.push({slots:[null,null,null],buff:null});ti=state.teams.length-1}
  const si=state.teams[ti].slots.findIndex(x=>!x);
  place(id,ti,si,null);
  const el=document.querySelector(`.slot[data-team="${ti}"][data-slot="${si}"]`);
  if(el){el.classList.add("just");el.scrollIntoView({block:"nearest",behavior:"smooth"});setTimeout(()=>el.classList.remove("just"),700)}
}
document.getElementById("pool").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("tok")){e.preventDefault();e.target.click()}});
document.getElementById("teams").addEventListener("click",e=>{
  const b=e.target.closest("button[data-act]");
  if(b){const i=+b.dataset.team;const T=state.teams;
    if(b.dataset.act==="up"&&i>0)[T[i-1],T[i]]=[T[i],T[i-1]];
    if(b.dataset.act==="down"&&i<T.length-1)[T[i+1],T[i]]=[T[i],T[i+1]];
    if(b.dataset.act==="del")T.splice(i,1);
    persist();rerenderPlan();return}
  if(selected){const s=slotAt(e);if(!s){setPick(null);return}const id=selected;selected=null;document.body.classList.remove("picking");document.removeEventListener("mouseover",pickHover);setOver(null);
    place(id,+s.dataset.team,+s.dataset.slot,null);
    const el=document.querySelector(`.slot[data-team="${s.dataset.team}"][data-slot="${s.dataset.slot}"]`);if(el){el.classList.add("just");setTimeout(()=>el.classList.remove("just"),700)}}
});
document.getElementById("teams").addEventListener("change",e=>{const sel=e.target.closest("select[data-buff]");if(!sel)return;state.teams[+sel.dataset.buff].buff=sel.value||null;persist();renderTeams()});
$("#q").addEventListener("input",e=>{ui.q=e.target.value;renderPool()});
$("#elFilter").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;ui.el=b.dataset.el||null;renderFilter();renderPool()});
$("#poolSort").addEventListener("change",e=>{state.poolSort=e.target.value;persist();renderPool()});
$("#rosterSort").addEventListener("change",e=>{state.rosterSort=e.target.value;persist();renderRoster()});
document.querySelector(".rview").addEventListener("click",e=>{const b=e.target.closest("[data-rview]");if(!b)return;state.rosterView=b.dataset.rview;persist();renderRoster()});
$("#invScope").addEventListener("change",renderInvest);
document.querySelector("table.inv thead").addEventListener("click",e=>{const b=e.target.closest(".thsort");if(!b)return;
  if(invSort.k===b.dataset.k)invSort.dir*=-1;else{invSort.k=b.dataset.k;invSort.dir=-1}drawInvest();});
window.addEventListener("hashchange",()=>{const h=location.hash;if(h==="#invest")renderInvest();if(h==="#records")renderRecords();});
$("#recSave").addEventListener("click",()=>{state.records.unshift(snapRecord());persist();renderRecords();flash("지금 편성을 기록했습니다.")});
$("#recList").addEventListener("click",e=>{const b=e.target.closest("[data-del]");if(!b)return;state.records.splice(+b.dataset.del,1);persist();renderRecords()});
$("#recList").addEventListener("change",e=>{const x=e.target.closest(".ract");if(!x)return;const r=x.dataset.rec==="cur"?state.cur:state.records[+x.dataset.rec];if(!r)return;r.actual=r.actual||{};
  if(x.value==="")delete r.actual[x.dataset.i];else r.actual[x.dataset.i]=Math.max(0,Math.round(+x.value));persist();setTimeout(renderRecords,0)});
$("#skillSel").addEventListener("change",e=>{state.skill=e.target.value;persist();renderTeams()});
$("#btnAdd").addEventListener("click",()=>{state.teams.push({slots:[null,null,null],buff:null});persist();renderTeams()});
let clearArm=false;
$("#btnClear").addEventListener("click",e=>{
  if(!clearArm){clearArm=true;e.target.textContent="한 번 더 누르면 비웁니다";setTimeout(()=>{clearArm=false;e.target.textContent="전체 비우기"},2500);return}
  clearArm=false;e.target.textContent="전체 비우기";
  state.teams.forEach(t=>{t.slots=[null,null,null];t.buff=null;t.example=false});persist();rerenderPlan();
});
/* ---------- 파티 자동 추천 (조합 데이터: teams.js) ----------
   1) 최우선 조합(TEAM_PRESETS)을 그대로 묶는다. (히유키·루실라·수수, 여우의 별자리·쇄명·릴리, 장리·브렌트·루파 …)
   2) 정석 메인+서브 짝(공명자 파일 pairs 궁합 1)을 예상 점수보다 먼저 묶는다.
   3) 남은 메인 딜러는 궁합 또는 반주 이득이 있는 파트너가 있을 때만 짝을 짓는다. 메인 딜러를 모두 쓰려고 하지 않는다.
   4) 센 짝부터 서포터를 넣는다: 궁합 표의 서포터 → 5성 → 4성. 서포터가 남으면 안 쓴 메인 딜러로 파티를 더 만든다.
   5) 3명을 못 채운 파티는 빼고, 파티끼리 서포터를 맞바꿔 전체(강화 효과 포함)가 세지면 바꾼 뒤, 강화 효과·순서를 정한 뒤 예상 점수가 MIN_POINTS(1000점) 미만인 파티는 뺀다. 방랑자는 속성과 관계없이 1명. */
const recommendationService=new window.MP.RecommendationService({state:calculationContext.state,chars:calculationContext.chars,
  charMap:calculationContext.charMap,cycle:calculationContext.cycle,charDb:CharDB,characters:characterCalculator,teams:teamCalculator,vigorOf,bestBuffs});
const TEAM_PRESETS=recommendationService.presets,MIN_POINTS=recommendationService.minPoints;
const affinity=(main,ids)=>recommendationService.affinity(main,ids),recommendTeams=()=>recommendationService.recommend();
/* 자동 추천 미리보기: 처음 누를 때의 편성을 스냅샷으로 저장하고, 적용을 누르기 전까지는 저장소에 스냅샷 편성을 그대로 둔다.
   여러 번 눌러도 스냅샷은 첫 번째 그대로 → 되돌리기는 항상 자동 추천을 처음 누르기 전으로 돌아간다. */
let undoTeams=null;
const recPending=()=>undoTeams!=null;
function setRecBar(){$("#recBar").hidden=!recPending()}
$("#btnAuto").addEventListener("click",()=>{
  const ok=chars.filter(c=>state.owned[c.id]).length;if(ok<3){flash("보유 캐릭터 탭에서 가진 공명자를 먼저 체크하세요.");return}
  const t0=performance.now();const teams=recommendTeams();
  if(!teams.length){flash("추천할 수 있는 파티가 없습니다.");return}
  if(!recPending())undoTeams=JSON.parse(JSON.stringify(state.teams));
  state.teams=teams;state.teams=bestOrder();
  // 예상 점수가 MIN_POINTS 미만인 파티는 빼고 다시 정렬 (뺀 만큼 뒤 파티 점수가 달라지므로 두어 번 반복)
  let cut=0;for(let k=0;k<3;k++){const r=simulate(state.teams);const keep=state.teams.filter((t,i)=>r.res[i].pts>=MIN_POINTS);if(keep.length===state.teams.length)break;cut+=state.teams.length-keep.length;state.teams=keep;state.teams=bestOrder()}
  rerenderPlan();setRecBar();
  flash(`파티 ${state.teams.length}개를 추천했습니다${cut?` (예상 ${MIN_POINTS}점 미만 ${cut}개 제외)`:""} — 적용을 눌러야 저장됩니다`);
  console.log("recommend ms",Math.round(performance.now()-t0));
});
$("#btnApply").addEventListener("click",()=>{if(!recPending())return;undoTeams=null;setRecBar();persist();rerenderPlan();flash("추천 편성을 적용했습니다.")});
$("#btnUndo").addEventListener("click",()=>{if(!recPending())return;state.teams=undoTeams;undoTeams=null;setRecBar();persist();rerenderPlan();flash("자동 추천 전으로 되돌렸습니다.")});
$("#btnSort").addEventListener("click",()=>{
  // 보스 진행을 시뮬레이션해 가장 멀리 가는 순서를 고른다 (메인 딜러 저항 보스는 피하고, 비슷하면 약한 파티를 앞으로). 빈 파티는 맨 뒤.
  state.teams=bestOrder();const r=simulate(state.teams);
  persist();renderTeams();flash(r.bad?`정렬했습니다. 저항 보스를 만나는 파티 ${r.bad}개는 피할 수 없었습니다.`:"저항 보스를 피하면서 약한 파티부터 정렬했습니다.");
});
// roster
$("#rq").addEventListener("input",e=>{ui.rq=e.target.value;renderRoster()});
$("#rElFilter").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;ui.rel=b.dataset.el||null;renderRoster()});
$("#rgrid").addEventListener("click",e=>{const fv=e.target.closest("[data-fav]");if(fv){e.stopPropagation();appMediator.characters.toggleFavorite(fv.dataset.fav);persist();renderRoster();return}
  const tk=e.target.closest(".rcard");if(tk)openProfile(tk.dataset.id)});
$("#rgrid").addEventListener("keydown",e=>{const tk=e.target.closest(".rcard");if(tk&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openProfile(tk.dataset.id)}});
RIGHT_ACTS.push(["#rgrid .rcard",tk=>toggleOwned(tk.dataset.id)]);
let rlp=null,rlpFired=false;
$("#rgrid").addEventListener("touchstart",e=>{const tk=e.target.closest(".rcard");if(!tk)return;rlpFired=false;rlp=setTimeout(()=>{rlpFired=true;toggleOwned(tk.dataset.id)},550)},{passive:true});
["touchend","touchmove","touchcancel"].forEach(ev=>$("#rgrid").addEventListener(ev,e=>{clearTimeout(rlp);if(ev==="touchend"&&rlpFired){e.preventDefault();rlpFired=false}}));
$("#prof").addEventListener("click",e=>{
  const d=$("#prof");if(e.target===d){d.close();return}
  if(e.target.id==="pfPick"){$("#pfFile").click();return}
  if(e.target.id==="pfStClear"){const g=state.growth[profId]||{};delete g.stats;return setGrowth(profId,{})}
  const pt=e.target.closest("[data-ptab]");if(pt){pfTabSel=pt.dataset.ptab;return renderProfile()}
  if(e.target.id==="pfEClear"){Object.keys(echoMsg).forEach(k=>{if(k.startsWith(profId+":"))delete echoMsg[k]});echoEdit=null;echoSel=null;return saveEchoes(profId,[null,null,null,null,null])}
  const ee=e.target.closest("[data-eedit]");if(ee){const i=+ee.dataset.eedit;echoEdit=echoEdit===i?null:i;return renderProfile()}
  const ed=e.target.closest("[data-edel]");if(ed){const i=+ed.dataset.edel;const a=echoSlots(profId);a[i]=null;delete echoMsg[profId+":"+i];if(echoEdit===i)echoEdit=null;return saveEchoes(profId,a)}
  const nw=e.target.closest("[data-enew]");if(nw){const i=+nw.dataset.enew;const a=echoSlots(profId);a[i]=newEcho(profId,i);echoEdit=i;return saveEchoes(profId,a)}
  const cp=e.target.closest("[data-ecap]");if(cp){echoSel=+cp.dataset.ecap;$("#pfEFile").click();return}
  const sm=e.target.closest("[data-esmode]");if(sm){const S=echoSetOf(profId);return saveEchoSet(profId,{mode:sm.dataset.esmode,b:S.b||S.a})}
  const es=e.target.closest(".ecard");if(es&&!e.target.closest("select,input,button")){const i=+es.dataset.eslot;
    if(es.classList.contains("empty")){echoSel=i;renderProfile();$("#pfEFile").click();return}
    echoSel=echoSel===i?null:i;return renderProfile()}
  const ch=e.target.closest("#pfCh button");if(ch)return setGrowth(profId,{chain:+ch.dataset.v});
  const r=e.target.closest("#pfR button");if(r)return setGrowth(profId,{ref:+r.dataset.v});
  const w=e.target.closest("#pfW button");if(w){const W=WMAP[+w.dataset.w];const g=state.growth[profId]||{};
    return setGrowth(profId,{wid:W.id,wr:W.q,ref:g.wid===W.id?g.ref:(W.q<5?5:1)})}
});
$("#prof").addEventListener("input",e=>{
  if(e.target.id==="pfLv"){$("#pfLvN").value=e.target.value;}
  if(e.target.id==="pfLvN"&&e.target.value===""){return}
});
document.addEventListener("paste",e=>{const d=$("#prof");if(!d||!d.open||!profId)return;
  const its=[...(e.clipboardData||{}).items||[]].filter(i=>i.type.startsWith("image/"));if(!its.length)return;e.preventDefault();
  if(pfTab(profId)==="echo")echoQueue(profId,its.map(i=>i.getAsFile()));else ocrStats(its[0].getAsFile());});
const DROPZ="#pfPaste,.ecard";
$("#prof").addEventListener("dragover",e=>{const z=e.target.closest(DROPZ);if(z){e.preventDefault();z.classList.add("over")}});
$("#prof").addEventListener("dragleave",e=>{const z=e.target.closest(DROPZ);if(z)z.classList.remove("over")});
$("#prof").addEventListener("drop",e=>{const z=e.target.closest(DROPZ);if(!z)return;e.preventDefault();z.classList.remove("over");const fs=[...e.dataTransfer.files].filter(f=>f.type.startsWith("image/"));if(!fs.length)return;
  if(z.id==="pfPaste")return ocrStats(fs[0]);
  if(z.classList.contains("ecard")&&fs.length===1){echoSel=+z.dataset.eslot}
  echoQueue(profId,fs)});
$("#prof").addEventListener("change",e=>{
  if(e.target.id==="pfFile"){const f=e.target.files[0];if(f)ocrStats(f);return}
  if(e.target.id==="pfEFile"){const fs=[...e.target.files];e.target.value="";if(fs.length)echoQueue(profId,fs);return}
  const T=e.target,ds=T.dataset;
  if(ds.eseta!=null)return saveEchoSet(profId,{a:T.value});
  if(ds.esetb!=null)return saveEchoSet(profId,{b:T.value});
  if(ds.ecost!=null||ds.emk!=null||ds.emv!=null||ds.eme!=null||ds.esk!=null||ds.esv!=null){
    const a=echoSlots(profId);const i=+(ds.ecost??ds.emk??ds.emv??ds.eme??String(ds.esk??ds.esv).split(":")[0]);const x=a[i];if(!x)return;
    const e2=JSON.parse(JSON.stringify(x));
    if(ds.ecost!=null){e2.cost=+T.value;const M=(EchoDB.mainStats(e2.cost)||{}).main||{};if(M[e2.main.k]==null){const k=Object.keys(M)[0];e2.main={k,v:M[k]}}}
    if(ds.emk!=null){const M=(EchoDB.mainStats(e2.cost)||{}).main||{};e2.main={k:T.value,v:M[T.value]??e2.main.v};if(T.value==="el")e2.main.elem=charMap[profId].el}
    if(ds.emv!=null)e2.main.v=+T.value||0;
    if(ds.eme!=null)e2.main.elem=T.value;
    if(ds.esk!=null||ds.esv!=null){const j=+String(ds.esk??ds.esv).split(":")[1];const subs=(e2.subs||[]).slice();while(subs.length<=j)subs.push(null);
      const cur=subs[j]||{k:"",v:0};if(ds.esk!=null){cur.k=T.value;const t=EchoDB.subTiers(T.value);if(t&&!cur.v)cur.v=t[0]}else cur.v=+T.value||0;
      subs[j]=cur.k?cur:null;e2.subs=subs.filter(Boolean)}
    a[i]=e2;return saveEchoes(profId,a)}
  if(e.target.dataset.st){const g=state.growth[profId]=state.growth[profId]||{};const st=g.stats=Object.assign({b:{}},g.stats||{});const v=e.target.value===""?null:+e.target.value;
    if(e.target.dataset.grp==="b"){st.b=Object.assign({},st.b);if(v==null)delete st.b[e.target.dataset.st];else st.b[e.target.dataset.st]=v}else{if(v==null)delete st[e.target.dataset.st];else st[e.target.dataset.st]=v}
    persist();$("#pfStSum").textContent=statSum(profId);$("#pfScore").textContent=charScore(profId).toFixed(1);renderRoster();rerenderPlan();return}
  if(e.target.id==="pfLv"||e.target.id==="pfLvN")return setGrowth(profId,{lv:clamp(+e.target.value||90,1,90)});
  if(e.target.id==="pfTrial")return setGrowth(profId,{trial:e.target.checked});
  if(e.target.id==="pfOwn"){if(!!state.owned[profId]!==e.target.checked)toggleOwned(profId);renderProfile();}
});
$("#ownAll").addEventListener("click",()=>{appMediator.characters.setAllOwned(true);persist();renderRoster();rerenderPlan()});
$("#ownNone").addEventListener("click",()=>{appMediator.characters.setAllOwned(false);appMediator.teams.clearSlots();persist();renderRoster();rerenderPlan()});
// cycle
$("#cycleSave").addEventListener("click",()=>{
  const m=$("#cycleMsg");
  try{const o=JSON.parse($("#cycleJson").value);
    if(!Array.isArray(o.bosses)||!Array.isArray(o.buffs)) throw new Error("bosses와 buffs는 배열이어야 합니다.");
    state.cycle=o;derive();persist();renderAll();m.className="msg okm";m.textContent="주기 데이터를 적용했습니다.";
  }catch(err){m.className="msg err";m.textContent="적용하지 못했습니다: "+err.message}
});
$("#cycleReset").addEventListener("click",()=>{state.cycle=null;derive();persist();renderAll();$("#cycleMsg").className="msg okm";$("#cycleMsg").textContent="data/cycle.js 기본값으로 되돌렸습니다."});
// chars
$("#charSave").addEventListener("click",()=>{
  const m=$("#charMsg");
  try{const arr=JSON.parse($("#charJson").value);if(!Array.isArray(arr))throw new Error("배열이어야 합니다.");
    const bad=arr.find(c=>!c||!c.id||!c.name||!EL[c.el]||![4,5].includes(+c.rar));
    if(bad) throw new Error(`형식이 맞지 않는 항목: ${JSON.stringify(bad)}`);
    const ids=new Set();for(const c of arr){if(ids.has(c.id))throw new Error("중복된 id: "+c.id);ids.add(c.id);c.rar=+c.rar;c.role=c.role||"dps"}
    state.chars=arr;derive();persist();renderAll();m.className="msg okm";m.textContent=`공명자 ${arr.length}명을 적용했습니다.`;
  }catch(err){m.className="msg err";m.textContent="적용하지 못했습니다: "+err.message}
});
$("#charReset").addEventListener("click",()=>{state.chars=null;derive();persist();renderAll();$("#charMsg").className="msg okm";$("#charMsg").textContent="기본 목록으로 되돌렸습니다."});
// data
$("#btnCopy").addEventListener("click",async()=>{const b=$("#exportBox");try{await navigator.clipboard.writeText(b.value);$("#dataMsg").className="msg okm";$("#dataMsg").textContent="복사했습니다."}catch(e){b.focus();b.select();$("#dataMsg").className="msg";$("#dataMsg").textContent="선택해 두었습니다. Ctrl+C로 복사하세요."}});
function doImport(text){
  const m=$("#dataMsg");
  try{const o=JSON.parse(text);if(!o||typeof o!=="object"||!o.owned)throw new Error("편성기 백업 형식이 아닙니다.");
    replaceState(o);derive();persist();renderAll();m.className="msg okm";m.textContent="백업을 불러왔습니다.";
  }catch(err){m.className="msg err";m.textContent="불러오지 못했습니다: "+err.message}
}
$("#btnImport").addEventListener("click",()=>doImport($("#importBox").value));
$("#fileIn").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>doImport(String(r.result));r.readAsText(f);e.target.value=""});
$("#btnDownload").hidden=false;
$("#btnDownload").addEventListener("click",()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="matrix-planner-backup.json";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});

/* ---------- routing ---------- */
const VIEWS=["plan","roster","invest","records","updates","cycle","data"];
document.getElementById("cycleTab").hidden=!IS_ADMIN;
function route(){const h=(location.hash||"").slice(1);let v=VIEWS.includes(h)?h:"plan";if(v==="cycle"&&!IS_ADMIN)v="plan";
  VIEWS.forEach(x=>document.getElementById("v-"+x).classList.toggle("on",x===v));
  document.querySelectorAll("nav.tabs a").forEach(a=>{if(a.dataset.v===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  if(v==="plan")setPlanTop();}
// 배치 화면 세 칸의 높이를 '머리글 아래 남은 화면'에 맞춘다 → 칸이 화면 밖으로 잘리지 않음
function setPlanTop(){const el=document.querySelector("#v-plan .plan");if(!el||!el.offsetParent)return;
  const t=Math.round(el.getBoundingClientRect().top+window.scrollY);document.documentElement.style.setProperty("--plan-top",t+"px")}
window.addEventListener("resize",setPlanTop);
window.addEventListener("hashchange",route);

/* ---------- theme toggle ---------- */
function isDark(){const t=document.documentElement.getAttribute("data-theme");return t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches}
function paintThemeBtn(){const b=document.getElementById("themeBtn");const d=isDark();b.textContent=d?"☀ 라이트 모드":"☾ 다크 모드";b.setAttribute("aria-pressed",String(d))}
document.getElementById("themeBtn").addEventListener("click",()=>{
  const next=isDark()?"light":"dark";document.documentElement.setAttribute("data-theme",next);
  try{localStorage.setItem("mp-theme",next)}catch(e){}paintThemeBtn();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",paintThemeBtn);
paintThemeBtn();

/* ---------- boot ---------- */
state=appMediator.load();derive();simCache=simulate(state.teams);archiveIfCycleChanged();renderAll();route();
setSave("ok","이 브라우저에 저장됨");
connect();
loadPortraits();loadGameImages();
})();
