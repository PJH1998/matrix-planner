/* 유호 — 응결 · 4★ · 서포터 */
MP.addChar({
  id:"youhu", name:"유호", el:"glacio", rar:4, role:"support",
  release:28.5, eid:1106,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"다음 캐릭터 협동 공격 피해 +100% (28초)",ob:["coord"],w:[],m:["coord"]},
  // 파티 딜증(%)
  amp:10,

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[9975,263,1051],
  // 고유 스탯 노드 합계
  nodes:{cr:8,"atk%":12},

  // 무기 종류
  wtype:4,
});
