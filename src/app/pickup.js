"use strict";
/* ---------- 픽업 추천 (PickupAdvisor · BannerDB) ----------
   배너는 BannerDB(data/banners.js)에서 읽는다. 추천 계산은 PickupAdvisor가 하고, 이 파일은 화면만 그린다.
   화면: 페이즈마다 탭, 그 안에 공명자별 가로 배너(게임의 캐릭터 배너처럼). 배너를 누르면 펼쳐서 결과를 보여 준다.
   펼친 배너마다 「전용 무기도 뽑기」 선택(브라우저에 저장).
   새로 뽑기는 조합 후보를 넣어 보는 계산이 공명자마다 0.5초 안팎이라, 공명자 하나씩 나눠 계산하며 카드를 채운다.
   결과는 보유·성장도·편성·숙련도·주기와 전용 무기 선택이 같으면 다시 쓴다. */
const BannerDB=window.MP.BannerDB;
const pickupAdvisor=new window.MP.PickupAdvisor({state:calculationContext.state,charMap:calculationContext.charMap,cycle:calculationContext.cycle,
  teams:teamCalculator,characters:characterCalculator,weapons:weaponCalculator,charDb:CharDB,vigorOf,sameChar,cost:PULLS});
const PK_ROLE={dps:"메인 딜러",sub:"서브 딜러",support:"서포터"};
const PK_WKEY="mp-pickup-weapon";
let pkToken=0,pkState={key:null,shared:null,rows:new Map()};
// 전용 무기 선택 {공명자 id: true}. 브라우저 저장이 막혀 있어도 화면은 그대로 동작한다
let pkWeapons=(()=>{try{const v=JSON.parse(localStorage.getItem(PK_WKEY)||"{}");return v&&typeof v==="object"?v:{}}catch(e){return {}}})();
const pkSaveWeapons=()=>{try{localStorage.setItem(PK_WKEY,JSON.stringify(pkWeapons))}catch(e){}};

/* 작은 조각 */
const pkDate=t=>{const d=new Date(t);return `${d.getMonth()+1}월 ${d.getDate()}일`};
const pkLeft=ms=>{const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5);return d?`${d}일${h?` ${h}시간`:""}`:`${Math.max(1,h)}시간`};
const pkPts=v=>`${v>=0?"+":"−"}${Math.round(Math.abs(v)).toLocaleString()}점`;
const pkPct=v=>`${v>=0?"+":"−"}${Math.abs(v).toFixed(1)}%`;
const pkNo=i=>String(i+1).padStart(2,"0");
const pkName=id=>esc((charMap[id]||{}).name||id);
const pkNames=ids=>ids.map(pkName).join("·");
// 이름 뒤 조사: 받침이 있으면 a, 없으면 b (을/를, 과/와)
const pkJosa=(n,a,b)=>{const s=String(n),ch=s.charCodeAt(s.length-1);return s+(ch>=0xAC00&&ch<=0xD7A3&&(ch-0xAC00)%28?a:b)};
const pkThumb=(id,cls)=>{const c=charMap[id];return c?`<span class="pk-th${cls?" "+cls:""}" style="--ec:var(--${c.el})${hasPic(id)?`;background-image:url('${picUrl(id)}')`:""}"></span>`:`<span class="pk-th none"></span>`};
// 파티 멤버: 그림 + 이름
const pkMember=(id,cls)=>id?`<span class="pk-mem${cls?" "+cls:""}" title="${pkName(id)}">${pkThumb(id)}<small>${pkName(id)}</small></span>`:`<span class="pk-mem empty"><span class="pk-th none"></span><small>빈 칸</small></span>`;
const pkBuff=id=>{const b=(cycle.buffs||[]).find(x=>x.id===id);return b?esc(b.name):""};
const pkWeaponName=wid=>{const w=wid&&WMAP[wid];return w?esc(w.name):""};
const pkPower=p=>p.kind==="support"?`협주력 ${p.before.toFixed(1)} → ${p.after.toFixed(1)}`:"개인 피해 기준";

