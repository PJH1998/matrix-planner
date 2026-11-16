/* 벨리나 — 회절 · 5★ · 서포터 */
MP.addChar({
  id:"verina", name:"벨리나", el:"spectro", rar:5, role:"support",
  release:3, eid:1503,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"다음 캐릭터 지속 회복, 파티 전체 피해 +15% (30초)",ob:["all"],p:1,w:[],m:["coord"]},
  // 파티 딜증(%)
  amp:30,

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[14238,338,1100],
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다
  er:220,
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{atk:2500,heal:48,er:210,src:13015},
  gb:1503,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"atk%":12},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["찬란한 광휘",5]],

  // 무기 종류
  wtype:5,
});
