/* 여우의 별자리 — 전도 · 5★ · 메인 딜러 */
MP.addChar({
  id:"hsin", name:"여우의 별자리", el:"electro", rar:5, role:"dps",
  release:75, eid:1311, region:"mengzhou",  // 출시 순서 · encore.moe 번호(이미지) · 지역(등급 아이콘)

  // 공명 모드 — 모드마다 다른 값(syn·outro·sets 등)은 여기 적는다. 없는 필드는 아래 공통 값을 쓴다. 0번 = 게임 기본 모드
  // name: 게임 공식 명칭 · icon: 게임 아이콘(encore.moe RoleLabel) · 출처: encore.moe 고유 스킬·반주 스킬 설명
  // outro.cond.to: 받는 쪽 본인이 m을 갖고 파티에 m 공명자가 2명 이상일 때 · noSelf: 반주를 쓴 본인은 받지 않음
  modes:[
    {id:"unison",name:"공명 모드 · 합일",icon:"SP_RoleLabelI8",
      syn:{o:"합일을 얻은 파티원(여우의 별자리 제외) 전체 피해 +20% (30초)",ob:["all"],p:1,w:["skill"],m:["unison"]},
      outro:{v:{},cond:{m:["unison"],to:1,v:{all:20}},noSelf:1}},
    {id:"flare",name:"공명 모드 · 전자",icon:"SP_RoleLabelI9",
      syn:{o:"여우의 별자리를 제외한 파티 전도 피해 +20% (20초)",ob:["el"],p:1,w:["skill"],m:["flare"]},
      outro:{v:{el:20},noSelf:1}},
  ],
  // 피해 비중(%) — 합일 모드 기준(Prydwen 측정 파티: 쇄명·파수인)
  profile:{basic:7.6,skill:85.9,lib:2.1,outro:1.7,echo:2.6},
  // S0 기본 DPS
  dps:215294,
  // Prydwen 한 바퀴 시간(초) · DPS를 잴 때 함께 넣은 파티원(빈 목록 = 혼자 잰 값)
  rot:10.6, dpsTeam:["suoming","shorekeeper"],
  // 0~6체인 DPS 배율
  chain:[1,1.089,1.286,1.591,1.685,1.685,2.692],

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[10300,463,1112],
  // '이 정도면 잘 키웠다' 기준 스탯
  ijk:{main:["atk",2400],cr:75,cd:260,el:1,cfg:"속공",node:0},
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다 (이잘키 표). erNote: 돌파·조합에 따른 차이, erAdj: 자동 보정
  er:120,
  erNote:"120~125",
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{cr:70,cd:260,er:110,src:13151},
  gb:1311,
  // 고유 스탯 노드 합계
  nodes:{cr:8,"atk%":12},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["꿈으로 세상을 비추는 마음",5]],

  // 무기 종류
  wtype:5,
  // 무기별 성능 [무기 id, 기준 재련, 성능 %]
  weapons:[[21050116,1,100],[21050066,1,88.89],[21050016,1,82.78],[21050056,1,80.98],[21050086,1,79.96],[21050046,1,78.02],[21050076,1,78.02],[21050015,1,72.2],[21050074,5,72.26],[21050084,5,65.83],[21050104,5,70.41],[21050044,5,64.37]],
  // 자동 추천 궁합 (1 = 정석 파트너)
  pairs:{suoming:1,lily:1,buling:0.6},
});
