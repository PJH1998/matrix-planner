/* 도기 — 인멸 · 4★ · 서포터 */
MP.addChar({
  id:"taoqi", name:"도기", el:"havoc", rar:4, role:"support",
  release:9, eid:1601, region:"jinzhou",  // 출시 순서 · encore.moe 번호(이미지) · 지역(등급 아이콘)

  // 반주·메커니즘
  syn:{o:"다음 캐릭터 공명 스킬 피해 +38% (14초)",ob:["skill"],w:[],m:[]},
  // 반주 버프 수치(%)
  outro:{v:{skill:38}},
  // 피해 비중(%)
  profile:{basic:43.1,skill:9.7,lib:37.3,intro:4,echo:5.8},
  // S0 기본 DPS
  dps:7222,
  // 0~6체인 DPS 배율
  chain:[1,1,1.084,1.084,1.084,1.16,1.189],

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[8950,225,1564],
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{def:4000,src:13018},
  supportTargets:{def:4000,er:126},
  supportTargetAdjust:[{chain:5,set:"떠오르는 구름",er:100}], // 5체인 + 떠오르는 구름: 추가 공효 불필요 (Prydwen)
  defaultWeaponId:21010024,
  statScale:"def",
  gb:1601,
  // 고유 스탯 노드 합계
  nodes:{el:12,"def%":15.2},

  // 무기 종류
  wtype:1,
  // 무기별 성능 [무기 id, 기준 재련, 성능 %]
  weapons:[[21010024,5,100],[21010044,5,107.54]],
});