/* 조합 한 줄: 멤버(이름까지) · 강도 · 총점 변화, 아래에 자리·비교·포기할 파티 */
function pkComboHTML(c,id){const miss=new Set(c.missing||[]),me=charMap[id];
  const mem=c.slots.map(x=>pkMember(x,sameChar(x,id)?"me":miss.has(x)?"miss":"")).join("");
  if(miss.size)return `<div class="pk-combo miss"><div class="pk-cm">${mem}</div>
    <div class="pk-cv"><span class="pk-cs">강도 <b>${c.strength.toFixed(1)}</b></span></div>
    <p class="pk-cn">${pkNames([...miss])} 미보유 — 함께 있어야 만들 수 있는 조합</p></div>`;
  const facts=[];
  facts.push(c.giveUp.length?`파티 ${pkNo(c.index)} 자리에 넣음`:`빈 파티 ${pkNo(c.index)}에 넣음`);
  if(c.buff)facts.push(`서킷 ${pkBuff(c.buff)}`);
  if(c.instead)facts.push(`총점은 ${esc(me.name)} 대신 ${esc(pkJosa((charMap[c.instead.id]||{}).name||"","을","를"))} 넣은 파티(강도 ${c.instead.strength.toFixed(1)})와 비교`);
  // 서브 딜러를 데려오는 이유: 새 메인 딜러와 시너지가 그 파티 메인 딜러보다 크다
  const give=c.giveUp.map(g=>{const take=(g.take||[]).filter(t=>t.why&&t.why.from&&charMap[c.main]).map(t=>`${pkJosa(pkName(t.id),"은","는")} ${pkName(t.why.from)}보다 ${pkJosa(pkName(c.main),"과","와")} 시너지가 더 커요.`);
    return `<div class="pk-give"><div class="pk-gt"><b>포기할 파티 ${pkNo(g.index)}</b><span>예상 ${Math.round(g.pts).toLocaleString()}점</span></div>
      <div class="pk-gm">${g.slots.filter(Boolean).map(x=>pkMember(x,c.slots.some(y=>sameChar(x,y))?"take":"")).join("")}</div>
      <small>${pkNames(c.slots.filter(x=>x!==id&&g.slots.some(y=>sameChar(x,y))))} — 배치 횟수를 이 파티에서 다 쓰고 있어요.${take.length?" "+take.join(" · "):""}</small></div>`}).join("");
  return `<div class="pk-combo"><div class="pk-cm">${mem}</div>
    <div class="pk-cv"><span class="pk-cs">강도 <b>${c.strength.toFixed(1)}</b></span><b class="pk-ct ${c.dTotal>0?"up":c.dTotal<0?"down":""}">${pkPts(c.dTotal)}</b></div>
    <p class="pk-cn">${facts.join(" · ")}</p>${give}</div>`}

/* 결과 블록 */
function pkResultHTML(r){
  if(r.pending)return `<div class="pk-res wait"><span class="pk-spin"></span>계산 중…</div>`;
  if(r.done)return `<div class="pk-res"><p class="pk-plain">6체인${r.signature?" · 전용 무기":""}까지 갖췄습니다. 더 뽑을 것이 없습니다.</p></div>`;
  const m=r.main;
  if(r.owned){const p=m.power,what=m.key==="char"?`${m.from}체인 → ${m.to}체인${m.weapon?" + 전용 무기":""}`:"전용 무기";
    return `<div class="pk-res"><div class="pk-big"><span>돌파하면 캐릭터 강도</span><b class="${p.pct>0?"up":""}">${pkPct(p.pct)}</b></div>
      <div class="pk-sub"><span>${what}</span><span>${pkPower(p)}</span><span>≈ ${m.cost}연차 · 10연차당 ${pkPct(r.per10)}</span></div></div>`}
  const std=m.combos.filter(x=>x.kind==="standard"),sub=m.combos.filter(x=>x.kind==="sub");
  const sec=(title,note,list,empty)=>`<div class="pk-sec"><h4>${title}<small>${note}</small></h4>${list.length?list.map(x=>pkComboHTML(x,r.id)).join(""):`<p class="pk-plain">${empty}</p>`}</div>`;
  const big=m.gain>0?`<div class="pk-big"><span>뽑으면 예상 총점</span><b class="up">${pkPts(m.gain)}</b><em>${pkPct(m.pct)}</em></div>
      <div class="pk-sub"><span>가장 좋은 조합 기준</span><span>≈ ${m.cost}연차 · 10연차당 ${pkPts(r.per10)}</span></div>`
    :`<div class="pk-big"><span>뽑아도 예상 총점이</span><b class="flat">오르지 않아요</b></div>
      <div class="pk-sub"><span>지금 보유한 공명자로 같은 자리를 채우는 쪽이 더 높습니다</span><span>≈ ${m.cost}연차</span></div>`;
  return `<div class="pk-res">${big}</div>
    ${sec("정석 조합","고정 조합 · 궁합 1 파트너",std,"보유 공명자로 만들 수 있는 정석 조합이 없습니다.")}
    ${sec("서브 조합","보유 공명자로 만드는 다른 조합",sub,"보유 공명자로 만들 수 있는 다른 조합이 없습니다.")}`}

