/* =====================================================================
   CharDB — 공명자 데이터 중개자
   계산·화면 코드는 공명자 데이터를 이 객체로만 읽는다. 데이터 파일(data/chars/*.js)의 필드 이름이 바뀌어도 여기만 고치면 된다.
   use(roster): 현재 공명자 목록(데이터 탭에서 사용자가 고친 값 포함)을 넘기면, 사용자 값이 있는 필드는 그 값을 우선한다.

   공명 모드(루실라·에이메스·데니아·여우의 별자리·린네): 공명자 파일의 modes[]에 모드마다 다른 값(syn·outro·sets·profile 등)을 적는다.
   모드 값이 있는 필드는 그 모드 값을, 없으면 공명자 공통 값을 쓴다(pick).
   어느 모드로 읽을지: withModes(map, fn) 안에서는 map 값(파티 계산이 고른 모드), 밖에서는 화면에서 고른 모드(setView), 기본은 0번(게임 기본 모드).
   ===================================================================== */
(function(g){
  const MP=g.MP;const R=MP._chars;
  const DT_KEYS=["basic","heavy","skill","lib","echo"];
  const EMPTY_SYN={o:"",ob:[],w:[],m:[]};
  let roster={};const cache={syn:{}};
  const raw=id=>R[id]||{};
  const cur=id=>roster[id]||null;
  /* 공명 모드 */
  const modeList=id=>raw(id).modes||[];
  let active=null;const view={};
  // 지금 모드의 값 → 없으면 공통 값
  const pick=(id,k)=>{const ms=modeList(id);if(ms.length){const m=ms[DB.modeOf(id)];if(m&&m[k]!==undefined)return m[k]}return raw(id)[k]};
  const DB={
    /* 목록 */
    ids:()=>MP.CHAR_LIST.filter(id=>R[id]),
    // 목록에는 있는데 파일이 없거나(오타·누락), 파일은 있는데 목록에 없는 공명자
    check(){const miss=MP.CHAR_LIST.filter(id=>!R[id]),extra=MP._order.filter(id=>!MP.CHAR_LIST.includes(id));
      if(miss.length||extra.length)console.warn("[CharDB] 목록·파일 불일치",{miss,extra});return {miss,extra}},
    defaults:()=>DB.ids().map(id=>{const c=R[id];return {id,name:c.name,el:c.el,rar:c.rar,role:c.role}}),
    use(list){roster={};(list||[]).forEach(c=>{if(c&&c.id)roster[c.id]=c});cache.syn={}},
    info:cur,                         // 현재 목록의 공명자 {id,name,el,rar,role,…}
    known:id=>!!R[id],
    /* 공명 모드 — 모드가 둘 이상인 공명자만. i: 순서(0 = 게임 기본 모드), name: 게임 공식 명칭, short: 버튼용("공명 모드 · " 뒤), icon: 게임 아이콘 파일 이름 */
    hasModes:id=>modeList(id).length>1,
    modes:id=>modeList(id).map((m,i)=>({i,id:m.id,name:m.name,short:String(m.name||"").replace(/^공명 모드\s*·\s*/,""),icon:m.icon||null})),
    modeOf(id){const n=modeList(id).length;if(!n)return 0;const v=active&&active[id]!=null?active[id]:view[id];return Number.isInteger(v)&&v>=0&&v<n?v:0},
    // 화면(에코 세팅 등)에서 보는 모드. 파티 계산은 withModes로 따로 정하므로 영향을 받지 않는다
    viewMode:id=>Number.isInteger(view[id])&&view[id]<modeList(id).length?view[id]:0,
    setView(id,i){if(DB.hasModes(id)&&Number.isInteger(i)&&i>=0&&i<modeList(id).length)view[id]=i;else delete view[id]},
    // 지금 모드의 id (모드 공명자가 아니면 null)
    modeId(id){const ms=modeList(id);return ms.length?(ms[DB.modeOf(id)]||{}).id||null:null},
    // 지금 모드가 필드 k를 따로 적었는지 (예: 모드별 dps)
    modeHas(id,k){const ms=modeList(id);if(!ms.length)return false;const m=ms[DB.modeOf(id)];return !!m&&m[k]!==undefined},
    // map {공명자 id: 모드 순서} 동안 fn을 실행한다. 바깥 map 위에 덮어쓰고, 끝나면 되돌린다
    withModes(map,fn){if(!map||!Object.keys(map).length)return fn();const prev=active;active=Object.assign({},prev||{},map);try{return fn()}finally{active=prev}},
    // ids 중 모드 공명자의 모든 모드 조합 [{id: 모드}] — 첫 조합은 전부 기본 모드
    modeCombos(ids){let out=[{}];[...new Set(ids)].filter(id=>DB.hasModes(id)).forEach(id=>{const n=modeList(id).length,next=[];out.forEach(map=>{for(let i=0;i<n;i++)next.push(Object.assign({},map,{[id]:i}))});out=next});return out},
    /* 반주·메커니즘 */
    // 메인 딜러의 주력 피해 유형은 피해 비중 20% 이상인 유형(피해 비중 데이터가 있을 때, 사용자가 syn을 직접 넣지 않았을 때)
    syn(id){const key=id+"|"+DB.modeOf(id);if(cache.syn[key])return cache.syn[key];const c=cur(id);const base=(c&&c.syn)||pick(id,"syn")||EMPTY_SYN;
      const p=pick(id,"profile");if(!c||c.syn||c.role!=="dps"||!p)return cache.syn[key]=base;
      const w=DT_KEYS.filter(k=>(p[k]||0)>=20).sort((a,b)=>p[b]-p[a]);return cache.syn[key]=w.length?Object.assign({},base,{w}):base},
    has:(id,ms)=>(DB.syn(id).m||[]).some(m=>ms.includes(m)),
    outro:id=>{const c=cur(id);return (c&&c.outroV)||pick(id,"outro")||null},
    shieldUp:id=>+raw(id).shieldUp||0,
    // 파티 전체 부조화 수치 누적 효율 증가(%). 숫자 또는 0~6체인 표
    offTune(id,chain){const v=pick(id,"offTune");if(Array.isArray(v))return +v[Math.max(0,Math.min(v.length-1,Math.round(+chain||0)))]||0;return +v||0},
    // 스킬이 에코 어빌리티 발동으로 간주되는 횟수(이름이 다른 에코 어빌리티로 셈). 공명 모드마다 다를 수 있다
    echoExtra:id=>+pick(id,"echoExtra")||0,
    needs:id=>{const c=cur(id);return (c&&c.needs)||pick(id,"needs")||null},
    supCond:id=>pick(id,"supCond")||null,
    /* 피해 비중 */
    profile:id=>pick(id,"profile")||null,
    share:(id,k)=>((pick(id,"profile")||{})[k]||0)/100,                       // 피해 유형 k의 비중(0~1), 데이터 없으면 0
    shareOf(id,types){const p=pick(id,"profile");if(!p)return null;return types.reduce((a,k)=>a+(p[k]||0),0)/100}, // 없으면 null
    typeShare(id,k){const p=pick(id,"profile");if(p)return (p[k]||0)/100;const w=DB.syn(id).w||[];return w.includes(k)?0.6/w.length:0},
    /* DPS·체인·딜증 */
    baseDps:id=>{const c=cur(id);return c&&c.baseDps!=null?+c.baseDps:pick(id,"dps")},
    hasDps:id=>{const c=cur(id);return (c&&c.baseDps!=null)||pick(id,"dps")!=null},
    chain:id=>{const c=cur(id);return (c&&c.chainMul)||pick(id,"chain")||null},
    hasChainData:id=>!!raw(id).chain,
    amp:id=>{const c=cur(id);return c&&c.amp!=null?+c.amp:(pick(id,"amp")||0)},
    hasAmp:id=>{const c=cur(id);return (c&&c.amp!=null)||pick(id,"amp")!=null},
    rot:id=>pick(id,"rot")||null,                      // Prydwen 한 바퀴 시간(초)
    dpsTeam:id=>pick(id,"dpsTeam")||null,              // dps를 잴 때 함께 넣은 파티원 (빈 목록 = 혼자)
    chainStats:id=>raw(id).chainStats||[],          // 체인으로 오르는 상시 스탯 [{chain, 스탯 키: 값}]
    buffChain:id=>raw(id).buffChain||null,          // 서포터 0~6체인 버프 배율
    // 체험 세팅 {from: "stats"|"guide"|"ijk", stats, weapon, chain}. ijk면 stats 없이 이잘키 기준을 쓴다
    trialSpec:id=>{const T=MP.TRIAL||{},own=(T.stats||{})[id],keys=["atk","hp","def","cr","cd","er","el","heal"];
      const pick=o=>{const out={};keys.forEach(k=>{if(o&&o[k]!=null)out[k]=+o[k]});return Object.keys(out).length?out:null};
      const from=src=>src==="guide"?pick(raw(id).guide):null;
      let stats=from(T.source),src=stats?T.source:null;if(!stats&&T.fallback&&T.fallback!=="ijk"){stats=from(T.fallback);src=stats?T.fallback:null}
      if(!stats)src="ijk";if(own){stats=Object.assign({},stats||{},pick(own));src="stats"}
      return {from:src,stats,weapon:T.weapon||"default",chain:T.chain==null?null:+T.chain}},
    /* 스탯 */
    base:id=>raw(id).base||null,
    ijk:id=>raw(id).ijk||null,
    // 공명 효율 최소치 {min, est}. 표에 없으면 역할별 기본값(메인 120 / 서브 125 / 서포터 200, 추정)
    // 공명 효율 최소치 {min, src, note, adj}: 이잘키 표 → 공식 공략 사이트 추천 → 역할별 기본값(메인 120 / 서브 125 / 서포터 200, 추정)
    erMin:id=>{const r=raw(id);const ex={note:r.erNote||null,adj:r.erAdj||[]};
      if(r.er!=null)return Object.assign({min:+r.er,src:"ijk"},ex);
      if(r.guide&&r.guide.er!=null)return Object.assign({min:+r.guide.er,src:"guide"},ex);
      const c=cur(id)||r;return Object.assign({min:({dps:120,sub:125,support:200})[c.role]||120,src:"est",est:true},ex)},
    guide:id=>raw(id).guide||null,          // 공식 공략 사이트 추천 스탯 {cr, cd, er, atk, hp, def, heal, el, skill, gt:[초과 조건 키], src}
    supportTargets:id=>raw(id).supportTargets||null,
    supportTargetAdjust:id=>raw(id).supportTargetAdjust||[],
    gb:id=>raw(id).gb,
    scale:id=>{const c=cur(id);return (c&&c.statScale)||raw(id).statScale||"atk"},
    hpConv:id=>raw(id).hpConv||null,          // HP 변환 {cap, screen:{atk, el}, fight:{el}, mul:{피해 유형:{from, per}}} — 공격력 계수인데 HP로 강해지는 공명자(경연)
    nodes:id=>raw(id).nodes||{},
    combatErAtk:id=>raw(id).combatErAtk||null,
    erBuffCap:id=>raw(id).erBuffCap||null,
    sets:id=>pick(id,"sets")||[],
    /* 무기 */
    wtype:id=>{const c=cur(id);return (c&&c.wtype)||raw(id).wtype||null},
    weaponPerf:id=>raw(id).weapons||[],
    supportWeaponPerf:id=>raw(id).supportWeapons||[],
    defaultWeaponId:id=>raw(id).defaultWeaponId||null,
    teamWeaponBuff:(id,wid)=>(raw(id).teamWeaponBuff||{})[wid]||null,
    /* 기타 */
    release:id=>raw(id).release,
    regions:()=>MP.REGIONS||[],
    region:id=>(MP.REGIONS||[]).find(r=>r.id===raw(id).region)||null,          // 공명자 지역 {id, name, ver}
    regionNo:id=>{const i=(MP.REGIONS||[]).findIndex(r=>r.id===raw(id).region);return i<0?1:i+1}, // 지역 번호(1부터, 없으면 1) = 등급 아이콘 번호
    eid:id=>raw(id).eid,
    pairs:id=>raw(id).pairs||{},
    pairW:(a,b)=>(raw(a).pairs||{})[b]||0,
    /* 여러 공명자에 걸친 조합(data/teams.js) */
    presets:()=>MP.TEAM_PRESETS||[],
    combos:()=>MP.COMBOS||[],
    minPoints:()=>MP.MIN_POINTS||1000
  };
  MP.CharDB=DB;
})(typeof window!=="undefined"?window:globalThis);
