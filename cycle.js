/* =====================================================================
   종말 매트릭스 주기 데이터 — 주기가 바뀌면 이 파일만 고친다.
   ---------------------------------------------------------------------
   name, period      주기 이름과 기간 (화면 상단·주기 패널에 표시)
   bosses[]          등장 순서대로
     name            보스 이름
     scoreMul, killBonus  (선택) 준 피해 점수 배율, 처치 보너스 점수
     res             저항 속성 id (glacio/fusion/electro/aero/spectro/havoc), 없으면 null
                     → 메인 딜러 속성이 같으면 정렬 시뮬레이션에서 피해 ×0.6
     note            한 줄 설명
     effects[]       kind: "benefit"(유리) | "threat"(주의), round: "2R+" 등(선택),
                     tags: 상성 판정용 조건 키(선택, 아래 cond와 같은 키), text: 설명
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
   source            출처 (주기 패널 아래 표시)
   examples          처음 방문자에게 보여 줄 예시 파티 [{slots:[id,id,id], buff:buffs의 id}]
   ===================================================================== */
window.MATRIX_CYCLE={
 name:"S2 적대의 선봉 · 3페이즈 (3.7)",
 period:"2026-10-07 ~ 2026-11-12",
 bosses:[
  {name:"지옥불 기사",res:"fusion",note:"용융 메인 딜러는 피하는 편이 좋습니다.",effects:[
    {kind:"benefit",tags:["shield"],text:"공명자가 보호막을 가지고 있으면 받는 피해가 줄어듭니다. (보스의 화상 지속 피해가 HP 50% 초과 또는 보호막 보유 시 90% 감소)"},
    {kind:"threat",round:"2R+",text:"공중에 있지 않은 주변 공명자에게 용융 지속 피해"}]},
  {name:"봉정계유",res:"glacio",note:"응결 메인 딜러는 피하는 편이 좋습니다.",effects:[
    {kind:"benefit",tags:["shield"],text:"공명자가 실드를 얻으면 보스가 받는 피해 증가 (최대 40%)"},
    {kind:"benefit",tags:["dodge"],text:"회피 반격마다 공명 에너지 10 회복, 진동 강도 20% 감소 (2초 쿨타임)"},
    {kind:"threat",round:"2R+",text:"공격력 30% 증가"}]},
  {name:"크라운리스",res:"havoc",note:"인멸 메인 딜러는 피하는 편이 좋습니다.",effects:[
    {kind:"benefit",tags:["unison"],text:"합일 대응을 발동한 공명자에게 받는 모든 피해 40% 증가 (30초)"},
    {kind:"threat",round:"2R+",text:"진동 강도 감소 효율 20% 감소"}]},
  {name:"하늘의 기관 인형 - 겁살",res:"aero",note:"전도 이상 효과를 걸 수 있는 파티가 유리합니다.",effects:[
    {kind:"benefit",tags:["dodge"],text:"회피 반격 명중 시 불굴 2중첩 (경직·제어 무효, 피격마다 1중첩 소모, 1초에 최대 1회)"},
    {kind:"threat",round:"2R+",tags:["electro","negative"],text:"공격력 40% 증가. 전도 이상(Electro Flare) 상태에서는 해제"}]},
  {name:"매트릭스 미믹",res:null,scoreMul:1.1,killBonus:1000,note:"특이점 확장 전용. 모든 속성 저항이 같습니다.",effects:[
    {kind:"benefit",tags:["any"],text:"준 피해가 1.1배 점수로 계산, 처치 시 1,000점 (S2 한정)"},
    {kind:"benefit",text:"처치 후 15초간 파티 전체 피해·경직 무효"}]}
 ],
 buffs:[
  {id:"general",name:"일반 강화",type:"일반 공격",effects:[{text:"적이 받는 모든 피해 +20%",dmg:20},{text:"적이 받는 일반 공격 피해 +20%",dmg:20,cond:"basic"}]},
  {id:"negative",name:"강화: 이상 효과",type:"이상효과",effects:[{text:"이상 효과에 걸린 대상이 받는 모든 피해 +25% (30초)",dmg:25,cond:"negative"},{text:"추가로 전도 피해 +30%",dmg:30,cond:"electro"}]},
  {id:"basic",name:"기본 피해 강화",type:"에코 어빌리티 · 합일 · 실드",effects:[{text:"에코 스킬 피해 +40%",dmg:40,cond:"echo"},{text:"합일 대응 발동 시 모든 피해 +55% (30초)",dmg:55,cond:"unison"},{text:"실드 획득 시 피해 +11% (2초, 최대 5중첩)",dmg:11,cond:"shield"}]},
  {id:"tune",name:"강화: 조화도 파괴",type:"조화 밀집",effects:[{text:"조화도 이탈 부여 시 파티 전체 피해 +25% (30초)",dmg:25,cond:"tunability"},{text:"해킹 이탈 부여 시 해당 공명자 피해 +30% (30초)",dmg:30,cond:"hack"}]}
 ],
 vigor2:["shorekeeper","mornye","verina","suisui","baizhi","buling"],
 emergency:{id:"lynae",extraVigor:1,note:"이번 페이즈 한정 배치 횟수 +1"},
 dmgBonus:{roccia:20,brant:25,cantarella:25,camellya:25,phoebe:20,carlotta:25,zhezhi:20,yinlin:20,jinhsi:25,changli:25,jiyan:25,xiangliyao:25},
 source:"Game8, TOPUPlive의 3.7 종말 매트릭스 공략 (2026년 10월 기준)",
 examples:[
 {slots:["camellya","sanhua","verina"],buff:"general"},
  {slots:["qingxiao","denia","mornye"],buff:"tune"},
  {slots:["jingran","iuno","shorekeeper"],buff:"basic"},
  {slots:["hsin","suoming","shorekeeper"],buff:"negative"}
 ]
};
