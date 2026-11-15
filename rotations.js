/* =====================================================================
   딜 사이클 (TEST) — '딜 사이클' 탭에 표시되고, 같은 3명 파티의 강도 계산에도 쓰인다.
   팀 하나에 사이클(variants)을 여러 개 둘 수 있다. (예: 히유키 3거합 / 4거합 퀵스왑)

   members  : 공명자 id 3명 (순서 무관, 이 3명으로 편성된 파티에 적용)
   calc     : 강도 계산에 쓸 사이클 id (share가 있는 사이클만 가능)
   variants : [{
     id, label    : 사이클 이름 (탭과 이름 옆 부제목에 표시)
     share        : 한 사이클 동안의 피해 비중(%) — 없으면 null → 화면에 ??? 표시, 강도 계산에도 안 씀
     time         : 공명자별 필드 시간(초), cycleSec 한 사이클 시간, teamDps 팀 DPS
     seq          : 반복 사이클 순서 [{who, steps, swap, note}]  swap:true → 이 구간 끝에서 퀵스왑
     firstSeq     : 첫 사이클이 다르면 따로 적는다 (없으면 생략)
     steps 표기   : E 공명 스킬 · Q 에코 스킬 · R 공명 해방 · 회로 공명 회로 스킬 · 강 강공격
                    E+ / R+ / 강+ 강화 상태의 스킬·해방·강공격 (해방·회로 상태 등에서 바뀐 것)
                    조화도 파괴 (Tune Break)
                    평N 일반 공격 1~N타 · 평a-b a~b타만 · 평(N타) N타 한 번 · 거합N 거합 N회
                    인트로 · 아웃트로 · 점프 · 대시 · 회피 · "(…)" 홀드·캔슬 같은 덧붙임
     tips         : [{who, text, check}] check:true면 '검수 필요' 표시
     setup, note, source:{name,url,date}
   }]
   피해 비중·시간은 출처의 1~3번째 사이클 평균이다.
   ===================================================================== */
