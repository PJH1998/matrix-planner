/* =====================================================================
   BossDB — 보스·주기 데이터 중개자
   주기(data/cycle.js), 효과 조건 표(data/conds.js), 보스 정보(data/bosses/*.js, MP.addBoss)를 모아
   계산·화면 코드에 HP·점수·저항·조건을 내준다. 계산 코드는 보스 데이터 구조를 직접 알지 않는다.
   use(cycle): 관리자 모드에서 고친 주기를 쓸 때 넘긴다(없으면 data/cycle.js 기본값).
   ===================================================================== */
(function(g){
  const MP=g.MP;
  const EMPTY={name:"",period:"",bosses:[],buffs:[],vigor2:[],emergency:null,dmgBonus:{},examples:[]};
  /* 보스 HP·점수 (2026-11-16 재보정 — 상위권 플레이 영상의 파티별 점수·보스 HP 14건)
     점수 = 준 피해(1R 보스 HP 단위) × 4,750점 × 라운드 점수 배율(1R 1.0 / 2R 1.1 / 3R 이후 1.25, 게임 표기).
     라운드별 보스 HP: 2R 1.77배, 3R 3.36배(영상의 라운드별 점수 ÷ 점수 배율), 4R 이후는 라운드마다 ×2.1로 가정(측정 없음).
     매트릭스 미믹은 라운드 마지막 5번째, HP 1.1배 · 점수 1.1배 · 처치 1,000점(data/cycle.js의 hpMul·scoreMul·killBonus).
     메인 딜러 속성을 보스가 저항하면 피해 × RES_MUL. */
  const ROUND_HP_TABLE=[1,1.77,3.36], ROUND_HP_GROW=2.1;
  const PTS_PER_BOSS=4750, RES_MUL=0.6, MAX_ROUNDS=8;
  const roundPts=r=>r<=1?1:r===2?1.1:1.25;
  const roundHp=r=>r<=ROUND_HP_TABLE.length?ROUND_HP_TABLE[r-1]:ROUND_HP_TABLE[ROUND_HP_TABLE.length-1]*Math.pow(ROUND_HP_GROW,r-ROUND_HP_TABLE.length);
  let cur=null;
  const DB={
    MAX_ROUNDS,
    /* 주기 */
    defaultCycle:()=>g.MATRIX_CYCLE||EMPTY,
    use(c){cur=c||null},
    cycle:()=>cur||DB.defaultCycle(),
    bosses:()=>DB.cycle().bosses||[],
    buffs:()=>DB.cycle().buffs||[],
    buff:id=>DB.buffs().find(b=>b.id===id),
    examples:()=>DB.defaultCycle().examples||[],
    dmgBonus:id=>(DB.cycle().dmgBonus||{})[id],
    // 배치 가능 횟수: 기본 1, 2회 공명자 2, 긴급 공명자는 추가
    vigor(id){const c=DB.cycle();let v=(c.vigor2||[]).includes(id)?2:1;if(c.emergency&&c.emergency.id===id)v+=(c.emergency.extraVigor||1);return v},
    /* 전투 수치 */
    hp:(b,r)=>roundHp(r)*((b&&b.hpMul)||1),                         // 라운드 r 보스 HP(1R 보스 HP 단위)
    points:(dealt,b,r)=>dealt*PTS_PER_BOSS*roundPts(r)*((b&&b.scoreMul)||1),
    killBonus:b=>(b&&b.killBonus)||0,
    resMul:(b,el)=>b&&b.res&&b.res===el?RES_MUL:1,
    /* 효과 조건 */
    cond:k=>(MP.CONDS||{})[k],
    conds:()=>MP.CONDS||{},
    anom:()=>MP.ANOM||[],
    /* 보스 정보(패턴 등) — data/bosses/*.js 에서 등록. 주기의 보스 이름이나 id로 찾는다 */
    info:key=>MP._bosses[key]||MP._bossOrder.map(id=>MP._bosses[id]).find(b=>b.name===key)||null,
    infoList:()=>MP._bossOrder.map(id=>MP._bosses[id])
  };
  MP.BossDB=DB;
})(typeof window!=="undefined"?window:globalThis);
