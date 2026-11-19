/* =====================================================================
   종말 매트릭스 주기 데이터 — 주기가 바뀌면 이 파일만 고친다.
   ---------------------------------------------------------------------
   name, period      주기 이름과 기간 (화면 상단·주기 패널에 표시)
   endsAt            주기 종료 시각 (ISO, 시간대 포함). 헤더의 남은 시간 표시에 쓴다. 없으면 period 끝 날짜 04:00(UTC+8)
   bosses[]          등장 순서대로
     name            보스 이름
     hpMul, scoreMul, killBonus  (선택) HP 배율, 준 피해 점수 배율, 처치 보너스 점수
     res             저항 속성 id (glacio/fusion/electro/aero/spectro/havoc), 없으면 null
                     → 메인 딜러 속성이 같으면 정렬 시뮬레이션에서 피해 ×0.6
     note            한 줄 설명
     effects[]       kind: "benefit"(유리) | "threat"(주의), round: "2R+" 등(선택),
                     tags: 상성 판정용 조건 키(선택, 아래 cond와 같은 키), text: 설명
                     dmg, cond: (선택) 보스 진행 계산용. 받는 피해 %(감소는 음수, 중첩 효과는 최대 중첩 기준)와 적용 조건 키(없으면 모든 파티)
   buffs[]           파워 서킷(강화 효과)
     id              아무 문자열 (examples와 사용자 편성이 이 값으로 선택)
     name, type      표시 이름, 분류
     effects[]       text: 설명, dmg: 피해 증가 %, cond: 적용 조건 키(없으면 무조건)
                     조건 키 목록은 index.html의 COND 표 참고
                     (basic heavy skill lib echo coord / glacio fusion electro aero spectro havoc /
                      negative frost burn erosion flare frazzle bane / tunability tuneD tuneW hack / unison shield)
   vigor2            배치 2회 공명자 id 목록
   emergency         긴급 공명자 {id, extraVigor, note} (없으면 null)
   dmgBonus          공명자별 피해 증가 % {id: 수치}
   partyBonus        공명 해방 후 파티 전체에 주는 피해 보너스 {id: {dmg, cond, text}} (그 공명자가 파티에 있으면 적용)
   source            출처 (주기 패널 아래 표시)
   examples          처음 방문자에게 보여 줄 예시 파티 [{slots:[id,id,id], buff:buffs의 id}]
   ===================================================================== */
