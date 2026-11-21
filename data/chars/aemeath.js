/* 에이메스 — 용융 · 5★ · 메인 딜러 */
MP.addChar({
  id:"aemeath", name:"에이메스", el:"fusion", rar:5, role:"dps",
  release:62, eid:1210, region:"lahairoi",  // 출시 순서 · encore.moe 번호(이미지) · 지역(등급 아이콘)

  // 공명 모드 — 모드마다 다른 값(syn·outro·sets 등)은 여기 적는다. 없는 필드는 아래 공통 값을 쓴다. 0번 = 게임 기본 모드
  // name: 게임 공식 명칭 · icon: 게임 아이콘(encore.moe RoleLabel) · 출처: encore.moe 고유 스킬·반주 스킬 설명
  // outro.cond.rx: 받는 쪽 본인이 메커니즘 m을 가져야 cond.v · noSelf: 반주를 쓴 본인은 받지 않음
  modes:[
    {id:"tuneW",name:"공명 모드 · 조화 파동",icon:"SP_RoleLabelI1",
      syn:{o:"에이메스를 제외한 파티 전체 피해 +10%, 조화 파동 · 이탈을 건 캐릭터는 +20% (20초)",ob:["all"],p:1,w:["lib"],m:["tuneW"]},
      outro:{v:{all:10},cond:{m:["tuneW"],rx:1,v:{all:20}},noSelf:1}},
    {id:"burn",name:"공명 모드 · 불꽃",icon:"SP_RoleLabelFire",
      syn:{o:"에이메스를 제외한 파티 전체 피해 +10%, 불꽃 효과를 건 캐릭터는 +20% (20초)",ob:["all"],p:1,w:["lib"],m:["burn"]},
      outro:{v:{all:10},cond:{m:["burn"],rx:1,v:{all:20}},noSelf:1}},
  ],
  // 피해 비중(%) — 조화 파동 모드 기준(Prydwen 측정 파티: 린네·모니에)
  profile:{basic:8.3,lib:67.6,echo:2.6,other:21.4},
  // S0 기본 DPS
  dps:146568,
  // Prydwen 한 바퀴 시간(초) · DPS를 잴 때 함께 넣은 파티원(빈 목록 = 혼자 잰 값)
  rot:10.96, dpsTeam:["lynae","mornye"],
  // 0~6체인 DPS 배율
  chain:[1,1.069,1.304,1.689,1.785,1.785,3.175],

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[11025,425,1149],
  // '이 정도면 잘 키웠다' 기준 스탯
  ijk:{main:["atk",2600],cr:70,cd:270,el:0,cfg:"공공",node:0},
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다 (이잘키 표). erNote: 돌파·조합에 따른 차이, erAdj: 자동 보정
  er:120,
  erNote:"120~125",
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{cr:70,cd:270,er:130,atk:2300,src:13138},
  gb:1210,
  // 고유 스탯 노드 합계
  nodes:{cr:8,"atk%":12},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["긴 여정을 떠나는 별",5]],

  // 무기 종류
  wtype:2,
  // 무기별 성능 [무기 id, 기준 재련, 성능 %]
  weapons:[[21020076,1,100],[21020015,1,85.5],[21020026,1,85.5],[21020066,1,85.1],[21020016,1,84.8],[21020104,5,80.8],[21020017,5,78.1],[21020044,5,77.4]],
  // 자동 추천 궁합 (1 = 정석 파트너)
  pairs:{lynae:1,mornye:1,denia:0.6},
});
