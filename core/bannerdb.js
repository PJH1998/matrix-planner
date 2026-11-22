/* =====================================================================
   BannerDB — 픽업 배너 데이터 중개자
   data/banners.js(MP.addBanner)를 시작 시각 순으로 정리해 「지금 픽업」 · 「다음 픽업」을 내준다.
   화면·계산 코드는 배너 데이터 구조를 직접 알지 않는다.
   ===================================================================== */
(function(g){
  const MP=g.MP;
  const time=v=>{const t=new Date(v).getTime();return isFinite(t)?t:NaN};
  const norm=b=>({ver:String(b.ver||""),phase:+b.phase||1,start:b.start,end:b.end,startT:time(b.start),endT:time(b.end),tentative:!!b.tentative,source:b.source||"",
    chars:(b.chars||[]).filter(c=>c&&c.id).map(c=>({id:c.id,isNew:!!c.isNew,weapon:c.weapon||null,name:c.name||null}))});
  const now=t=>t==null?Date.now():+t;
  const DB={
    // 모든 배너 (시작 시각 순)
    all:()=>MP._banners.map(norm).filter(b=>isFinite(b.startT)&&isFinite(b.endT)).sort((a,b)=>a.startT-b.startT),
    // 지금 진행 중인 배너 (없으면 null)
    current:t=>{const n=now(t);return DB.all().find(b=>b.startT<=n&&n<b.endT)||null},
    // 지금 이후 시작하는 첫 배너 (없으면 null)
    next:t=>{const n=now(t);return DB.all().find(b=>b.startT>n)||null},
    // 화면에 보여 줄 배너: 지금 픽업 + 다음 픽업 (있는 것만)
    shown:t=>[DB.current(t),DB.next(t)].filter(Boolean),
    label:b=>b?`${b.ver} ${b.phase}페이즈`:""
  };
  MP.BannerDB=DB;
})(typeof window!=="undefined"?window:globalThis);
