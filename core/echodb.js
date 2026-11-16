/* =====================================================================
   EchoDB — 에코 데이터 중개자
   에코 세트·주옵·부옵·이름(data/echoes.js)과 공명자별 노드·주력 세트(CharDB)를 한 곳에서 내준다.
   에코 입력·캡처 인식·스탯 계산은 이 객체로만 에코 데이터를 읽는다.
   ===================================================================== */
(function(g){
  const MP=g.MP;
  const DB={
    sets:()=>MP.ECHO_SETS||{},
    setNames:()=>Object.keys(MP.ECHO_SETS||{}),
    set:name=>(MP.ECHO_SETS||{})[name]||null,
    mainStats:cost=>(MP.ECHO_MAIN||{})[cost]||null,       // 코스트별 주옵 최대치·고정 부 주옵
    subRange:key=>(MP.ECHO_SUB||{})[key]||null,           // 부옵 [최소, 최대]
    subKeys:()=>Object.keys(MP.ECHO_SUB||{}),
    names:()=>MP.ECHO_NAMES||[],
    /* 공명자 연결 — 공명자 데이터는 CharDB를 거친다 */
    charSets:id=>MP.CharDB.sets(id),                       // [[세트, 개수, …], …] 위에 있을수록 정배
    charNodes:id=>MP.CharDB.nodes(id),                     // 고유 스탯 노드 합계
    mainSet(id){const s=DB.charSets(id)[0];return s?s[0]:null}
  };
  MP.EchoDB=DB;
})(typeof window!=="undefined"?window:globalThis);