/* 펼친 배너: 전용 무기 선택 · 결과 · 조합 · 계산 기준 */
function pkDetailHTML(e,r){const c=charMap[e.id];if(!c)return `<p class="pk-plain">데이터 준비 중입니다.</p>`;
  const own=!!state.owned[e.id],sig=pickupAdvisor.signature(e.id,e),w=sig&&WMAP[sig],on=!!pkWeapons[e.id];let wrow="";
  // 전용 무기 선택: 이미 들고 있으면 잠근다. 미보유는 기본 무기 대비, 보유는 지금 무기 대비 캐릭터 강도 변화
  if(w){const has=r&&r.hasSignature,wp=r&&r.weaponPower;
    const note=has?"이미 보유":wp?`캐릭터 강도 ${pkPct(wp.pct)} · +${PULLS.weapon}연차`:`+${PULLS.weapon}연차`;
    wrow=`<button type="button" class="pk-wt${on&&!has?" on":""}" data-pkw="${esc(e.id)}" aria-pressed="${on&&!has}"${has?" disabled":""}>
      ${UIIcon.weapon(weaponIcon(w),{className:"wmini"})}<span class="pk-wl"><b>전용 무기도 뽑기</b><small>「${esc(w.name)}」 · ${note}</small></span><span class="pk-sw" aria-hidden="true"></span></button>`}
  const base=r&&r.base&&!on?`0체인 · 「${pkWeaponName(r.base.wid)}」 R${r.base.ref}${r.base.kind==="er4"?"(공명 효율 4성)":""}`:!own&&sig?`0체인 · 전용 무기 「${pkWeaponName(sig)}」 R1`:"";
  return `${wrow}${r?pkResultHTML(r):""}
    ${base&&r&&!r.pending&&!r.done&&!r.owned?`<p class="pk-basis">계산 기준: ${base} · 에코는 공식 가이드 추천 스탯</p>`:""}`}

/* 캐릭터 배너: 가로로 긴 띠(누르면 펼침) */
function pkStripHead(r){
  if(!r||r.pending)return `<span class="pk-hl wait"><span class="pk-spin"></span>계산 중</span>`;
  if(r.missing)return "";
  if(r.done)return `<span class="pk-hl"><small>더 뽑을 것 없음</small></span>`;
  if(r.owned)return `<span class="pk-grade up">돌파</span><span class="pk-hl"><small>캐릭터 강도</small><b class="up">${pkPct(r.main.power.pct)}</b></span>`;
  const g=r.grade?`<span class="pk-grade ${r.grade.id}">${r.grade.label}</span>`:"";
  return g+(r.main.gain>0?`<span class="pk-hl"><small>예상 총점</small><b class="up">${pkPts(r.main.gain)}</b></span>`:`<span class="pk-hl"><small>예상 총점</small><b class="flat">오르지 않음</b></span>`)}
