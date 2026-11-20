/* =====================================================================
   여러 공명자에 걸친 조합 데이터 (자동 추천 · 조합 보너스)

   TEAM_PRESETS : 최우선 조합. 위에 있을수록 먼저, 셋 다 보유하고 배치 횟수가 남아 있으면 그대로 묶는다.
   궁합 가중치  : 공명자 파일(data/chars/<id>.js)의 pairs. 1 = 정석 파트너, 0.5~0.8 = 무난한 대체.
                  추천 점수 = 파티 강도 × (1 + 0.4 × (메인 딜러와 나머지 두 명의 궁합 합))
                  다른 메인 딜러의 정석 파트너(궁합 1)를 데려오면 한 명당 ×0.6
                  메인 딜러 3명, 또는 궁합 표에 없는 메인 딜러 2명 조합은 만들지 않는다
                  표에 없는 조합은 궁합 0(강도만으로 판단).
   MIN_POINTS   : 예상 점수가 이보다 낮은 파티는 추천에서 뺀다.
   COMBOS       : 추천 조합(조합 이름 표시 · 조합 보너스)
   ===================================================================== */
MP.TEAM_PRESETS=[
 ["hiyuki","lucilla","suisui"],
 ["hsin","suoming","lily"],        // 릴리 합일 버프
 ["qingxiao","denia","mornye"],
 ["aemeath","lynae","mornye"],
 ["augusta","iuno","shorekeeper"],
 ["phrolova","cantarella","roccia"],
 ["cartethyia","ciaccona","rover_a"],
 ["changli","brant","lupa"]       // 거의 고정 조합
];
MP.MIN_POINTS=1000;
/* 추천 조합 표시: 2~3명 모두 같은 파티에 있으면 조합 이름을 보여주고 강도에 조합 보너스를 더한다
   modes: {공명자 id: 모드 id} — 공명 모드 공명자가 그 모드일 때만 조합으로 본다 */
MP.COMBOS=[
 {ids:["qingxiao","denia","mornye"],name:"조화 밀집",modes:{denia:"tuneD"}},
 {ids:["hsin","suoming"],name:"합일",modes:{hsin:"unison"}},
 {ids:["augusta","iuno"],name:"아우구스타 정석"},
 {ids:["lucy","rebecca"],name:"해킹"},
 {ids:["cartethyia","ciaccona","rover_a"],name:"풍식"},
 {ids:["zani","phoebe"],name:"광학"},
 {ids:["hiyuki","lucilla"],name:"서리",modes:{lucilla:"frost"}},
 {ids:["xuanling","chisa"],name:"암흑"},
 {ids:["aemeath","mornye"],name:"조화 파동",modes:{aemeath:"tuneW"}},
 {ids:["jinhsi","zhezhi","shorekeeper"],name:"금희 정석"},
 {ids:["carlotta","zhezhi"],name:"카를로타 정석"},
 {ids:["xiangliyao","yinlin"],name:"전도 정석"},
 {ids:["jiyan","mortefi"],name:"강공격 정석"},
 {ids:["phrolova","cantarella"],name:"인멸 정석"},
 {ids:["camellya","sanhua"],name:"일반 공격 정석"}
];
