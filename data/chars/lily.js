/* 릴리 — 회절 · 5★ · 서포터 */
MP.addChar({
  id:"lily", name:"릴리", el:"spectro", rar:5, role:"support",
  release:77, eid:1512, region:"mengzhou",  // 출시 순서 · encore.moe 번호(이미지) · 지역(등급 아이콘)

  // 반주·메커니즘
  shieldUp:0.3, // 실드 유지율(예측치, 0~1)
  syn:{o:"파티 전체 피해 +25% (30초). 공명 해방 후 다른 캐릭터가 변주 스킬을 쓰면 꿈내음(파티 공격력 증가, 최대 4스택). 강공격 종막 뒤 반주 시 빛바랜 꿈결: 합일 버프 스택당 공격력 증가, 에코 어빌리티 크리티컬·크리티컬 피해 증가",ob:["all"],p:1,w:[],m:["unison","shield"]},
  // 파티 딜증(%)
  amp:25,
  // 공효 190~260% 구간: 꿈내음 공격력(4스택) → 전 파티원 최대 +14% 환산
  // 빛바랜 꿈결: 합일 버프 4스택 공격력 → 합일 공명자 최대 +14%, 에코 크리티컬 → 에코 피해 비중 × 최대 12%
  supCond(x,ids,main,C){let a=0;const t=[],rate=Math.max(0,Math.min(1,(C.stat("lily","er")-190)/70));
    if(rate>0){a+=0.14*rate;t.push(`꿈내음: 공격력 (공효 ${C.stat("lily","er").toFixed(1)}%)`)}
    if(rate>0&&C.has(x,["unison"])&&ids.filter(y=>C.has(y,["unison"])).length>=2){a+=0.14*rate;t.push("빛바랜 꿈결: 합일 공격력")}
    const e=C.share(x,"echo");if(rate>0&&e>0.05){a+=e*0.12*rate;t.push("빛바랜 꿈결: 에코 크리티컬")}
    return {a,t}},

  // 90레벨 기본 [HP, 공격력, 방어력]
  base:[16713,288,1100],
  // 공식 공략 사이트(wuwaguide.kurogames.com) 추천 스탯 — Lv.90 스탯 화면 기준. gt: '초과' 조건인 항목, src: 공략 id
  guide:{er:260,hp:40000,src:13153},
  supportTargets:{hp:40000,er:260},
  defaultWeaponId:21030076,
  teamWeaponBuff:{21030076:[{echo:24},{atk:16,has:["unison"]}]},
  supportWeapons:[[21030076,1,100]],
  statScale:"hp",
  gb:1512,
  // 고유 스탯 노드 합계
  nodes:{heal:12,"hp%":12},
  // 주력 에코 세트 [세트, 개수, …]
  sets:[["추억에 붉게 물든 꽃",5,"추정"]],

  // 무기 종류
  wtype:3,
});
