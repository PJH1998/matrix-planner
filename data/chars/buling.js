/* 복링 — 전도 · 4★ · 서포터 */
MP.addChar({
  id:"buling", name:"복링", el:"electro", rar:4, role:"support",
  release:58, eid:1307,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"지속 회복, 파티 전체 피해 +15% (30초)",ob:["all"],p:1,w:[],m:["flare"]},
  // 파티 딜증(%)
  amp:20,
  // 뇌법: 변주 두 번 뒤 파티 공명 스킬 피해 보너스 +25% → 공명 스킬 비중 × 25% ÷ 1.9
  supCond(x,ids,main,C){const sh=C.share(x,"skill");return sh>0.05?{a:sh*0.25/C.BONUS_BASE,t:["공명 스킬 피해 보너스 +25%"]}:{a:0,t:[]}},

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[10625,225,1259],
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{er:160,heal:48.4,atk:2400,src:13133},
  supportTargets:{atk:2400,er:160},
  supportTargetAdjust:[{chain:2,er:130}], // 2체인 이후: 팀에 따라 공효 125~135% (Prydwen)
  defaultWeaponId:21050024,
  gb:1307,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"atk%":12},

  // 무기 종류
  wtype:5,
});
