/* =====================================================================
   CharDB — 공명자 데이터 중개자
   계산·화면 코드는 공명자 데이터를 이 객체로만 읽는다. 데이터 파일(data/chars/*.js)의 필드 이름이 바뀌어도 여기만 고치면 된다.
   use(roster): 현재 공명자 목록(데이터 탭에서 사용자가 고친 값 포함)을 넘기면, 사용자 값이 있는 필드는 그 값을 우선한다.
   ===================================================================== */
(function(g){
  const MP=g.MP;const R=MP._chars;
  const DT_KEYS=["basic","heavy","skill","lib","echo"];
  const EMPTY_SYN={o:"",ob:[],w:[],m:[]};
  let roster={};const cache={syn:{}};
  const raw=id=>R[id]||{};
  const cur=id=>roster[id]||null;
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
    /* 반주·메커니즘 */
    // 메인 딜러의 주력 피해 유형은 피해 비중 20% 이상인 유형(피해 비중 데이터가 있을 때, 사용자가 syn을 직접 넣지 않았을 때)
    syn(id){if(cache.syn[id])return cache.syn[id];const c=cur(id);const base=(c&&c.syn)||raw(id).syn||EMPTY_SYN;
      const p=raw(id).profile;if(!c||c.syn||c.role!=="dps"||!p)return cache.syn[id]=base;
      const w=DT_KEYS.filter(k=>(p[k]||0)>=20).sort((a,b)=>p[b]-p[a]);return cache.syn[id]=w.length?Object.assign({},base,{w}):base},
    has:(id,ms)=>(DB.syn(id).m||[]).some(m=>ms.includes(m)),
    outro:id=>{const c=cur(id);return (c&&c.outroV)||raw(id).outro||null},
    needs:id=>{const c=cur(id);return (c&&c.needs)||raw(id).needs||null},
    supCond:id=>raw(id).supCond||null,
    /* 피해 비중 */
    profile:id=>raw(id).profile||null,
    share:(id,k)=>((raw(id).profile||{})[k]||0)/100,                       // 피해 유형 k의 비중(0~1), 데이터 없으면 0
    shareOf(id,types){const p=raw(id).profile;if(!p)return null;return types.reduce((a,k)=>a+(p[k]||0),0)/100}, // 없으면 null
    typeShare(id,k){const p=raw(id).profile;if(p)return (p[k]||0)/100;const w=DB.syn(id).w||[];return w.includes(k)?0.6/w.length:0},
    /* DPS·체인·딜증 */
    baseDps:id=>{const c=cur(id);return c&&c.baseDps!=null?+c.baseDps:raw(id).dps},
    hasDps:id=>{const c=cur(id);return (c&&c.baseDps!=null)||raw(id).dps!=null},
    chain:id=>{const c=cur(id);return (c&&c.chainMul)||raw(id).chain||null},
    hasChainData:id=>!!raw(id).chain,
    amp:id=>{const c=cur(id);return c&&c.amp!=null?+c.amp:(raw(id).amp||0)},
    hasAmp:id=>{const c=cur(id);return (c&&c.amp!=null)||raw(id).amp!=null},
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
    nodes:id=>raw(id).nodes||{},
    combatErAtk:id=>raw(id).combatErAtk||null,
    erBuffCap:id=>raw(id).erBuffCap||null,
    sets:id=>raw(id).sets||[],
    /* 무기 */
    wtype:id=>{const c=cur(id);return (c&&c.wtype)||raw(id).wtype||null},
    weaponPerf:id=>raw(id).weapons||[],
    supportWeaponPerf:id=>raw(id).supportWeapons||[],
    defaultWeaponId:id=>raw(id).defaultWeaponId||null,
    /* 기타 */
    release:id=>raw(id).release,
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
