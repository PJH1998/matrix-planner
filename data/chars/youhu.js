/* 유호 — 응결 · 4★ · 서포터 */
MP.addChar({
  id:"youhu", name:"유호", el:"glacio", rar:4, role:"support",
  release:28.5, eid:1106, region:"jinzhou",  // 출시 순서 · encore.moe 번호(이미지) · 지역(등급 아이콘)

  // 반주·메커니즘
  syn:{o:"다음 캐릭터 협동 공격 피해 +100% (28초)",ob:["coord"],w:[],m:["coord"]},
  // 파티 딜증(%)
  amp:10,
  // 공명 체인으로 오르는 상시 스탯(파티에 넣고 필드에 꺼내면 스탯 화면에 보이는 값) — 최종 스탯에 더한다
  chainStats:[{chain:3,"atk%":20}],

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[9975,263,1051],
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{cr:60,cd:220,src:13007},
  supportTargets:{er:100},
  defaultWeaponId:21040024,
  gb:1106,
  // 고유 스탯 노드 합계
  nodes:{cr:8,"atk%":12},

  // 무기 종류
  wtype:4,
});