window.ROTATIONS=[
 {id:"hiyuki-lucilla-suisui",title:"히유키 · 루실라 · 수수",tag:"응결",members:["hiyuki","lucilla","suisui"],calc:"iai3",
  variants:[
   {id:"iai3",label:"3거합",cycleSec:25.8,teamDps:101029,
    setup:"S0R1 · 히유키 에코 3코스트 2개 모두 응결 피해 주옵션",
    share:{hiyuki:82.5,lucilla:14.3,suisui:3.2},time:{hiyuki:11.7,lucilla:7.3,suisui:6.8},
    seq:[
     {who:"suisui",steps:["인트로","E","평4","Q","R","아웃트로"]},
     {who:"lucilla",steps:["인트로","E(홀드)","Q","R","평(홀드)","아웃트로"],note:"평타 홀드로 쌓인 3스택을 모두 소모한 뒤 아웃트로로 넘깁니다."},
     {who:"hiyuki",steps:["인트로","강+(홀드)","R","평5","E+","E+","대시","거합3","강+","Q","R+(홀드 2초)","아웃트로"],note:"강+(홀드)로 해방을 열고, R 후 강화 상태 평5와 강화 E 2회로 게이지를 채운 뒤 대시(회피)로 거합 자세에 들어가 거합을 3번 벱니다. 대시 대신 E 홀드로 들어가도 됩니다. 마지막 강화 R(홀드 2초)이 가장 큰 한 방입니다."}],
    firstSeq:[
     {who:"suisui",steps:["평3","회로","평4","Q","R","아웃트로"],note:"첫 사이클은 인트로 없이 평3으로 회로 게이지를 채우고 시작합니다."},
     {who:"lucilla",steps:["인트로","E(홀드)","Q","R","평(홀드)","아웃트로"]},
     {who:"hiyuki",steps:["인트로","강+(홀드)","R","평5","E+","E+","대시","거합3","강+","Q","R+(홀드 2초)","아웃트로"]}],
    source:{name:"arabwuwa.com Team 152",url:"https://arabwuwa.com/teams/hiyuki-lucilla-suisui-152/",date:"2026-08-30"}},
   {id:"iai4qs",label:"4거합 퀵스왑",share:null,
    setup:"S0 · 퀵스왑으로 수수·루실라 준비 동작을 겹쳐 히유키 필드 시간을 늘리는 사이클",
    seq:[
     {who:"suisui",steps:["인트로","E"],swap:true},
     {who:"hiyuki",steps:["평"],swap:true},
     {who:"suisui",steps:["평3","Q","평4"],swap:true,note:"평4가 시작되는 순간 바로 스왑합니다."},
     {who:"lucilla",steps:["E(홀드)"],swap:true},
     {who:"suisui",steps:["R","아웃트로"]},
     {who:"lucilla",steps:["인트로","R","강","Q","아웃트로"]},
     {who:"hiyuki",steps:["인트로","강+","Q","R","평3","회피","평3","조화도 파괴","평(3타)","점프","E+","회피","거합2","평3","회피","평3","점프","E+","회피","거합2","강+","R+","E","아웃트로"],note:"거합 2회씩 두 번(총 4회). 각 거합 전에 평3 › 회피 › 평3 › 점프 › E › 회피 순서로 게이지를 채웁니다."}],
    firstSeq:[
     {who:"suisui",steps:["평3","회로"],swap:true},
     {who:"lucilla",steps:["E(홀드)"],swap:true},
     {who:"suisui",steps:["평3"],swap:true,note:"부채 동작이 시작되면 바로 스왑합니다."},
     {who:"hiyuki",steps:["평3"],swap:true},
     {who:"suisui",steps:["평(4타)","Q","R","아웃트로"]},
     {who:"lucilla",steps:["인트로","R","강(홀드)","Q","아웃트로"]},
     {who:"hiyuki",steps:["인트로","강+","Q","R","평3","회피","평3","조화도 파괴","평(3타)","점프","E+","회피","거합2","평3","회피","평3","점프","E+","회피","거합2","강+","R+","E","아웃트로"]}],
    tips:[{who:"suisui",text:"평3 후딜레이 동안 히유키로 퀵스왑해 평타를 넣고 다시 수수로 돌아옵니다. 첫 사이클은 히유키 평3, 이후에는 평타 1타입니다."}],
    source:{name:"arabwuwa.com 커뮤니티 로테이션 #118",url:"https://arabwuwa.com/rotations/",date:"2026-09"}}]},

 {id:"aemeath-lynae-mornye",title:"에이메스 · 린네 · 모니에",tag:"용융",members:["aemeath","lynae","mornye"],calc:"rupture",
  variants:[
   {id:"rupture",label:"파열",cycleSec:26.2,teamDps:88414,setup:"S0R1",
    share:{aemeath:76.8,lynae:20.2,mornye:3.1},time:{aemeath:12.3,lynae:7.3,mornye:6.5},
    seq:[
     {who:"mornye",steps:["인트로","평3","R","E","강","Q","아웃트로"],note:"평3 후딜을 R로, E 후딜을 강공으로 캔슬합니다."},
     {who:"lynae",steps:["인트로","R","E","강+","점프","점프","점프","비주얼 임팩트","Q","아웃트로"]},
     {who:"aemeath",steps:["인트로","평3-4","R","Q","평2-4","조화도 파괴","회로","평2-4","회로","강","R","아웃트로"]}],
    firstSeq:[
     {who:"mornye",steps:["평3","강","평3","R","E","강","Q","아웃트로"]},
     {who:"lynae",steps:["인트로","R","E","강+","점프","점프","점프","비주얼 임팩트","Q","아웃트로"]},
     {who:"aemeath",steps:["인트로","평3-4","R","Q","평2-4","조화도 파괴","회로","평2-4","회로","강","R","아웃트로"]}],
    tips:[{who:"mornye",text:"모니에 첫 사이클이 늦어지면 팀 DPS가 크게 떨어집니다. 1초만 늦어져도 약 83,000까지 내려갑니다."},
          {who:"aemeath",text:"린네 아웃트로 버프가 매우 중요해서 에이메스 쪽 지연도 손해가 큽니다."}],
    source:{name:"arabwuwa.com Team 86",url:"https://arabwuwa.com/teams/aemeath-lynae-mornye-86/",date:"2026-08-30"}}]},

 {id:"qingxiao-denia-mornye",title:"청초 · 데니아 · 모니에",tag:"기류",members:["qingxiao","denia","mornye"],calc:"base",
  variants:[
   {id:"base",label:"기본",cycleSec:25.3,teamDps:100085,setup:"S0R1 · 청초 4코스트 치명타 피해 주옵, 총 치명타 확률 81.5%",
    share:{qingxiao:84.2,denia:13.5,mornye:2.3},time:{qingxiao:12.7,denia:6.1,mornye:6.5},
    seq:[
     {who:"mornye",steps:["인트로","평3","R","E","강","Q","아웃트로"],note:"평3 후딜을 R로, E 후딜을 강공으로 캔슬합니다."},
     {who:"denia",steps:["인트로","평(4타)","E","R","평2","회피","평2","E+","E+","R+","Q","아웃트로"]},
     {who:"qingxiao",steps:["인트로","공중 평3","평2","조화도 파괴","회로","강","평4","강","R","Q","아웃트로"]}],
    firstSeq:[
     {who:"mornye",steps:["평3","강","평3","R","E","강","Q","아웃트로"]},
     {who:"denia",steps:["인트로","평(4타)","E","R","평2","회피","평2","E+","E+","R+","Q","아웃트로"]},
     {who:"qingxiao",steps:["인트로","공중 평3","평2","조화도 파괴","회로","강","평4","강","R","Q","아웃트로"]}],
    source:{name:"arabwuwa.com Team 155",url:"https://arabwuwa.com/teams/qingxiao-denia-mornye-155/",date:"2026-08-30"}}]},

 {id:"augusta-iuno-shorekeeper",title:"아우구스타 · 유노 · 파수인",tag:"전도",members:["augusta","iuno","shorekeeper"],calc:"base",
  variants:[
   {id:"base",label:"기본",cycleSec:26.0,teamDps:75461,setup:"S0R1",
    share:{augusta:69.7,iuno:29.0,shorekeeper:1.2},time:{augusta:11.6,iuno:9.2,shorekeeper:5.2},
    seq:[
     {who:"shorekeeper",steps:["인트로(강화)","평3","R","평4-5","강","E","평2","아웃트로"],note:"평2 후딜을 아웃트로로 캔슬합니다."},
     {who:"iuno",steps:["인트로","Q","E","점프","R","E+","평3","E+","강","아웃트로"],note:"첫 E는 해방 에너지를 채우는 용도입니다."},
     {who:"augusta",steps:["인트로","강","E","강","R","E+","E+","E+","R+×9","R+(마무리)","Q","아웃트로"],note:"R로 해방 상태에 들어간 뒤 강화 E 3회, 강화 R 연속 공격 9회, 마지막 강화 R로 마무리합니다."}],
    firstSeq:[
     {who:"shorekeeper",steps:["평5","강","E","평3","R","평2","강","Q","아웃트로"]},
     {who:"iuno",steps:["인트로","Q","E(캔슬)","R","점프","E+","평3","E+","강","아웃트로"],note:"첫 사이클은 E를 캔슬해 빠르게 넘어갑니다."},
     {who:"augusta",steps:["인트로","강","E","강","R","E+","E+","E+","R+×9","R+(마무리)","Q","아웃트로"]}],
    tips:[{who:"augusta",text:"공명 효율이 125%면 에코를 2번이 아니라 1번만 써도 됩니다."}],
    source:{name:"arabwuwa.com Team 35",url:"https://arabwuwa.com/teams/augusta-iuno-shorekeeper-35/",date:"2026-08-30"}}]},

 {id:"cartethyia-ciaccona-rover_a",title:"카르티시아 · 샤콘 · 방랑자(기류)",tag:"기류",members:["cartethyia","ciaccona","rover_a"],calc:"base",
  variants:[
   {id:"base",label:"기본",cycleSec:26.9,teamDps:71789,setup:"S0R1 · 방랑자 S6 · 무기 R5",
    share:{cartethyia:70.8,ciaccona:16.4,rover_a:12.8},time:{cartethyia:14.0,ciaccona:6.9,rover_a:6.0},
    seq:[
     {who:"rover_a",steps:["인트로","평2","평(4타)","E","평2","Q","R","E+","아웃트로","E+"],note:"R 뒤 강화 E 1타를 쓰고 아웃트로로 교체하면 강화 E 2타는 필드 밖에서 자동으로 나갑니다."},
     {who:"ciaccona",steps:["인트로","평2-4","E","평2-4","강","Q","R","아웃트로"]},
     {who:"cartethyia",steps:["인트로","평2-4","E","공중 검","Q","R","E+","E+","평3-5","회피","평5","R+"],note:"평3-5는 회피로, 이어지는 평5는 해방으로 캔슬합니다."}],
    firstSeq:[
     {who:"rover_a",steps:["E","평2","평(4타)","E","평2","Q","R","E+","아웃트로","E+"]},
     {who:"ciaccona",steps:["인트로","평3-4","점프","공중 평2","평(4타)","E","강","Q","R","아웃트로"],note:"첫 평4타는 점프로, 두 번째 평4타는 E로 캔슬합니다."},
     {who:"cartethyia",steps:["인트로","평2-4","E","공중 검","Q","R","E+","E+","평3-5","회피","평5","R+"]}],
    source:{name:"arabwuwa.com Team 40",url:"https://arabwuwa.com/teams/cartethyia-ciaccona-rover-aero-40/",date:"2026-08-30"}}]}
];