// 그림: 게임의 가챠 배경 + 전신 그림(img/gacha · img/stand)이 있으면 그것, 없으면 초상화를 흐리게 깔고 오른쪽에 둔다
function pkBannerHTML(e,r){const c=charMap[e.id],open=pkView.open.has(e.id),gacha=c&&gachaUrl(e.id),stand=c&&standUrl(e.id),art=c&&(cardUrl(e.id)||(hasPic(e.id)?picUrl(e.id):null));
  const own=!!state.owned[e.id],ch=+(state.growth[e.id]||{}).chain||0,url=u=>u?` style="background-image:url('${u}')"`:"";
  const full=!!(gacha&&stand),bgU=full?gacha:art,artU=full?stand:art;
  const line=c?`<span class="elx">${UIIcon.element(c.el)}${EL[c.el]}</span><span>${PK_ROLE[c.role]||""}</span><span class="pk-own${own?" g":""}">${own?`보유 · ${ch}체인`:"미보유"}</span>`:`<span>데이터 준비 중</span>`;
  return `<article class="pk-bn${open?" open":""}${full?" full":""}${full&&standIsSkin(e.id)?" skin":""}" id="pk-${esc(e.id)}" style="--ec:var(--${c?c.el:"line"})">
    <button type="button" class="pk-strip" data-pkopen="${esc(e.id)}" aria-expanded="${open}" aria-controls="pkd-${esc(e.id)}">
      <span class="pk-sbg"${url(bgU)}></span><span class="pk-sart"${url(artU)}></span>
      <span class="pk-stxt"><span class="pk-stag">${e.isNew?"신규":"복각"} · 캐릭터 이벤트 튜닝</span>
        <b class="pk-stitle">${esc(c?c.name:(e.name||e.id))}<em>UP!</em></b>
        <span class="pk-sline">${line}</span><span class="pk-stars" aria-label="5성">★★★★★</span></span>
      <span class="pk-sres">${pkStripHead(r)}</span><span class="pk-chev" aria-hidden="true"></span></button>
    <div class="pk-detail" id="pkd-${esc(e.id)}"${open?"":" hidden"}>${open?pkDetailHTML(e,r):""}</div></article>`}

/* 페이즈 탭 + 고른 페이즈의 배너 */
const pkLive=(b,now)=>b.startT<=now&&now<b.endT;
const pkPhaseKey=b=>b.ver+"/"+b.phase;
function pkTabsHTML(banners,now,cur){
  return `<div class="pk-tabs" role="tablist">${banners.map(b=>{const k=pkPhaseKey(b),live=pkLive(b,now),on=k===cur;
    return `<button type="button" role="tab" class="pk-tab${on?" on":""}${live?" live":""}" data-pktab="${esc(k)}" aria-selected="${on}">
      <span class="pk-pt">${live?"지금 픽업":"다음 픽업"}</span><b>${esc(BannerDB.label(b))}</b>
      <small>${live?`종료까지 ${pkLeft(b.endT-now)}`:`${pkDate(b.startT)}부터${b.tentative?" (예정)":""}`}</small></button>`}).join("")}</div>`}
function pkPhaseHTML(b,now,rowOf){const live=pkLive(b,now);
  const when=live?`${pkDate(b.startT)} ~ ${pkDate(b.endT)} · 종료까지 ${pkLeft(b.endT-now)}`:`${pkDate(b.startT)}부터${b.tentative?" (예정)":""} · ${pkLeft(b.startT-now)} 뒤 시작`;
  return `<section class="pk-phase" role="tabpanel"><p class="pk-when">${when} · 배너를 누르면 자세히 보여 줍니다</p>
    <div class="pk-bns">${b.chars.map(e=>pkBannerHTML(e,rowOf(e.id))).join("")}</div>
    ${b.source?`<p class="pk-src">출처: ${esc(b.source)}</p>`:""}</section>`}

/* 맨 위 요약: 추천 순서 */
function pkSummaryHTML(rows){const done=rows.filter(r=>!r.pending&&!r.missing&&!r.done);if(!done.length)return "";
  const sorted=window.MP.PickupAdvisor.sort(done);
  return `<div class="pk-sum"><span class="pk-sl">추천 순서</span><ol>${sorted.map(r=>{const tag=r.owned?`<em class="up">돌파 ${pkPct(r.main.power.pct)}</em>`:`<em class="${r.grade?r.grade.id:""}">${r.grade?r.grade.label:""} ${pkPts(r.main.gain)}</em>`;
    return `<li><a href="#pickup" data-pkgo="${esc(r.id)}">${pkThumb(r.id)}<span>${pkName(r.id)}</span>${tag}</a></li>`}).join("")}</ol></div>`}

