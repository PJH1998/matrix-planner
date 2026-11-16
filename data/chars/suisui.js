/* 수수 — 응결 · 5★ · 서포터 */
MP.addChar({
  id:"suisui", name:"수수", el:"glacio", rar:5, role:"support",
  release:71, eid:1110,  // 출시 순서 · encore.moe 번호(이미지)

  // 반주·메커니즘
  syn:{o:"파티 전체 피해 +25% (30초), 꽃향기의 편지 소모량에 따라 추가 효과",ob:["all"],p:1,w:[],m:["frost","anom"]},
  // 파티 딜증(%)
  amp:35,
  // 공명 해방(천리강산): 암흑 효과 소모 후 인멸 피해가 방어력 6%·인멸 저항 12% 무시 → 암흑 파티의 인멸 공명자 +15%
  // 이상 효과 스택 최대치 +3 → 이상 효과 피해 비중 × 30% (치사의 같은 효과와는 중첩 안 됨)
  supCond(x,ids,main,C){let a=0;const t=[];
    if(ids.some(y=>C.has(y,["bane"]))&&C.el(x)==="havoc"){a+=0.15;t.push("암흑: 인멸 저항 무시")}
    const sh=C.share(x,"other");
    if(sh>0&&!ids.includes("chisa")&&ids.some(y=>C.has(y,["frost","burn","erosion","frazzle","flare"]))){a+=sh*0.3;t.push("이상 효과 스택 +3")}
    return {a,t}},

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[16713,288,1100],
  // 공명 효율 최소치(%) — 못 채우면 사이클이 밀린다 (이잘키 표). erNote: 돌파·조합에 따른 차이, erAdj: 자동 보정
  er:260,
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{er:260,hp:40000,src:13148},
  gb:1110,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"hp%":12},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["내려앉은 깃털의 노래",5]],

  // 무기 종류
  wtype:5,
});
