/* 파수인 — 회절 · 5★ · 서포터 */
MP.addChar({
  id:"shorekeeper", name:"파수인", el:"spectro", rar:5, role:"support",
  release:28, eid:1505,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"파티 전체 피해 +15%, 피격 회피 보조 (30초)",ob:["all"],p:1,w:[],m:[]},
  // 파티 딜증(%)
  amp:40,

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[16713,288,1100],
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다 (이잘키 표). erNote: 돌파·조합에 따른 차이, erAdj: 자동 보정
  er:240,
  erNote:"'오류' 메인 에코면 230",
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{er:230,gt:["er", "cd"],cd:190,src:13008},
  gb:1505,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"hp%":12},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["찬란한 광휘",5]],

  // 무기 종류
  wtype:5,
});
