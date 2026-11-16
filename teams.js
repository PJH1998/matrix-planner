/* =====================================================================
   파티 자동 추천용 조합 데이터 — 여기만 고치면 추천 결과가 바뀐다.

   TEAM_PRESETS : 최우선 조합. 위에 있을수록 먼저, 셋 다 보유하고 배치 횟수가 남아 있으면 그대로 묶는다.
   PAIR_W       : 메인 딜러별 궁합 가중치. 1 = 정석 파트너, 0.5~0.8 = 무난한 대체.
                  추천 점수 = 파티 강도 × (1 + 0.4 × (메인 딜러와 나머지 두 명의 궁합 합))
                  다른 메인 딜러의 정석 파트너(궁합 1)를 데려오면 한 명당 ×0.6
                  메인 딜러 3명, 또는 궁합 표에 없는 메인 딜러 2명 조합은 만들지 않는다
                  표에 없는 조합은 궁합 0(강도만으로 판단).
   MIN_POINTS   : 예상 점수가 이보다 낮은 파티는 추천에서 뺀다.
   ===================================================================== */
window.TEAM_PRESETS=[
 ["hiyuki","lucilla","suisui"],
 ["hsin","suoming","lily"],        // 릴리 합일 버프
 ["qingxiao","denia","mornye"],
 ["aemeath","lynae","mornye"],
 ["augusta","iuno","shorekeeper"],
 ["phrolova","cantarella","roccia"],
 ["cartethyia","ciaccona","rover_a"]
];
window.PAIR_W={
 hiyuki:{lucilla:1,suisui:1,lynae:.6,chisa:.6},
 hsin:{suoming:1,lily:1,buling:.6},
 suoming:{hsin:1,lily:.8},
 qingxiao:{denia:1,mornye:1,lynae:.7},
 aemeath:{lynae:1,mornye:1,denia:.6},
 augusta:{iuno:1,shorekeeper:1},
 jingran:{iuno:1,shorekeeper:.8},
 phrolova:{cantarella:1,roccia:1},
 cartethyia:{ciaccona:1,rover_a:1,chisa:.8},
 sigrika:{lucilla:1,shorekeeper:.8},
 carlotta:{zhezhi:1,shorekeeper:.8},
 jinhsi:{zhezhi:1,shorekeeper:1},
 xiangliyao:{yinlin:1,shorekeeper:.8},
 camellya:{sanhua:1,roccia:.7},
 zani:{phoebe:1,shorekeeper:.7},
 lucy:{rebecca:1},
 xuanling:{chisa:1},
 jiyan:{mortefi:1,verina:.8},
 luuk:{denia:.8,lynae:.8,mornye:.8},
 galbrena:{lupa:.8}
};
window.MIN_POINTS=1000;
