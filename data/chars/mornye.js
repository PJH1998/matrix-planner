/* 모니에 — 용융 · 5★ · 서포터 */
MP.addChar({
  id:"mornye", name:"모니에", el:"fusion", rar:5, role:"support",
  release:61, eid:1209,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"파티 전체 피해 +25% (30초)",ob:["all"],p:1,w:[],m:["tuneW","tuneD"]},
  // 파티 딜증(%)
  amp:25,
  // 간섭 표기: 공효 100% 초과분 1%당 피해 보너스 0.25%, 최대 40%.
  supCond(x,ids,main,C){const er=C.stat("mornye","er"),bonus=Math.min(40,Math.max(0,er-100)*0.25);
    return bonus>0&&(C.chain("mornye")>=1||ids.some(y=>y!=="mornye"&&C.has(y,["tuneD","tuneW"])))?{a:bonus/100/C.BONUS_BASE,t:[`조화 간섭 표기: 피해 보너스 +${bonus.toFixed(1)}%`]}:{a:0,t:[]}},

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[15375,288,1357],
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다 (이잘키 표). erNote: 돌파·조합에 따른 차이, erAdj: 자동 보정
  er:240,
  erBuffCap:260,
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{heal:48.4,def:3200,hp:19935,er:260,src:13135},
  supportTargets:{def:3200,er:260},
  defaultWeaponId:21010066,
  supportWeapons:[[21010066,1,100]],
  statScale:"def",
  gb:1209,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"def%":15.2,er:10},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["빛을 쫓는 별의 고리",5]],

  // 무기 종류
  wtype:1,
});
