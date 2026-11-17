/* 설지 — 응결 · 4★ · 서포터 */
MP.addChar({
  id:"baizhi", name:"설지", el:"glacio", rar:4, role:"support",
  release:6, eid:1103,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"다음 캐릭터 지속 회복, 회복받으면 전체 피해 +15% (6초)",ob:["all"],w:[],m:["coord"]},
  // 파티 딜증(%)
  amp:15,

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[12813,213,1002],
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{er:220,heal:48,hp:30000,src:13020},
  supportTargets:{hp:30000,er:220},
  defaultWeaponId:21050036,
  teamWeaponBuff:{21050036:[{atk:14}]},
  statScale:"hp",
  gb:1103,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"hp%":12},

  // 무기 종류
  wtype:5,
});
