/* =====================================================================
   MP — 데이터 등록소 (가장 먼저 로드)
   데이터 파일은 여기에 등록만 하고, 서로를 직접 참조하지 않는다.
   계산·화면 코드는 등록소를 직접 읽지 않고 중개자(CharDB · BossDB · EchoDB)를 거친다.

     data/chars/<id>.js ─ MP.addChar ─┐
     data/bosses/<id>.js ─ MP.addBoss ─┼─▶ 등록소 ─▶ CharDB / BossDB / EchoDB ─▶ index.html(계산·화면)
     data/cycle.js · echoes.js · …  ──┘
   ===================================================================== */
(function(g){
  const MP=g.MP={_chars:{},_order:[],_bosses:{},_bossOrder:[]};
  // 공명자 등록: 같은 id가 다시 오면 뒤에 온 값으로 덮는다
  MP.addChar=c=>{if(!c||!c.id)return;if(!MP._chars[c.id])MP._order.push(c.id);MP._chars[c.id]=c};
  // 보스 등록(보스 정보·패턴 페이지용): {id, name, ...}
  MP.addBoss=b=>{if(!b||!b.id)return;if(!MP._bosses[b.id])MP._bossOrder.push(b.id);MP._bosses[b.id]=b};
})(typeof window!=="undefined"?window:globalThis);
