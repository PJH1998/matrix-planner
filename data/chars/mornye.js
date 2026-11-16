/* 모니에 — 용융 · 5★ · 서포터 */
MP.addChar({
  id:"mornye", name:"모니에", el:"fusion", rar:5, role:"support",
  release:61, eid:1209,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"파티 전체 피해 +25% (30초)",ob:["all"],p:1,w:[],m:["tuneW","tuneD"]},
  // 파티 딜증(%)
  amp:35,
  // 간섭 표기: 조화 파동·밀집 간섭 상태 목표에게 파티 피해 증가(최대 40%, 공명 효율 비례) → 조화 파티 +20%
  supCond(x,ids,main,C){return ids.some(y=>y!=="mornye"&&C.has(y,["tuneD","tuneW"]))?{a:0.20,t:["조화 간섭 표기: 피해 증가"]}:{a:0,t:[]}},

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[15375,288,1357],
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다
  er:240,
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{heal:48.4,def:3200,hp:19935,er:260,src:13135},
  gb:1209,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"def%":15.2},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["빛을 쫓는 별의 고리",5]],

  // 무기 종류
  wtype:1,
});