window.MATRIX_CYCLE={
 name:"S2 위험한 경지의 강습 · 4페이즈 (3.8)",
 period:"2026-11-19 ~ 2026-12-22",
 endsAt:"2026-12-22T04:00:00+08:00",
 bosses:[
  {name:"폭주의 고릴라",res:"aero",note:"기류 메인 딜러는 피하는 편이 좋습니다. 조화도 파괴 파티가 유리합니다.",effects:[
    {kind:"benefit",tags:["tunability"],dmg:50,cond:"tunability",text:"조화도 파괴를 당하면 받는 피해 12.5% 증가 (전투 끝까지, 최대 4중첩)"},
    {kind:"threat",dmg:-20,text:"받는 피해 20% 감소"}]},
  {name:"데니아",res:"fusion",note:"용융 메인 딜러는 피하는 편이 좋습니다. 이상 효과 파티가 유리합니다.",effects:[
    {kind:"benefit",tags:["anomDmg"],dmg:25,cond:"anomDmg",text:"받는 모든 이상 효과 피해 최종 25% 증가"},
    {kind:"benefit",tags:["frostKnot"],dmg:30,cond:"frostKnot",text:"히유키의 「서리의 매듭」을 받으면 받는 최종 피해 30% 증가 (15초)"}]},
  {name:"크라운리스",res:"havoc",note:"인멸 메인 딜러는 피하는 편이 좋습니다.",effects:[
    {kind:"benefit",tags:["unison"],dmg:40,cond:"unison",text:"합일 대응을 발동한 공명자가 주는 피해 최종 40% 증가 (30초)"}]},
  {name:"시길룸",res:"spectro",note:"회절 메인 딜러는 피하는 편이 좋습니다. 에코 어빌리티를 자주 맞히는 파티가 유리합니다.",effects:[
    {kind:"benefit",tags:["echo"],dmg:80,text:"에코 어빌리티 명중 시 「항로 이탈」 1중첩: 받는 최종 피해 10%씩 증가, 5중첩이면 추가 30% (같은 이름의 에코는 1회만)"},
    {kind:"threat",dmg:-25,text:"받는 피해 최종 25% 감소"}]},
  {name:"매트릭스 미믹",res:null,hpMul:1.1,scoreMul:1.1,killBonus:1000,note:"특이점 확장 전용. 모든 속성 저항이 같습니다.",effects:[
    {kind:"benefit",tags:["any"],text:"준 피해가 1.1배 점수로 계산, 처치 시 1,000점 (S2 한정)"},
    {kind:"benefit",text:"처치 후 15초간 파티 전체 피해·경직 무효"}]}
 ],
 buffs:[
  {id:"general",name:"공용 강화",type:"일반",effects:[{text:"적이 받는 모든 피해 +20%",dmg:20},{text:"적이 받는 공명 해방 피해 +20%",dmg:20,cond:"lib"}]},
  {id:"negative",name:"이상 효과 강화",type:"이상효과",effects:[{text:"이상 효과를 건 대상이 받는 피해 +25% (30초)",dmg:25,cond:"negative"},{text:"적이 받는 서리 효과 피해 +80%",dmg:80,cond:"frostDmg"}]},
  {id:"basic",name:"기본 피해 강화",type:"에코 어빌리티 · 합일 · 실드",effects:[{text:"에코 어빌리티 피해 +65%",dmg:65,cond:"echo"},{text:"합일 대응 발동 시 주는 피해 +55% (30초)",dmg:55,cond:"unison"},{text:"실드 획득 시 피해 +25% (2초)",dmg:25,cond:"shield"}]},
  {id:"tune",name:"조화도 파괴 강화",type:"조화",effects:[{text:"조화도 이탈 부여 시 파티 전체 피해 +25% (30초)",dmg:25,cond:"tunability"},{text:"조화 파동 피해를 준 공명자가 주는 피해 +30% (30초)",dmg:30,cond:"tuneWSelf"}]}
 ],
 vigor2:["shorekeeper","mornye","verina","suisui","baizhi","buling","lily"],
 emergency:{id:"lucilla",extraVigor:1,note:"이번 페이즈 한정 배치 횟수 +1"},
 dmgBonus:{roccia:20,brant:25,cantarella:25,camellya:25,phoebe:20,carlotta:25,zhezhi:20,yinlin:20,jinhsi:25,changli:25,jiyan:25,xiangliyao:25},
 partyBonus:{
  zhezhi:{dmg:30,cond:"skill",text:"절지 공명 해방 후 파티 공명 스킬 피해 +30% (30초)"},
  yinlin:{dmg:30,cond:"lib",text:"음림 공명 해방 후 파티 공명 해방 피해 +30% (30초)"},
  roccia:{dmg:20,cond:"havoc",text:"로코코 공명 해방 후 파티 인멸 피해 +20% (30초)"},
  phoebe:{dmg:20,cond:"spectro",text:"페비 공명 해방 후 파티 회절 피해 +20% (30초)"}
 },
 source:"게임 내 정보 (2026년 11월 19일 기준)",
 examples:[
 {slots:["camellya","sanhua","verina"],buff:"general"},
  {slots:["qingxiao","denia","mornye"],buff:"tune"},
  {slots:["jingran","iuno","shorekeeper"],buff:"basic"},
  {slots:["hsin","suoming","shorekeeper"],buff:"negative"}
 ]
};