// 화면 상태: 고른 페이즈, 펼친 배너
const pkView={phase:null,open:new Set()};
let pkLast=null;
function drawPickup(banners,rows,done,total){const now=Date.now(),box=$("#pkBanners"),foot=$("#pkFoot");if(!box)return;
  pkLast={banners,rows};
  if(!banners.length){box.innerHTML=`<p class="hint">등록된 픽업 배너가 없습니다.</p>`;if(foot)foot.innerHTML="";return}
  if(!banners.some(b=>pkPhaseKey(b)===pkView.phase))pkView.phase=pkPhaseKey(banners.find(b=>pkLive(b,now))||banners[0]);
  const by=new Map(rows.map(r=>[r.id,r])),cur=banners.find(b=>pkPhaseKey(b)===pkView.phase);
  box.innerHTML=pkSummaryHTML(rows)+pkTabsHTML(banners,now,pkView.phase)+pkPhaseHTML(cur,now,id=>by.get(id));
  if(foot)foot.innerHTML=done<total?`<span class="su-prog">계산 중 ${done}/${total}</span>`:""}
const pkRedraw=()=>{if(!pkLast)return;const rows=pkLast.rows;drawPickup(pkLast.banners,rows,rows.filter(r=>!r.pending).length,rows.length)};

function renderPickup(){const box=$("#pkBanners");if(!box)return;const now=Date.now(),banners=BannerDB.shown(now);
  const key=pickupAdvisor.key()+"|"+banners.map(b=>b.ver+"/"+b.phase).join(",");
  if(pkState.key!==key){pickupAdvisor.clear();pkState={key,shared:null,rows:new Map()}}
  const entries=pickupAdvisor.entries(banners),want=x=>!!pkWeapons[x.entry.id],ck=x=>x.entry.id+"|"+(want(x)?1:0);
  const rowsNow=()=>entries.map(x=>{const id=x.entry.id;if(!charMap[id])return {id,missing:true};
    return pkState.rows.get(ck(x))||{id,pending:true,banner:x.banner,entry:x.entry}});
  const todo=entries.filter(x=>charMap[x.entry.id]&&!pkState.rows.has(ck(x)));
  drawPickup(banners,rowsNow(),entries.length-todo.length,entries.length);if(!todo.length)return;
  // 공명자 하나씩 계산한다. 다른 화면으로 가거나 다시 그리면 이전 계산은 멈춘다
  const my=++pkToken;let i=0;
  const step=()=>{if(my!==pkToken||location.hash!=="#pickup")return;
    if(!pkState.shared)pkState.shared=pickupAdvisor.shared();
    else{const x=todo[i++];pkState.rows.set(ck(x),Object.assign({banner:x.banner,entry:x.entry},pickupAdvisor.analyze(x.entry.id,x.entry,pkState.shared,{weapon:want(x)})))}
    drawPickup(banners,rowsNow(),entries.length-todo.length+i,entries.length);if(i<todo.length)setTimeout(step,0)};
  setTimeout(step,0)}

// 페이즈 탭 · 배너 펼치기 · 전용 무기 선택 · 요약에서 배너로 이동
document.addEventListener("click",ev=>{const t=ev.target.closest&&ev.target.closest("[data-pkw],[data-pkgo],[data-pktab],[data-pkopen]");if(!t||!t.closest("#v-pickup"))return;
  const d=t.dataset;
  if(d.pktab){pkView.phase=d.pktab;pkRedraw();return}
  if(d.pkopen){if(pkView.open.has(d.pkopen))pkView.open.delete(d.pkopen);else pkView.open.add(d.pkopen);pkRedraw();return}
  if(d.pkgo){ev.preventDefault();const row=pkLast&&pkLast.rows.find(r=>r.id===d.pkgo),b=row&&row.banner;
    if(b)pkView.phase=pkPhaseKey(b);pkView.open.add(d.pkgo);pkRedraw();
    const el=document.getElementById("pk-"+d.pkgo);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
  const id=d.pkw;if(pkWeapons[id])delete pkWeapons[id];else pkWeapons[id]=true;pkSaveWeapons();renderPickup()});
window.mpDebug&&(window.mpDebug.pickup=()=>pickupAdvisor.analyzeAll(BannerDB.shown(),pkWeapons));
