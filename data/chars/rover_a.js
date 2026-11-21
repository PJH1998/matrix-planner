/* 방랑자(기류) — 기류 · 5★ · 서브 딜러 */
MP.addChar({
  id:"rover_a", name:"방랑자(기류)", el:"aero", rar:5, role:"sub",
  release:4, eid:1406, region:"jinzhou",  // 출시 순서 · encore.moe 번호(이미지) · 지역(등급 아이콘)

  // 반주·메커니즘
  syn:{o:"파티 전체 침식의 경계: 풍식 효과 최대 스택 +3 (30초)",ob:[],p:1,w:[],m:["erosion","anom"]},
  // 피해 비중(%)
  profile:{basic:5,skill:67.3,lib:18.9,intro:6.6,echo:2.2},
  // S0 기본 DPS
  dps:19408,
  // Prydwen 한 바퀴 시간(초) · DPS를 잴 때 함께 넣은 파티원(빈 목록 = 혼자 잰 값)
  rot:5.96, dpsTeam:[],
  // 0~6체인 DPS 배율
  chain:[1,1,1,1.084,1.14,1.181,1.302],
  // 파티 딜증(%)
  amp:15,

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[10775,438,1137],
  // '이 정도면 잘 키웠다' 기준 스탯
  ijk:{main:["atk",1900],cr:60,cd:200,el:1,cfg:"속공",node:0},
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다 (이잘키 표). erNote: 돌파·조합에 따른 차이, erAdj: 자동 보정
  er:150,
  erNote:"피증+공% 기준(피증+공효 세팅은 200)",
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{cr:69,cd:213,atk:2129,er:150,src:13115},
  gb:1408,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"atk%":12},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["영광이 깃든 바람",5],["찬란한 광휘",5]],

  // 무기 종류
  wtype:2,
});
