"use strict";
/* ---------- render: pool ---------- */
const $=s=>document.querySelector(s);
function tokenHTML(c,extra=""){
  const bonus=(cycle.dmgBonus||{})[c.id];
  const pic=hasPic(c.id),sq=gameImg.char.has(c.id);
  return CharacterCard.token({character:c,bonus,pictureUrl:pic?picUrl(c.id):"",hasPicture:pic,squarePicture:sq,elementName:EL[c.el],extra,escape:esc});
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function renderFilter(){
  const box=$("#elFilter");
  box.innerHTML=`<button data-el="" aria-pressed="${!ui.el}">전체</button>`+EL_ORDER.map(e=>`<button data-el="${e}" class="eb" title="${EL[e]}" aria-label="${EL[e]}" aria-pressed="${ui.el===e}">${UIIcon.element(e,{className:"eli"})}</button>`).join("");
}
// 공명자 정렬: rar 5성 먼저(같으면 속성 순) / desc·asc 강함순(공명력·협주력) / name 이름순. ownedFirst면 보유 공명자를 앞에
// 출시 순서는 공명자 파일의 release (클수록 최근). 실제 배너 순서 기준 (1.0 초기 캐릭터는 초상화 번호)
// (3.0 린네→모니에, 3.1 에이메스→루크, 3.2 시그리카, 3.3 히유키→데니아, 3.4 루시·레베카→루실라). 신캐는 숫자를 이어서 추가
function sortChars(list,mode,ownedFirst){const sc={};const S=id=>sc[id]??(sc[id]=charScore(id));
  const cmp={new:(a,b)=>(CharDB.release(b.id)||999)-(CharDB.release(a.id)||999)||a.name.localeCompare(b.name,"ko"),rar:(a,b)=>b.rar-a.rar||EL_ORDER.indexOf(a.el)-EL_ORDER.indexOf(b.el)||a.name.localeCompare(b.name,"ko"),
    desc:(a,b)=>S(b.id)-S(a.id),asc:(a,b)=>S(a.id)-S(b.id),name:(a,b)=>a.name.localeCompare(b.name,"ko")}[mode||"rar"]||((a,b)=>0);
  return list.sort((a,b)=>(ownedFirst?(+!!state.owned[b.id])-(+!!state.owned[a.id]):0)||cmp(a,b));}
function renderPool(){
  const q=ui.q.trim();
  const list=chars.filter(c=>state.owned[c.id]).filter(c=>!ui.el||c.el===ui.el).filter(c=>!q||c.name.includes(q)||c.id.includes(q.toLowerCase()));
  sortChars(list,state.poolSort);$("#poolSort").value=state.poolSort||"rar";
  $("#poolCount").textContent=`${list.length}명`;
  const pool=$("#pool");
  if(!list.length){pool.innerHTML=`<p class="hint" style="grid-column:1/-1">${chars.some(c=>state.owned[c.id])?"검색 결과가 없습니다.":"보유 캐릭터 탭에서 가진 공명자를 체크하세요."}</p>`;return}
  pool.innerHTML=list.map(c=>{
    const max=vigorOf(c.id),left=max-usedCount(c.id);
    const cnt=`<span class="cnt ${max>1?"dbl":""}" title="남은 배치 횟수">${left}/${max}</span>`;
    return `<div class="tok ${left<=0?"used":""} ${selected===c.id?"sel":""}" data-drag="${left>0?1:0}" data-id="${c.id}" data-src="pool" role="button" tabindex="0" aria-label="${esc(c.name)} 남은 ${left}회">${tokenHTML(c,cnt)}</div>`;
  }).join("");
}


/* ---------- team calculation rendering ---------- */
function synChips(t){
  const {links,combos}=teamSynergy(t);let h="";
  combos.forEach(c=>h+=`<span class="chip syn star" title="추천 조합: ${esc(c.ids.map(id=>charMap[id]?charMap[id].name:id).join(" · "))}">★ ${esc(c.name)}</span>`);
  const mech={};links.filter(l=>l.k==="mech").forEach(l=>{(mech[l.tag]=mech[l.tag]||new Set()).add(t.slots[l.i]);mech[l.tag].add(t.slots[l.j])});
  Object.entries(mech).forEach(([tag,s])=>h+=`<span class="chip syn" title="${esc([...s].map(id=>charMap[id].name).join(" · "))}">⛓ ${esc(MT[tag])}</span>`);
  const r=teamCalc(t),nm=id=>charMap[id]?charMap[id].name:id;
  if(r.main){const g=Math.round((r.gain[r.main]||0)*100);if(g>0)h+=`<span class="chip syn" title="메인 딜러가 파티원 반주·파티 버프로 받는 피해 증가(추정). 같은 종류 피해 보너스는 더하기라 평소 보너스 90% 기준으로 줄여 계산">메인 딜러 궁합 +${g}%</span>`}
  r.links.filter(l=>!l.party&&l.e>=0.01).forEach(l=>h+=`<span class="chip syn" title="반주 스킬: ${esc((synOf(l.from).o)||"")}">${esc(nm(l.from))} → ${esc(nm(l.to))} +${Math.round(l.e*100)}%</span>`);
  const pb={};r.links.filter(l=>l.party).forEach(l=>{(pb[l.from]=pb[l.from]||[]).push(l)});
  Object.entries(pb).forEach(([g,ls])=>h+=`<span class="chip syn" title="파티 버프: ${esc(synOf(g).o||"")}">${esc(nm(g))} 파티 버프 +${Math.round(Math.max(...ls.map(l=>l.e))*100)}%</span>`);
  r.setx.filter(l=>Math.abs(l.e)>=0.01).forEach(l=>h+=`<span class="chip syn" title="에코 세트 효과(기준 세트 대비)${l.t.length?": "+esc(l.t.join(", ")):""}">${esc(nm(l.from))} 세트 → ${esc(nm(l.to))} ${l.e>0?"+":""}${Math.round(l.e*100)}%</span>`);
  r.supx.filter(l=>l.e>=0.01).forEach(l=>h+=`<span class="chip syn" title="서포터 조건부 효과(추정): ${esc(l.t.join(", "))}">${esc(nm(l.from))} → ${esc(nm(l.to))} +${Math.round(l.e*100)}%</span>`);
  r.needs.forEach(id=>{const nd=CharDB.needs(id);h+=`<span class="chip" title="이 메커니즘을 가진 파티원이 없어 피해를 ×${nd.mul}로 계산합니다(추정)">${esc(nm(id))}: ${esc(nd.txt)}</span>`});
  if(r.weak.length)h+=`<span class="chip" title="서포터 없는 파티에서 다른 둘에게 반주 이득을 거의 못 받는 공명자는 피해 비중을 ×${NOSYN_W}로 낮춰 계산합니다">반주 시너지 없음: ${esc(r.weak.map(nm).join(", "))}</span>`;
  // cycle power circuit ↔ party mechanics
  const buff=selBuff(t);
  if(buff){const have=[...new Set((buff.effects||[]).map(e=>e.cond).filter(k=>k&&teamMeets(k,t)))];
    if(have.length) h+=`<span class="chip g" title="선택한 파워 서킷의 조건을 이 파티가 만족합니다">서킷 맞춤: ${esc(have.map(k=>COND[k].label).join(", "))}</span>`;}
  return h;
}

/* ---------- hover overlay ---------- */
const tip=document.createElement("div");tip.id="tip";tip.setAttribute("role","tooltip");document.body.appendChild(tip);
function tipHTML(id){
  const c=charMap[id],S=synOf(id);if(!c)return"";
  const ob=(S.ob||[]).map(t=>t==="el"?EL[c.el]+" 피해":DT[t]).filter(Boolean);
  const ROLE={dps:"메인 딜러",sub:"서브 딜러",support:"서포터"};
  const trial=state.owned[id]&&isTrial(id);
  return `<div class="th"><b>${esc(c.name)}</b><span class="elx" style="--ec:var(--${c.el})">${UIIcon.element(c.el)}${EL[c.el]}</span><span class="chip">${ROLE[c.role]||""}</span>${trial?`<span class="chip tipTrial">체험 세팅</span>`:""}</div>
  ${trial?`<div class="tr"><p class="tipTrialTxt">육성하지 않은 체험 세팅으로 계산 중 (90레벨 · 상시 무기 R1 · 공식 가이드 추천 스탯)</p></div>`:""}
  <div class="tr"><span class="tl"><span>반주 스킬</span><span>${S.p?"파티 전체":"다음 캐릭터"}</span></span><p>${esc(S.o||"정보 없음").replace(/(\d+(?:\.\d+)?%)/g,"<em>$1</em>")}</p>${ob.length?`<div class="tc">${ob.map(x=>`<span class="chip g">${esc(x)} ↑</span>`).join("")}</div>`:""}</div>
  ${(S.w||[]).length?`<div class="tr"><span class="tl">주력 피해</span><div class="tc">${S.w.map(x=>`<span class="chip">${DT[x]}</span>`).join("")}</div></div>`:""}
  ${(S.m||[]).length?`<div class="tr"><span class="tl">메커니즘</span><div class="tc">${S.m.map(x=>`<span class="chip syn">${MT[x]}</span>`).join("")}</div></div>`:""}`;
}
let tipFor=null;
document.addEventListener("mouseover",e=>{
  const tk=e.target.closest&&e.target.closest(".tok[data-id]");
  if(!tk||dragData){if(tipFor&&!(e.target.closest&&e.target.closest("#tip"))){tip.classList.remove("on");tipFor=null}return}
  if(tipFor===tk)return;tipFor=tk;tip.innerHTML=tipHTML(tk.dataset.id)+(tk.dataset.src==="slot"?`<div class="tl">우클릭하면 해제</div>`:"");tip.classList.add("on");
  const r=tk.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;
  let x=r.right+10,y=r.top;if(x+tw>innerWidth-8)x=r.left-tw-10;if(x<8)x=Math.max(8,Math.min(innerWidth-tw-8,r.left));
  if(y+th>innerHeight-8)y=Math.max(8,innerHeight-th-8);
  tip.style.left=x+"px";tip.style.top=y+"px";
});
document.addEventListener("dragstart",()=>{tip.classList.remove("on");tipFor=null},true);
addEventListener("scroll",()=>{tip.classList.remove("on");tipFor=null},true);

/* ---------- render: teams ---------- */
// 파티마다 강화 효과별 강도를 계산해 가장 높은 것을 추천한다 (동률이면 모두 추천)
function bestBuffs(t){if(!t.slots.some(Boolean))return new Set();
  const sc=(cycle.buffs||[]).map(b=>[b.id,teamScore({...t,buff:b.id})]);const mx=Math.max(...sc.map(x=>x[1]));
  const base=teamScore({...t,buff:null});if(!(mx>base+1e-9))return new Set();
  return new Set(sc.filter(x=>x[1]>=mx-1e-9).map(x=>x[0]));}
function buffOptions(sel,t){const best=t?bestBuffs(t):new Set();
  return `<option value="">강화 효과 선택</option>`+(cycle.buffs||[]).map(b=>`<option value="${esc(b.id)}" ${sel===b.id?"selected":""}${best.has(b.id)?' class="rec" style="color:#e6c36a;font-weight:700"':""}>${esc(b.name)}${best.has(b.id)?" · 추천":""}</option>`).join("")}
function teamWarnings(t){
  const out=[];const ids=t.slots.filter(Boolean);
  const dps=ids.map(id=>charMap[id]).filter(c=>c&&c.role==="dps");
  // 보스별 유리/불리: 보스 특성 태그(실드·합일·전자 효과 등)를 이 파티가 만족하면 유리, 메인 딜러 속성을 보스가 저항하면 불리
  const buff=selBuff(t);const btags=new Set(buff?(buff.effects||[]).map(e=>e.cond).filter(Boolean):[]);
  const md=mainDps(t),mel=md&&charMap[md].el;
  // 모드가 둘인 공명자(syn.modes: 루실라 서리/에코, 에이메스 불꽃/조화 파동 등)는 한 모드로만 굴린다.
  // 고른 파워 서킷과 겹치는 모드, 없으면 첫 모드 기준으로 유리 표시를 판정한다.
  const bm=new Set(buff?(buff.effects||[]).flatMap(e=>{const d=COND[e.cond];return d?[...(d.m||[]),...(d.w||[]),...(d.el||[])]:[]}):[]);
  const ov={};ids.forEach(id=>{const ms=synOf(id).modes;if(ms&&ms.length)ov[id]=ms.find(m=>m.some(x=>bm.has(x)))||ms[0]});
  const meetsT=k=>{const d=COND[k];return ids.filter(id=>charMeets(k,id,ov[id])).length>=((d&&d.min)||1)};
  if(ids.length)(cycle.bosses||[]).forEach(b=>{
    const tags=(b.effects||[]).flatMap(f=>f.tags||[]).filter(x=>COND[x]);
    const good=tags.filter(x=>meetsT(x));
    const bad=b.res&&b.res===mel;
    if(bad)out.push(`<span class="chip bad" title="메인 딜러(${esc(charMap[md].name)}) 속성 ${EL[mel]}을 이 보스가 저항합니다">${esc(b.name)} 불리</span>`);
    else if(good.length)out.push(`<span class="chip g" title="보스 특성과 맞는 요소: ${esc([...new Set(good)].map(x=>COND[x].label).join(", "))}">${esc(b.name)} 유리</span>`);
  });
  return out.join("");
}
// 예상 점수 + 보스별 예상 진행 (예측치)
function fcastHTML(i){const r=simCache&&simCache.res[i];if(!r||!r.hits.length)return `<span class="none">예상 없음</span>`;
  const tip=`예상 점수·진행 · 예측치\n점수: 준 피해 × 4,750점(1R 보스 1마리) × 라운드 점수 배율 1R 1.0 / 2R 1.1 / 3R 이후 1.25\n진행: 앞 파티가 남긴 HP를 이어받음, 라운드별 HP 1R 1 / 2R 1.77 / 3R 3.36배, 4R 이후 ×2.1씩(추정), 숙련도 ${(SKILL_LV[state.skill]||SKILL_LV.top).label}`;
  const rows=r.hits.map(h=>`<li class="${h.resisted?"res":""}"><span class="bn">${h.round}R ${esc(h.name)}${h.resisted?" <em>저항</em>":""}</span><span class="hp">${Math.round(h.from)}% → ${h.left>0?`<b>${Math.round(h.left)}%</b>`:`<b class="kill">처치</b>`}</span></li>`).join("");
  return `<div class="fc-h" title="${esc(tip)}"><span>예상</span><b>${Math.round(r.pts).toLocaleString()}</b><span>점</span></div><ul class="fc-l">${rows}</ul>`;}
function scoreTip(t){const r=teamCalc(t);if(!r.main)return "";
  return `메인 딜러: ${charMap[r.main].name} (반주·파티 버프 +${Math.round((r.gain[r.main]||0)*100)}%)\n서포터 딜증 +${Math.round(r.amp)}% · 메커니즘·추천 조합 +${Math.round(r.syn)}%${r.weak.length?`\n반주 시너지 없음(비중 ×${NOSYN_W}): ${r.weak.map(id=>charMap[id].name).join(", ")}`:""}\n${t.buff?`파워 서킷 반영 +${r.circuit.toFixed(1)}`:"강화 효과를 고르면 파워 서킷이 반영됩니다"}`;}
let simCache=null;
function renderTeams(){
  queueMicrotask(()=>{const el=$("#ptsTotal");if(el)el.innerHTML=simCache&&simCache.total?`예상 총점 <b>${Math.round(simCache.total).toLocaleString()}</b>`:""});
  const ss=$("#skillSel");if(ss)ss.value=state.skill||"top";
  simCache=simulate(state.teams);
  const order=state.teams.map((t,i)=>({t,i,s:teamScore(t)}));
  const box=$("#teams");
  box.innerHTML=state.teams.map((t,i)=>{
    const els=[...new Set(t.slots.filter(Boolean).map(id=>charMap[id]&&charMap[id].el).filter(Boolean))];
    const sc=teamScore(t);
    const sy=teamSynergy(t);
    const chips=synChips(t);
    const linked=new Set(sy.links.flatMap(l=>[l.i,l.j]));
    const lk=si=>{if(si===0)return"";const on=sy.adj[si];const a=t.slots[si-1],b=t.slots[si];if(!a||!b)return"";
      const l=sy.links.filter(x=>x.i===si-1&&x.j===si).map(x=>x.txt);return `<span class="lnk ${on?"on":""}" title="${esc(on?l.join("\n"):"연결된 시너지 없음")}">${on?"✓":""}</span>`};
    return `<div class="team${sy.adj.wrap?" wrap":""}" data-team="${i}">
      <div class="no">${String(i+1).padStart(2,"0")}<small>${t.example?"예시":"PARTY"}</small></div>
      ${t.slots.map((id,si)=>{const c=id&&charMap[id];return `<div class="slot ${c?"filled":"empty"}${linked.has(si)?" syn":""}" data-team="${i}" data-slot="${si}">${lk(si)}${c?`<div class="tok" data-drag="1" data-id="${c.id}" data-src="slot" data-team="${i}" data-slot="${si}">${tokenHTML(c)}</div>`:""}</div>`}).join("")}
      <div class="meta">
        <div class="row"><span class="score" title="${esc(scoreTip(t))}">강도 <b>${sc.toFixed(1)}</b>${t.buff&&sc>teamBase(t)?`<small class="up">+${Math.round((sc/teamBase(t)-1)*100)}%</small>`:""}</span>
          <div class="mini"><button data-act="up" data-team="${i}" aria-label="위로">▲</button><button data-act="down" data-team="${i}" aria-label="아래로">▼</button><button data-act="del" data-team="${i}" aria-label="파티 삭제">✕</button></div></div>
        <div class="row"><select data-buff="${i}" aria-label="${i+1}번 파티 강화 효과">${buffOptions(t.buff,t)}</select></div>
        <div class="row">${teamWarnings(t)}</div>

      </div>
      <div class="fcast">${fcastHTML(i)}</div>
      <div class="synbox">${chips||`<span class="none">시너지 없음</span>`}</div>
    </div>`;
  }).join("") || `<p class="hint">파티가 없습니다. “+ 파티 추가”를 누르세요.</p>`;
}

/* ---------- render: intel ---------- */
function renderIntel(){
  $("#cycleTag").textContent=(cycle.name||"").toUpperCase();
  const em=cycle.emergency&&charMap[cycle.emergency.id];
  const bonusIds=Object.keys(cycle.dmgBonus||{}).filter(id=>charMap[id]);
  $("#intel").innerHTML=`
  <div class="panel"><div class="ph">이번 주기 적 <span class="sp period">${esc(cycle.period||"")}</span></div><div class="body">
    ${(cycle.bosses||[]).map((b,i)=>`<div class="boss"><span class="ix">${String(i+1).padStart(2,"0")}</span><div><b>${esc(b.name)}</b>${b.tentative?` <span class="chip" title="한국어 공식 표기를 확인하지 못한 이름입니다. 주기 설정 탭에서 고칠 수 있습니다.">가칭</span>`:""} ${b.res?`<span class="chip el" style="--ec:var(--${b.res})">${EL[b.res]} 저항</span>`:`<span class="chip">저항 동일</span>`}<p>${esc(b.note||"")}</p>${(b.effects||[]).length?`<ul class="fx">${b.effects.map(f=>`<li class="${f.kind==="threat"?"t":"b"}"><span>${f.kind==="threat"?"주의":"유리"}${f.round?" · "+esc(f.round):""}</span>${esc(f.text)}</li>`).join("")}</ul>`:""}</div></div>`).join("")}
  </div></div>
  <div class="panel"><div class="ph">파워 서킷 (강화 효과)</div><div class="body">
    ${(cycle.buffs||[]).map(b=>`<div class="buff"><b>${esc(b.name)}</b> <span class="tag">${esc(b.type||"")}</span><ul>${(b.effects||[]).map(e=>`<li>${esc(e.text)}</li>`).join("")}</ul></div>`).join("")}
  </div></div>
  <div class="panel"><div class="ph">배치 횟수 · 강화 공명자</div><div class="body">
    <div><span class="lbl">배치 2회</span><div class="ench" style="margin-top:4px">${(cycle.vigor2||[]).filter(id=>charMap[id]).map(id=>`<span class="chip">${esc(charMap[id].name)}</span>`).join("")}${em?`<span class="chip g" title="${esc(cycle.emergency.note||"")}">${esc(em.name)} (긴급 +${cycle.emergency.extraVigor||1})</span>`:""}</div></div>
    <div><span class="lbl">피해 증가</span><div class="ench" style="margin-top:4px">${bonusIds.map(id=>`<span class="chip w">${esc(charMap[id].name)} +${cycle.dmgBonus[id]}%</span>`).join("")}</div></div>
  </div></div>`;
}

/* ---------- render: roster ---------- */
function renderRoster(){
  const q=ui.rq.trim();
  $("#rElFilter").innerHTML=`<button data-el="" aria-pressed="${!ui.rel}">전체</button>`+EL_ORDER.map(e=>`<button data-el="${e}" class="eb" title="${EL[e]}" aria-label="${EL[e]}" aria-pressed="${ui.rel===e}">${UIIcon.element(e,{className:"eli"})}</button>`).join("");
  const list=chars.filter(c=>(!q||c.name.includes(q))&&(!ui.rel||c.el===ui.rel));
  sortChars(list,state.rosterSort||"new",true);$("#rosterSort").value=state.rosterSort||"new";
  const fav=state.fav||{};list.sort((a,b)=>(+!!fav[b.id])-(+!!fav[a.id])); // 즐겨찾기는 어떤 정렬이든 맨 앞 (안정 정렬이라 그 안의 순서는 유지)
  $("#ownCount").textContent=`보유 ${chars.filter(c=>state.owned[c.id]).length} / ${chars.length}`;
  const pm=state.rosterView==="profile";$("#rgrid").classList.toggle("pmode",pm);
  document.querySelectorAll("[data-rview]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.rview===(pm?"profile":"icon"))));
  if(pm){$("#rgrid").innerHTML=list.map(profCardHTML).join("")||`<p class="hint">조건에 맞는 공명자가 없습니다.</p>`;return}
  $("#rgrid").innerHTML=list.map(c=>{
    const g=state.growth[c.id]||{};const on=!!state.owned[c.id];const wp=weaponOf(c.id);
    const extra=(g.trial?`<span class="rlv rtr" title="체험 세팅 (육성 안 함)">체험</span>`:`<span class="rlv"><small>Lv.</small>${g.lv??90}</span>`)+`<span class="rch" title="공명 체인">${+g.chain||0}<small>돌파</small></span>`+
      (wp.w?`<span class="rwep q${wp.w.q}" title="${esc(wp.w.name)} R${wp.ref}">${UIIcon.weapon(weaponIcon(wp.w))}<b>R${wp.ref}</b></span>`:"")+
      (on?"":`<span class="roff">미보유</span>`)+favBtn(c,"rfav");
    return `<div class="tok rcard ${on?"":"off"}" data-id="${c.id}" role="button" tabindex="0" aria-label="${esc(c.name)} 설정${on?"":" (미보유)"}">${tokenHTML(c,extra)}</div>`;
  }).join("")||`<p class="hint">조건에 맞는 공명자가 없습니다.</p>`;
}
const favBtn=(c,cls)=>FavoriteButton.render({character:c,className:cls,active:!!(state.fav||{})[c.id],escape:esc});
// 프로필 모드 카드: 전신 그림 + 속성·성급·레벨·돌파·무기
function profCardHTML(c){const g=state.growth[c.id]||{};const on=!!state.owned[c.id];const wp=weaponOf(c.id);const pic=cardUrl(c.id);
  return CharacterCard.profile({character:c,growth:g,owned:on,weapon:wp,pictureUrl:pic,elementName:EL[c.el],favoriteHtml:favBtn(c,"pfav"),weaponIconUrl:wp.w?weaponIcon(wp.w):"",escape:esc})}
function toggleOwned(id){const on=appMediator.characters.toggleOwned(id);
  if(!on)appMediator.teams.removeCharacter(id);
  persist();renderRoster();rerenderPlan();flash(`${charMap[id].name}: ${on?"보유":"미보유"}`);}

/* ---------- profile: stats ---------- */
const BASE_STATS=[["hp","HP",""],["atk","공격력",""],["def","방어력",""],["er","공명 효율","%"],["cr","크리티컬","%"],["cd","크리티컬 피해","%"]];
function statSum(id){const c=charMap[id];if(c.role==="support"){const p=echoCalculator.supportProgress(id);return `지원 기준 ${p.met}/${p.total} 충족`}
  const g=state.growth[id]||{},src=g.trial?"체험 세팅":echoesOf(id).length?"에코 세팅 사용 중":g.stats?"직접 입력":"에코 미입력 · 체험 세팅으로 계산";return `공명력 ${charScore(id).toFixed(0)} (${src})`}
// 개인 점수 이름: 딜러 공명력 / 서포터 협주력. 표시 꼬리표: 체험 · 에코 미입력
function scoreName(id){return charMap[id]&&charMap[id].role==="support"?"협주력":"공명력"}
function scoreTag(id){const g=state.growth[id]||{};if(g.trial)return "체험";return noEchoInput(id)?"체험 세팅":""}
// 에코도 스탯 직접 입력도 없는 보유 공명자 → 체험 세팅 기준 스탯으로 계산 중
function noEchoInput(id){const g=state.growth[id]||{};return !g.trial&&!echoesOf(id).length&&!g.stats}
function trialChainNote(id){const ch=CharDB.trialSpec(id).chain;return ch==null?" · 공명 체인은 지금 설정":` · ${ch}체인`}

/* ---------- profile: 에코 세팅 ----------
   에코 5칸(카드) + 세트 구성(5세트 / 3+2세트 / 데이터가 지원하는 1+2+2세트) + 요약 줄. */
let pfTabSel=null,echoSel=null,echoEdit=null;const echoMsg={};
function pfTab(id){if(pfTabSel)return pfTabSel;const g=state.growth[id]||{};return g.stats&&!echoesOf(id).length?"stat":"echo"}
function echoSlots(id){return appMediator.echoes.slots(id)}
// 세트 구성. 저장값이 없으면 공명자의 주력 세트(3+2 등)를 기본으로
const SLOT_COST=[4,3,3,1,1];
const fmtV=(k,v)=>`${+(+v).toFixed(1)}${EchoDB.PCT_KEYS.has(k)?"%":""}`;
const echoLab=(k,elem)=>k==="el"&&elem?`${EL[elem]} 피해`:k==="atk%"?"공격력":k==="hp%"?"HP":k==="def%"?"방어력":EchoDB.LABEL[k]||k;
const ST_ICON=new Set(["atk","hp","def","er","cr","cd","basic","heavy","skill","lib","echo","glacio","fusion","electro","aero","spectro","havoc"]);
const statIcon=(k,elem)=>{const n=({"atk%":"atk","hp%":"hp","def%":"def",el:elem})[k]||k;return ST_ICON.has(n)?`<img class="sti" src="icons/st-${n}.png" alt="">`:`<i class="sti"></i>`};
const setIconUrl=name=>{const x=EchoDB.setIcon(name);if(!x)return "";return gameImg.set&&gameImg.set.has(x[0])?`img/set/${x[0]}.webp`:`https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconElementAttri/${x[1]}.webp`};
// 이 공명자에게 쓸모 있는 부옵인지 (흐리게 표시할지 판단)
function subUseful(id,k){return echoCalculator.usefulStat(id,k)}
function echoHTML(id){
  const c=charMap[id];const E=echoSlots(id);const n=E.filter(Boolean).length;const S=echoSetOf(id);const modes=echoSetModes(id);const sets=EchoDB.setNames();
  const cost=E.reduce((a,e)=>a+(e?+e.cost:0),0);
  const opt=v=>sets.map(x=>`<option${x===v?" selected":""}>${esc(x)}</option>`).join("");
  const setbar=`<div class="esetbar"><div class="seg2" role="group" aria-label="세트 구성"><button type="button" data-esmode="5" aria-pressed="${S.mode==="5"}">5세트</button><button type="button" data-esmode="32" aria-pressed="${S.mode==="32"}">3+2세트</button>${modes.includes("122")?`<button type="button" data-esmode="122" aria-pressed="${S.mode==="122"}">1+2+2세트</button>`:""}</div>
    <label class="esel"><img src="${setIconUrl(S.a)}" alt="" onerror="this.style.visibility='hidden'"><select data-eseta aria-label="첫 번째 세트">${opt(S.a)}</select><em>×${S.mode==="5"?5:S.mode==="32"?3:1}</em></label>
    ${S.mode!=="5"?`<label class="esel"><img src="${setIconUrl(S.b)}" alt="" onerror="this.style.visibility='hidden'"><select data-esetb aria-label="두 번째 세트">${opt(S.b)}</select><em>×2</em></label>`:""}
    ${S.mode==="122"?`<label class="esel"><img src="${setIconUrl(S.c)}" alt="" onerror="this.style.visibility='hidden'"><select data-esetc aria-label="세 번째 세트">${opt(S.c)}</select><em>×2</em></label>`:""}
    <span class="ecostc${cost>12?" bad":""}">코스트 ${cost}/12</span><button type="button" class="btn ghost eopen" id="pfEOpen">이미지 불러오기</button><span class="estat-msg" id="pfEOcr"></span></div>`;
  const card=(e,i)=>{const m=echoMsg[id+":"+i];const msg=m?`<div class="ec-msg${/실패/.test(m)?" err":""}">${esc(m)}</div>`:"";const sel=echoSel===i?" sel":"";
    if(!e)return `<div class="ecard empty${sel}" data-eslot="${i}"><div class="ec-plus">+</div><div>입력할 칸 선택</div><small>선택 후 Ctrl+V · 끌어다 놓기</small><button type="button" class="ec-b" data-enew="${i}">직접 입력</button>${msg}</div>`;
    const ed=echoEdit===i;const F=EchoDB.FIXED[e.cost];
    const head=`<div class="ec-h"><select class="ec-cost" data-ecost="${i}" aria-label="코스트">${[4,3,1].map(x=>`<option value="${x}"${x===+e.cost?" selected":""}>${x}코</option>`).join("")}</select><span class="ec-sp"></span>
      <button type="button" class="ec-b" data-ecap="${i}" title="캡처로 다시 읽기">캡처</button><button type="button" class="ec-b" data-eedit="${i}">${ed?"완료":"수정"}</button><button type="button" class="ec-b" data-edel="${i}" title="지우기" aria-label="에코 ${i+1} 지우기">✕</button></div>`;
    if(ed)return `<div class="ecard${sel}" data-eslot="${i}">${head}${echoEditHTML(e,i)}${msg}</div>`;
    const subs=[0,1,2,3,4].map(j=>{const x=(e.subs||[])[j];if(!x)return `<div class="ec-sub none"><i class="sti"></i><span>—</span></div>`;
      return `<div class="ec-sub t${EchoDB.tier(x.k,x.v)}${subUseful(id,x.k)?" good":" off"}">${statIcon(x.k)}<span>${esc(echoLab(x.k))}</span><b>${fmtV(x.k,x.v)}</b></div>`}).join("");
    return `<div class="ecard${sel}" data-eslot="${i}">${head}
      <div class="ec-main">${statIcon(e.main.k,e.main.elem)}<span>${esc(echoLab(e.main.k,e.main.elem))}</span><b>${fmtV(e.main.k,e.main.v)}</b></div>
      ${F?`<div class="ec-fix"><span>${F[0]==="hp"?"HP":"공격력"}</span><span>${F[1].toLocaleString()}</span></div>`:""}
      <div class="ec-subs">${subs}</div>${msg}</div>`};
  const tiers=`<div class="etier"><span>부옵 수치 단계</span><span><i style="background:#7d8791"></i>1~2</span><span><i style="background:#ffffff"></i>3~4</span><span><i style="background:#6fe08a"></i>5~6</span><span><i style="background:#ffd23f"></i>7</span><span><i style="background:#ff5c5c"></i>8 (최대)</span><span>· 금색 테두리 = 이 공명자의 유효 부옵, 흐린 줄 = 효과 없음</span></div>`;
  return `${setbar}<div class="ecards">${E.map(card).join("")}</div>${tiers}${n?echoSumHTML(id):`<p class="sbnote" style="text-align:left;margin-top:10px">에코 화면 캡처를 칸마다 붙여넣으면 주옵·부옵을 읽어 최종 스탯을 계산합니다. 세트는 위에서 ${modes.includes("122")?"5세트 / 3+2세트 / 1+2+2세트":"5세트 / 3+2세트"}로 고르세요.${c.role==="support"?" 지원 기준은 비전투 최종 스탯으로 확인하며, 공명 효율에 연동된 파티 버프와 에코 세트 효과는 파티 계산에 반영합니다.":""}</p>`}
   ${n?`<button type="button" class="btn ghost sclear" id="pfEClear">에코 모두 지우기</button>`:""}`}
function echoSumHTML(id){const c=charMap[id];const eb=echoBuild(id);if(!eb)return "";const sf=statFactor(id);const sc=scaleOf(id);const I=ijkOf(id);const gd=CharDB.guide(id)||{};const X=sheetStats(id);
  const support=c.role==="support",sp=support?echoCalculator.supportProgress(id):null;
  const erm=CharDB.erMin(id);(erm.adj||[]).forEach(a=>{const x=eb.sets.find(z=>z.name===a.set);if(x&&x.c>=a.n){erm.min+=a.d;erm.adjText=`${a.set} ${a.n}세트 ${a.d>0?"+":""}${a.d}`}});
  {const m=(erm.note||"").match(/(\d)체인 이상/);const ch=+((state.growth[id]||{}).chain)||0;if(m&&ch>=+m[1])erm.note+=` — 지금 ${ch}돌이라 실제 요구치는 더 낮을 수 있음`}
  const erLow=X.er+0.05<erm.min;
  // 막대: 금색 눈금 = 기준(공식 가이드 추천 → 이잘키). 눈금은 막대의 77% 위치
  const bar=(label,v,ref,unit,warn,tip)=>{const w=ref?Math.min(100,v/ref*77):0;return `<div class="es-st${warn?" warn":""}" title="${esc(tip||"")}"><span>${label}<b>${unit==="%"?v.toFixed(1)+"%":Math.round(v).toLocaleString()}</b></span><div class="ebar"><i style="width:${w}%"></i>${ref?`<u style="left:77%"></u>`:""}</div></div>`};
  const mainV=X[sc],mainRef=gd[sc]||I.main[1],mainLabel=sc==="hp"?"HP":sc==="def"?"방어력":"공격력";
  const crRef=gd.cr||I.cr,cdRef=gd.cd||I.cd;
  const fx=eb.fx.filter(f=>f.to!=="next"&&f.eff>0).map(f=>`${echoLab(f.k,f.elem)} +${+f.eff.toFixed(1)}`);
  const supportRows=sp?Object.entries(sp.targets).map(([k,ref])=>bar(({hp:"HP",def:"방어력",atk:"공격력",er:"공명 효율"})[k]||k,X[k],ref,k==="er"?"%":"",X[k]+.05<ref,`지원 기준 ${ref}${k==="er"?"%":""}`)).join(""):"";
  return `<div class="esum2">${support?`<div class="es-score"><span>지원 기준</span><b>${sp.met}/${sp.total} 충족</b></div>${supportRows}`:`
    <div class="es-score"><span>스탯 배율</span><b>${sf?(sf.f*100).toFixed(0)+"%":"–"}</b></div>
    ${bar(mainLabel,mainV,mainRef,"",false,`기준 ${Math.round(mainRef).toLocaleString()}`)}
    ${bar("크리티컬",X.cr,crRef,"%",false,`기준 ${crRef}%${gd.cr?" (공식 가이드 추천)":""}`)}
    ${bar("크리 피해",X.cd,cdRef,"%",false,`기준 ${cdRef}%${gd.cd?" (공식 가이드 추천)":""}`)}
    ${bar(`${EL[c.el]} 피해`,X.el,elRefOf(id),"%",false,`기준 ${elRefOf(id)}%`)}
    ${bar("공명 효율",X.er,erm.min,"%",erLow,`최소 ${erm.min}%${erm.src==="guide"?" (공식 가이드)":erm.est?" (추정)":" (이잘키)"}`)}`}
    <div class="es-note">${eb.sets.map(x=>`<img class="esi" src="${setIconUrl(x.name)}" alt="" onerror="this.remove()">${esc(x.name)} ${x.c}개${x.on.length?` (${x.on.map(p=>p+"세트").join("·")})`:""}`).join(" · ")}${fx.length?` · 조건부 효과(유지율 반영): ${fx.join(", ")}`:""}${Object.entries(X.types).filter(([k,v])=>v>0).length?` · 피해 보너스: ${Object.entries(X.types).filter(([k,v])=>v>0).map(([k,v])=>`${EchoDB.LABEL[k]} ${v.toFixed(1)}%`).join(", ")}`:""}</div>
    ${!support&&(erm.note||erm.adjText)?`<div class="es-note">공명 효율 최소치 ${erm.min}%: ${[erm.adjText?`${esc(erm.adjText)} 적용`:"",erm.note?esc(erm.note):""].filter(Boolean).join(" · ")}</div>`:""}
    ${!support&&erLow?`<div class="es-note warn">공명 효율이 최소치보다 ${(erm.min-X.er).toFixed(1)}% 낮아 사이클이 밀릴 수 있어요. 다른 칸의 부옵, 3코 공명 효율 주옵, 떠오르는 구름 2세트로 채우는 걸 먼저 고려하세요. (강도에는 반영하지 않음)</div>`:""}
    ${echoSlots(id).filter(Boolean).length<5?`<div class="es-note">에코 ${echoSlots(id).filter(Boolean).length}/5 — 빈 칸은 스탯 0으로 계산합니다.</div>`:""}</div>`}
function echoEditHTML(e,i){const M=(EchoDB.mainStats(e.cost)||{}).main||{};
  const mainOpts=Object.keys(M).map(k=>`<option value="${k}"${k===e.main.k?" selected":""}>${esc(k==="el"?"속성 피해":echoLab(k)+(EchoDB.PCT_KEYS.has(k)&&["atk%","hp%","def%"].includes(k)?"%":""))}</option>`).join("");
  const subKeys=EchoDB.subKeys();
  const row=(j,x)=>`<select data-esk="${i}:${j}" aria-label="부옵 ${j+1}"><option value="">(없음)</option>${subKeys.map(k=>`<option value="${k}"${x&&x.k===k?" selected":""}>${esc(echoLab(k))}${["atk%","hp%","def%"].includes(k)?"%":["atk","hp","def"].includes(k)?" (고정)":""}</option>`).join("")}</select><input type="number" step="any" data-esv="${i}:${j}" value="${x?x.v:""}" aria-label="부옵 ${j+1} 수치">`;
  return `<div class="eedit"><select data-emk="${i}" aria-label="주옵">${mainOpts}</select><input type="number" step="any" data-emv="${i}" value="${e.main.v}" aria-label="주옵 수치">
    ${e.main.k==="el"?`<select data-eme="${i}" aria-label="속성">${EL_ORDER.map(x=>`<option value="${x}"${x===e.main.elem?" selected":""}>${EL[x]} 피해</option>`).join("")}</select><span></span>`:""}
    ${[0,1,2,3,4].map(j=>row(j,(e.subs||[])[j])).join("")}</div>`}
function saveEchoes(id,arr){const g=state.growth[id]=state.growth[id]||{};g.echoes=arr.some(Boolean)?arr:undefined;if(!g.echoes)delete g.echoes;
  persist();requestAnimationFrame(()=>{renderProfile();renderRoster();rerenderPlan()})} // 입력칸 change·blur 처리 중에 다시 그리지 않도록 다음 프레임에
function saveEchoSet(id,patch){appMediator.echoes.patchSet(id,echoSetOf(id),patch);persist();requestAnimationFrame(()=>{renderProfile();renderRoster();rerenderPlan()})}
function newEcho(id,i){const cost=SLOT_COST[i]||1;const M=(EchoDB.mainStats(cost)||{}).main||{};const k=cost===4?"cr":cost===3?"el":"atk%";
  return {cost,main:Object.assign({k,v:M[k]},k==="el"?{elem:(charMap[id]||{}).el}:{}),subs:[]}}
function echoQueue(id,files){const E=echoSlots(id);const free=[];if(echoSel!=null&&files.length===1)free.push(echoSel);
  E.forEach((e,i)=>{if(!e&&!free.includes(i))free.push(i)});
  files.slice(0,free.length).forEach((f,k)=>ocrEcho(id,f,free[k]));
  if(files.length>free.length){const m=$("#pfEOcr");if(m)m.textContent=free.length?`빈 칸이 ${free.length}개라 ${files.length-free.length}장은 넣지 못했어요.`:"빈 칸이 없어요. 바꿀 카드를 눌러 고른 뒤 다시 붙여넣으세요."}}
/* 에코 캡처 인식: 줄마다 배경 밝기가 달라(강조 줄) 한 가지 흑백 기준으로는 글자가 깨질 때가 있다.
   기준을 바꿔 가며 몇 번 읽고, 부옵 5줄이 숫자 수정 없이 읽히면 바로 멈춘다. 가장 잘 읽힌 결과를 쓴다. */
const ECHO_PASSES=[[130,0],[150,2],[115,0],[150,0]];
let _ew=null;
function echoWorker(){return _ew||(_ew=loadTesseract().then(async T=>{const w=await T.createWorker("kor+eng");await w.setParameters({tessedit_pageseg_mode:"6"});return w}).catch(e=>{_ew=null;throw e}))}
let _eq=Promise.resolve();
async function readEcho(blob){const w=await echoWorker();const got=[];
  for(const [th,sc] of ECHO_PASSES){const cv=await prepImage(blob,th,sc||0);const {data}=await w.recognize(cv);const e=EchoDB.parse(data.text);
    if(e&&e.main)got.push(e);if(got.length===1&&e&&e.subs.length>=5&&!e.subFix)break} // 첫 번째에 깨끗이 읽히면 바로 끝
  return EchoDB.merge(got)}
async function ocrEcho(id,blob,i){const key=id+":"+i;echoMsg[key]="글자 인식 중… (처음 한 번은 10초 정도 걸립니다)";if(profId===id)renderProfile();
  const job=_eq.then(()=>readEcho(blob));_eq=job.catch(()=>{});
  try{const e=await job;if(!e||!e.main)throw new Error("에코 옵션을 찾지 못했습니다. 주옵부터 부옵까지 보이게 캡처해 주세요.");
    const arr=echoSlots(id);arr[i]={cost:e.cost,main:e.main,subs:e.subs};
    delete echoMsg[key];echoSel=null;saveEchoes(id,arr);
  }catch(err){echoMsg[key]="인식 실패: "+err.message;if(profId===id)renderProfile()}}
function statsHTML(id){
  const c=charMap[id];const st=(state.growth[id]||{}).stats||{};const b=st.b||{};
  const I=ijkOf(id),sc=scaleOf(id),gd=CharDB.guide(id)||{},targets=echoCalculator.supportTargets(id),mainRef=gd[sc]||I.main[1];
  const ph=(k,grp)=>grp?`${k==="el"?elRefOf(id):TYPE_REF}`:c.role==="support"?targets[k]!=null?`${targets[k]}`:"–":k===sc?`${mainRef}`:k==="cr"?`${I.cr}`:k==="cd"?`${I.cd}`:"–";
  const row=(k,label,unit,val,grp,icon)=>`<label class="sr">${icon?`<img src="${icon}" alt="">`:`<i class="noi"></i>`}<span>${label}</span><input type="number" step="any" min="0" data-st="${k}" ${grp?`data-grp="b"`:""} value="${val??""}" placeholder="${ph(k,grp)}"><em>${unit}</em></label>`;
  const bk=bonusKeysOf(id);
  const tab=pfTab(id);
  return `<div class="ptabs" role="tablist"><button type="button" data-ptab="echo" aria-pressed="${tab==="echo"}">에코 세팅</button><button type="button" data-ptab="stat" aria-pressed="${tab==="stat"}">스탯 직접 입력</button></div>
   ${tab==="echo"?echoHTML(id):`<div class="pf-sec"><span>스탯</span><b id="pfStSum">${statSum(id)}</b></div>
   <div class="paste" id="pfPaste" tabindex="0"><span>스탯 화면 캡처를 <b>Ctrl+V</b>로 붙여넣거나 끌어다 놓으세요.</span> <button type="button" class="btn" id="pfPick">이미지 선택</button><input type="file" accept="image/*" id="pfFile" hidden><span id="pfOcr" class="ocr"></span></div>
    <p class="sbnote">${c.role==="support"?`지원 기준: ${Object.entries(targets).map(([k,v])=>`${({hp:"HP",def:"방어력",atk:"공격력",er:"공명 효율"})[k]} ${v.toLocaleString()}${k==="er"?"%":""}`).join(" · ")}<br>비전투 최종 스탯의 기준 충족 여부를 표시합니다. 지원에 쓰는 공격력·HP·방어력은 해당 캐릭터의 회복·보호막에 도움이 됩니다. 크리티컬은 지원 기준에 넣지 않습니다.`:`기준(이 정도면 잘 키웠다${I.est?" · 표에 없어 추정":""}): ${sc==="hp"?"HP":sc==="def"?"방어력":"공격력"} ${mainRef.toLocaleString()} · 크리티컬 ${gd.cr||I.cr}% · 크리티컬 피해 ${gd.cd||I.cd}% · 3코 ${esc(I.cfg)}<br>칸에 흐리게 보이는 숫자가 기준입니다. 비전투 캐릭터 정보창의 최종 스탯을 입력하면 이 기준과 비교해 강도에 반영합니다.`}</p>
   <div class="srs">${BASE_STATS.map(([k,l,u])=>row(k,l,u,st[k],false,`icons/st-${k}.png`)).join("")}</div>
   <div class="sdiv"><span>피해 보너스</span></div>
    ${c.role==="support"?"":`<p class="sbnote">비워 둔 칸은 기준치(속성 ${elRefOf(id)}% · 주력 피해 유형 ${TYPE_REF}%)로 계산합니다. 속성 기준 = 3코 속성 피해 개수 × 30 + 세트 10${I.node?" + 속성 노드 12":""}</p>`}
   <div class="srs">${bk.map(k=>row(k,k==="el"?`${EL[c.el]} 피해`:`${BONUS_KEYS[k]} 피해`,"%",b[k],true,k==="el"?`icons/st-${c.el}.png`:`icons/st-${k}.png`)).join("")}</div>
   <button type="button" class="btn ghost sclear" id="pfStClear">스탯 지우기</button>`}`;
}
let _tess=null;
function loadTesseract(){return _tess||(_tess=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";sc.onload=()=>res(window.Tesseract);sc.onerror=()=>{_tess=null;rej(new Error("글자 인식 도구를 불러오지 못했습니다"))};document.head.appendChild(sc);}))}
async function prepImage(blob,th,scale){ // 확대 + 흑백 반전(어두운 배경의 흰 글씨 → 흰 바탕 검은 글씨). th: 밝기 기준(기본 150)
  th=th||150;const bm=await createImageBitmap(blob);const k=scale||Math.max(1,Math.min(3,1400/bm.width));
  const cv=document.createElement("canvas");cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);
  const x=cv.getContext("2d");x.drawImage(bm,0,0,cv.width,cv.height);const im=x.getImageData(0,0,cv.width,cv.height),d=im.data;
  for(let i=0;i<d.length;i+=4){const v=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];const o=v>th?0:255;d[i]=d[i+1]=d[i+2]=o;d[i+3]=255}
  x.putImageData(im,0,0);return cv;}
function parseStats(text,bk){
  // 1) 항목 이름으로 찾고, 2) 못 찾은 기본 스탯은 스탯 화면의 고정 순서(HP·공격력·방어력·공명 효율·크리티컬·크리티컬 피해)로 채운다.
  const PCT=new Set(["er","cr","cd"]);
  const val=(str,pct)=>{const t=str.replace(/[Oo]/g,"0").replace(/[lI|]/g,"1").replace(/,/g,"");
    if(pct){const m=t.match(/(\d+\.\d)/)||t.match(/(\d+)/);return m?parseFloat(m[1]):null}
    const m=t.match(/(\d+)/);return m?parseFloat(m[1]):null};
  const lines=text.split(/\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.replace(/[Oo](?=[\d.%])|(?<=[\d.])[Oo]/g,"0").match(/(\d[\d,]*(?:\.\d+)?)\s*%?\s*$/);return {l,num:m?m[1]:null,pct:/%|\d\.\d/.test(m?m[0]:"")}}).filter(x=>x.num);
  const out={b:{}},used=new Set();
  const RULES=[[/크리티컬\s*피해/,"cd"],[/크리티컬|크리티칼/,"cr"],[/공명\s*효율/,"er"],[/공격력/,"atk"],[/방어력/,"def"],[/\bHP\b|H\s*P|체력/i,"hp"],
    [/(응결|용융|전도|기류|회절|인멸)\s*피해/,"b.el"],[/일반\s*공격/,"b.basic"],[/강\s*공격/,"b.heavy"],[/공명\s*스킬/,"b.skill"],[/공명\s*해방/,"b.lib"],[/에코\s*어빌리티/,"b.echo"]];
  lines.forEach((x,i)=>{for(const [re,k] of RULES){if(re.test(x.l)){const isB=k.startsWith("b.");const v=val(x.num,isB||PCT.has(k));
    if(v!=null){if(isB){if(out.b[k.slice(2)]==null)out.b[k.slice(2)]=v}else if(out[k]==null)out[k]=v;used.add(i)}break}}});
  const ORDER=["hp","atk","def","er","cr","cd"];const base=lines.slice(0,6);
  if(base.length===6) ORDER.forEach((k,i)=>{if(out[k]==null&&!used.has(i)){out[k]=val(base[i].num,PCT.has(k));used.add(i)}});
  // 이름을 못 읽은 '피해 보너스' 줄: 이 공명자에게 필요한 보너스 칸 중 빈 칸에 순서대로
  const freeB=(bk||[]).filter(k=>out.b[k]==null);
  lines.forEach((x,i)=>{if(used.has(i)||!freeB.length)return;if(/보너스|피해/.test(x.l)){out.b[freeB.shift()]=val(x.num,true);used.add(i)}});
  return out;}
async function ocrStats(blob){
  const m=$("#pfOcr");if(m)m.textContent="글자 인식 중… (처음 한 번은 10초 정도 걸립니다)";
  try{const T=await loadTesseract();const cv=await prepImage(blob);
    const {data}=await T.recognize(cv,"kor+eng");const got=parseStats(data.text,bonusKeysOf(profId));
    const keys=Object.keys(got).filter(k=>k!=="b");const bkeys=Object.keys(got.b);
    if(!keys.length&&!bkeys.length)throw new Error("스탯을 찾지 못했습니다. 항목 이름과 숫자가 함께 보이게 캡처해 주세요.");
    const g=state.growth[profId]=state.growth[profId]||{};const st=g.stats=Object.assign({},g.stats||{});st.b=Object.assign({},st.b||{},got.b);keys.forEach(k=>st[k]=got[k]);
    persist();renderProfile();renderRoster();rerenderPlan();
    const mm=$("#pfOcr");if(mm)mm.textContent=`인식 완료: ${[...keys.map(k=>(BASE_STATS.find(x=>x[0]===k)||[,k])[1]),...bkeys.map(k=>BONUS_KEYS[k]+" 보너스")].join(", ")}. 숫자가 맞는지 확인해 주세요.`;
    return got;
  }catch(e){const mm=$("#pfOcr");if(mm)mm.textContent="인식 실패: "+e.message;}
}
window.mpOcrTest=async (url,id)=>{const b=await fetch(url).then(r=>r.blob());const T=await loadTesseract();const cv=await prepImage(b);const {data}=await T.recognize(cv,"kor+eng");return {text:data.text,parsed:parseStats(data.text,id?bonusKeysOf(id):["el","heavy"])}};
window.mpDebug={teamCalc:(ids,buff)=>teamCalc({slots:ids,buff:buff||null}),charScore:id=>charScore(id),recommend:()=>recommendTeams(),syn:id=>synOf(id),teamSyn:ids=>teamSynergy({slots:ids,buff:null}),sim:()=>simulate(state.teams),order:()=>bestOrder().map(t=>t.slots.join("/")),chars:()=>chars.map(c=>c.id),sorted:m=>sortChars(chars.slice(),m).map(c=>c.id),statF:id=>statFactor(id),weapon:id=>{const w=weaponOf(id);return {id:w.w&&w.w.id,pct:w.pct}}};

/* ---------- profile dialog ---------- */
let profId=null;
function openProfile(id){if(profId!==id){pfTabSel=null;echoSel=null;echoEdit=null}profId=id;renderProfile();const d=$("#prof");if(!d.open)d.showModal();}
function setGrowth(id,patch){appMediator.characters.patchGrowth(id,patch);persist();renderProfile();renderRoster();rerenderPlan();}
function renderProfile(){
  const id=profId,c=charMap[id];if(!c)return;const g=state.growth[id]||{};const wp=weaponOf(id);const lv=g.lv??90,ch=+g.chain||0;
  const t=charWType(id);const l=perfList(id);const pmap=Object.fromEntries(l.map(x=>[x.id,x]));const top=l[0];
  const ws=Object.values(WMAP).filter(w=>w.type===t&&w.q>=3).sort((a,b)=>((pmap[b.id]||{}).p||0)-((pmap[a.id]||{}).p||0)||b.q-a.q||a.id-b.id);
  const ROLE={dps:"메인 딜러",sub:"서브 딜러",support:"서포터"};
  $("#prof").innerHTML=`<form method="dialog" class="pf">
   <div class="pf-l"><div class="face${cardUrl(id)?" pic":""}${gameImg.card.has(id)?" tall":""}" style="--ec:var(--${c.el})${cardUrl(id)?`;--pic:url('${cardUrl(id)}')`:""}"><span class="elb">${UIIcon.element(c.el)}</span></div></div>
   <div class="pf-r">
    <div class="pf-h"><h3>${esc(c.name)}</h3><span class="chip el" style="--ec:var(--${c.el})">${EL[c.el]}</span><span class="chip">${c.rar}★</span><span class="chip">${ROLE[c.role]||""}</span><span class="chip">${WTYPE[t]||""}</span>
      <button class="x" value="close" aria-label="닫기">✕</button></div>
    <div class="pf-toggles"><label class="pf-own"><input type="checkbox" class="sw" id="pfOwn" ${state.owned[id]?"checked":""}> 보유</label>
    <label class="pf-own" title="육성하지 않은 공명자는 매트릭스에서 게임이 주는 체험 세팅으로 씁니다"><input type="checkbox" class="sw" id="pfTrial" ${g.trial?"checked":""}> 체험 세팅 (육성 안 함)</label>
    <span class="pf-own" style="margin-left:auto" title="${c.role==="support"?"기준 세팅(지원 기준 충족 · 0체인 · 추천 무기)으로 주는 버프 = 100":"이잘키 기준 스탯의 피해 기대값 = 100"}">${scoreName(id)} <b id="pfScore" style="color:#e6c36a;font-family:var(--f-num);margin-left:4px">${charScore(id).toFixed(1)}</b><small id="pfScoreTag" class="pf-stag">${scoreTag(id)}</small></span></div>
    <p class="pf-trial" id="pfNoEcho" ${noEchoInput(id)?"":"hidden"}>에코를 입력하지 않아 <b>체험 세팅(공식 가이드 추천 스탯)</b>으로 계산합니다. 에코를 입력하면 더 정확해집니다.</p>
    ${g.trial?`<p class="pf-trial">매트릭스 체험 세팅으로 계산합니다: <b>90레벨 · ${wp.w?esc(wp.w.name):"상시 무기"} R1 · 공식 가이드 추천 스탯</b>${trialChainNote(id)}. 계산 기준 탭에서 자세히 볼 수 있습니다.</p>`:""}
    <div class="pf-row2">
     <div class="${g.trial?"pf-hide":""}"><div class="pf-sec"><span>레벨</span><b>Lv.${lv}</b></div>
      <div class="pf-lv"><input type="range" min="1" max="90" value="${lv}" id="pfLv" aria-label="레벨"><input type="number" min="1" max="90" value="${lv}" id="pfLvN" aria-label="레벨 숫자"></div></div>
     <div><div class="pf-sec"><span>공명 체인 (돌파)</span><b>${ch}돌파 · DPS ${Math.round(chainMul(id)*100)}%</b></div>
      <div class="seg" id="pfCh">${[0,1,2,3,4,5,6].map(n=>`<button type="button" data-v="${n}" aria-pressed="${ch===n}">${n}</button>`).join("")}</div></div>
    </div>
    <div class="${g.trial?"pf-hide":""}">
    <div class="pf-sec"><span>무기</span><b>${wp.w?esc(wp.w.name):"없음"}${wp.pct!=null?` · ${c.role==="support"&&perfList(id).length===1?"추천 기준":"성능"} ${wp.pct.toFixed(1)}%`:""}</b></div>
    <div class="wgrid" id="pfW">${ws.map(w=>{const e=pmap[w.id];const sel=wp.w&&wp.w.id===w.id;
      return `<button type="button" class="wt q${w.q}" data-w="${w.id}" aria-pressed="${sel}" title="${esc(w.name)}${e?` · ${c.role==="support"&&perfList(id).length===1?"추천 기준 ":""}${e.p.toFixed(1)}% (R${e.r} 기준)`:" · 성능 데이터 없음"}">
        <span class="wi">${UIIcon.weapon(weaponIcon(w))}</span>
        <span class="wn">${esc(w.name)}</span><span class="wp">${e?e.p.toFixed(0)+"%":"–"}</span>${top&&top.id===w.id?`<span class="wbest">추천</span>`:""}</button>`}).join("")}</div>
    <div class="seg" id="pfR" style="max-width:420px">${[1,2,3,4,5].map(n=>`<button type="button" data-v="${n}" aria-pressed="${wp.ref===n}">R${n}</button>`).join("")}</div>
    </div>
   </div>
   <div class="pf-s${g.trial?" pf-dim":""}">${statsHTML(id)}<input type="file" accept="image/*" id="pfEFile" multiple hidden></div>
   </form>`;
}
/* ---------- render: cycle/data ---------- */
function unknownConds(){return [...new Set((cycle.buffs||[]).flatMap(b=>(b.effects||[]).map(e=>e.cond)).concat((cycle.bosses||[]).flatMap(b=>(b.effects||[]).flatMap(f=>f.tags||[]))).filter(k=>k&&!COND[k]&&!['dodge','any'].includes(k)))]}
function renderCycleView(){
  $("#cycleView").innerHTML=`<dl class="kv"><dt>주기</dt><dd>${esc(cycle.name||"")}</dd><dt>기간</dt><dd>${esc(cycle.period||"")}</dd><dt>보스</dt><dd>${(cycle.bosses||[]).length}종</dd><dt>강화 효과</dt><dd>${(cycle.buffs||[]).map(b=>esc(b.name)).join(", ")}</dd><dt>상태</dt><dd>${IS_ADMIN&&state.cycle?"이 브라우저에서 수정한 값 사용 중":"cycle.js 기본값 사용 중"}</dd></dl>
  <p class="prose">필드 설명은 <code>data/cycle.js</code> 맨 위 주석에 있습니다. 강화 효과의 <b>cond</b>와 보스 효과의 <b>tags</b>에 쓸 수 있는 조건 키: ${Object.entries(COND).map(([k,d])=>`<code>${k}</code>(${esc(d.label)})`).join(", ")}</p>
  ${unknownConds().length?`<p class="prose" style="color:var(--bad)">알 수 없는 조건 키: ${unknownConds().map(esc).join(", ")} — data/conds.js에 추가하거나 키를 고치세요. 이 효과는 강도 계산에서 빠집니다.</p>`:""}
  ${cycle.source?`<p class="prose">출처: ${esc(cycle.source)}</p>`:""}`;
  $("#cycleJson").value=JSON.stringify(cycle,null,2);
}
function renderCharJson(){ $("#charJson").value="[\n"+chars.map(c=>"  "+JSON.stringify(c)).join(",\n")+"\n]"; }
function refreshExport(){ const b=$("#exportBox"); if(b) b.value=JSON.stringify(state); }
function renderStoreInfo(){
  $("#storeInfo").innerHTML=`<dt>저장 위치</dt><dd>${"이 브라우저"}</dd><dt>보유 공명자</dt><dd>${chars.filter(c=>state.owned[c.id]).length} / ${chars.length}</dd><dt>파티 수</dt><dd>${state.teams.length}</dd>`;
}
/* ---------- 매트릭스 남은 시간 ---------- */
function cycleEnd(){if(cycle.endsAt){const d=new Date(cycle.endsAt);if(!isNaN(d))return d}
  const m=String(cycle.period||"").match(/(\d{4}-\d{2}-\d{2})\s*$/);return m?new Date(m[1]+"T04:00:00+08:00"):null}
function renderLeft(){const el=$("#cycleLeft");if(!el)return;const e=cycleEnd();if(!e){el.textContent="";return}
  const ms=e-Date.now();if(ms<=0){el.textContent="종료됨 · 다음 주기 대기";el.className="left end";return}
  const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),mi=Math.floor(ms%36e5/6e4);
  el.textContent=`종료까지 ${d?d+"일 ":""}${h}시간${d?"":` ${mi}분`}`;el.className="left"+(ms<864e5?" soon":"");el.title=`종료: ${e.toLocaleString("ko-KR")}`}
setInterval(renderLeft,60000);

/* ---------- 육성 투자 효율 ---------- */
const PULLS={char:95,weapon:70}; // 기대 연차 수 (추정): 한정 캐릭터 1명(50:50 포함), 픽업 무기 1개
function totalNow(){return simulate(state.teams).total||0}
function withGrowth(id,patch,fn){const had=Object.prototype.hasOwnProperty.call(state.growth,id);const old=state.growth[id];
  state.growth[id]=Object.assign({},old||{},patch);try{return fn()}finally{if(had)state.growth[id]=old;else delete state.growth[id]}}
function investCandidates(id){const c=charMap[id];if(!c)return [];const g=state.growth[id]||{};const out=[];const ch=+g.chain||0;
  if(c.rar===5&&ch<6)out.push({label:`공명 체인 ${ch}돌파 → ${ch+1}돌파`,patch:{chain:ch+1},cost:PULLS.char});
  const wp=weaponOf(id);const top=perfList(id)[0];
  if(top&&WMAP[top.id].q===5&&(!wp.w||wp.w.id!==top.id))out.push({label:`무기 ${WMAP[top.id].name} (R1)`,patch:{wid:top.id,wr:5,ref:1},cost:PULLS.weapon,wid:top.id});
  else if(wp.w&&wp.w.q===5&&wp.ref<5)out.push({label:`${wp.w.name} 재련 R${wp.ref} → R${wp.ref+1}`,patch:{ref:wp.ref+1},cost:PULLS.weapon,wid:wp.w.id});
  return out;}
function renderInvest(){const body=$("#invBody");if(!body)return;
  const scope=$("#invScope").value;const inTeam=new Set(state.teams.flatMap(t=>t.slots.filter(Boolean)));
  const ids=(scope==="team"?[...inTeam]:chars.filter(c=>state.owned[c.id]).map(c=>c.id)).filter(id=>charMap[id]);
  const base=totalNow();const rows=[];
  ids.forEach(id=>{const cs=charScore(id);investCandidates(id).forEach(k=>{
    const r=withGrowth(id,k.patch,()=>({tot:inTeam.has(id)?totalNow():base,cs:charScore(id)}));
    const dT=r.tot-base,dC=cs?(r.cs/cs-1)*100:0;rows.push({id,k,dT,dC,eff:inTeam.has(id)?dT/k.cost*10:null,effC:dC/k.cost*10,inTeam:inTeam.has(id)});});});
  invRows=rows;drawInvest();}
// 정렬: 예상 총점 변화(dT) · 개인 점수(dC) · 10연차당(eff). 편성 밖 공명자는 총점 기준 정렬에서 항상 뒤로
let invRows=[];const invSort={k:"eff",dir:-1};
function drawInvest(){const body=$("#invBody");const base=totalNow();const rows=invRows.slice();const {k,dir}=invSort;
  const val=r=>k==="dT"?(r.inTeam?r.dT:null):k==="dC"?r.dC:(r.eff!=null?r.eff:null);
  rows.sort((a,b)=>{const va=val(a),vb=val(b);if(va==null&&vb==null)return b.effC-a.effC;if(va==null)return 1;if(vb==null)return -1;return dir<0?vb-va:va-vb;});
  document.querySelectorAll(".thsort").forEach(b=>{const on=b.dataset.k===k;b.classList.toggle("on",on);b.querySelector("i").textContent=on?(dir<0?" ▼":" ▲"):" ↕";b.setAttribute("aria-sort",on?(dir<0?"descending":"ascending"):"none")});
  const scope=$("#invScope").value;
  body.innerHTML=rows.map((r,i)=>{const c=charMap[r.id];const w=r.k.wid&&WMAP[r.k.wid];
    return `<tr><td class="score">${i+1}</td><td><span class="nmc"><span class="pt"><span class="th" ${hasPic(r.id)?`style="background-image:url('${picUrl(r.id)}')"`:""}></span></span>${esc(c.name)}</span></td>
    <td>${w?UIIcon.weapon(weaponIcon(w),{className:"wmini"}):""}${esc(r.k.label)}</td>
    <td class="score">${r.inTeam?`<b class="${r.dT>0?"up":""}">${r.dT>=0?"+":""}${Math.round(r.dT).toLocaleString()}점</b> <small>(${base?((r.dT/base)*100).toFixed(1):0}%)</small>`:`<span class="mut">편성 밖</span>`}</td>
    <td class="score">+${r.dC.toFixed(1)}%</td><td class="score">≈ ${r.k.cost}연차</td>
    <td class="score">${r.eff!=null?`<b>+${Math.round(r.eff).toLocaleString()}점</b>`:`+${r.effC.toFixed(1)}%`}</td></tr>`}).join("")||`<tr><td colspan="7" class="mut">${scope==="team"?"편성된 공명자가 없습니다. 배치 화면에서 파티를 먼저 짜 주세요.":"보유 공명자가 없습니다."}</td></tr>`;}

/* ---------- 주기별 기록 ---------- */
function snapRecord(){const sim=simCache||simulate(state.teams);
  return {cycle:cycle.name||"",period:cycle.period||"",savedAt:new Date().toISOString(),
    teams:state.teams.map((t,i)=>({slots:t.slots.slice(),buff:t.buff,pred:Math.round((sim.res[i]||{}).pts||0)})).filter(t=>t.slots.some(Boolean)),
    total:Math.round(sim.total||0),actual:{}};}
function archiveIfCycleChanged(){if(state.cur&&state.cur.cycle&&state.cur.cycle!==cycle.name&&state.cur.teams&&state.cur.teams.length){
  state.records.unshift(Object.assign({},state.cur,{auto:true}));}
  const keep=state.cur&&state.cur.cycle===cycle.name?state.cur.actual:{};state.cur=Object.assign(snapRecord(),{actual:keep||{}});}
function recCard(r,idx){const ks=Object.keys(r.actual||{});const sum=ks.reduce((a,k)=>a+(+r.actual[k]||0),0);const has=ks.length;const predIn=ks.reduce((a,k)=>a+((r.teams[k]||{}).pred||0),0);
  return `<div class="panel rec"><div class="ph">${esc(r.cycle)}${idx==null?` <span class="chip g">진행 중</span>`:r.auto?` <span class="chip">자동 기록</span>`:` <span class="chip">직접 저장</span>`}<span class="sp period">${esc(r.period||"")} · ${new Date(r.savedAt).toLocaleDateString("ko-KR")}</span>${idx!=null?`<button class="btn ghost danger rdel" data-del="${idx}">삭제</button>`:""}</div>
   <table class="rt"><thead><tr><th>파티</th><th>공명자</th><th>예상</th><th>실제 점수</th></tr></thead><tbody>
   ${r.teams.map((t,i)=>`<tr><td class="score">${String(i+1).padStart(2,"0")}</td><td><span class="rmem">${t.slots.map(id=>id&&charMap[id]?`<span class="pt"><span class="th" title="${esc(charMap[id].name)}" ${hasPic(id)?`style="background-image:url('${picUrl(id)}')"`:""}></span></span>`:"").join("")}<span class="mut">${t.slots.filter(Boolean).map(id=>charMap[id]?esc(charMap[id].name):"").join(" · ")}</span></span></td>
     <td class="score">${t.pred.toLocaleString()}</td><td><input type="number" min="0" step="1" class="ract" data-rec="${idx==null?"cur":idx}" data-i="${i}" value="${(r.actual||{})[i]??""}" placeholder="–"></td></tr>`).join("")}
   </tbody><tfoot><tr><td colspan="2"><b>합계</b></td><td class="score"><b>${(r.total||0).toLocaleString()}</b></td><td class="score"><b>${has?sum.toLocaleString():"–"}</b>${has&&predIn?` <small class="${sum>=predIn?"up":"down"}" title="실제 점수를 입력한 파티의 예상 합(${predIn.toLocaleString()}) 대비">(예상 대비 ${sum>=predIn?"+":""}${((sum/predIn-1)*100).toFixed(1)}%)</small>`:""}</td></tr></tfoot></table></div>`;}
function renderRecords(){const el=$("#recList");if(!el)return;if(state.cur&&state.cur.cycle===cycle.name){const a=state.cur.actual;state.cur=Object.assign(snapRecord(),{actual:a||{}})}
  el.innerHTML=(state.cur?recCard(state.cur,null):"")+state.records.map((r,i)=>recCard(r,i)).join("")||`<p class="hint">기록이 없습니다.</p>`;}

/* ---------- 업데이트 노트 (updates.js) ---------- */
function renderUpdates(){const el=$("#updList");if(!el)return;const U=window.UPDATES||[];
  // 버전마다 접었다 펼 수 있는 카드, 2열 배치. 가장 최신만 펼친 상태로 시작
  el.innerHTML=U.map((u,i)=>`<details class="panel upd-a"${i===0?" open":""}><summary><div class="ph">${u.ver?`<span class="upd-v">v${esc(u.ver)}</span>`:""}<span class="upd-d">${esc(u.date)}</span>${i===0?`<span class="chip syn star">NEW</span>`:""}<span class="upd-t">${esc(u.title||"")}</span><span class="upd-n">${(u.items||[]).length}건</span></div></summary>
   <ul class="upd-l">${(u.items||[]).map(it=>Array.isArray(it)?`<li>${esc(it[0])}${it.length>1?`<ul>${it.slice(1).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</li>`:`<li>${esc(it)}</li>`).join("")}</ul></details>`).join("");
  const nx=$("#updNext"),N=window.UPCOMING||[];
  if(nx)nx.innerHTML=N.length?`<section class="panel upd-next"><div class="ph"><span class="upd-v">예정</span><span class="upd-t">업데이트 예정</span><span class="upd-n">준비 중인 기능이며 내용은 바뀔 수 있습니다</span></div><div class="upd-g">${N.map(n=>`<div><div class="upd-t" style="margin-top:10px">${esc(n.title)}</div><ul class="upd-l">${(n.items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div></section>`:"";
  // 최신 업데이트를 아직 안 봤으면 탭에 점 표시
  const latest=(U[0]||{}).ver||(U[0]||{}).date;let seen=null;try{seen=localStorage.getItem("mp-upd-seen")}catch(e){}
  const tab=$("#updTab");if(tab)tab.classList.toggle("dot",!!latest&&seen!==latest&&location.hash!=="#updates");
  if(location.hash==="#updates"&&latest){try{localStorage.setItem("mp-upd-seen",latest)}catch(e){}}}
window.addEventListener("hashchange",()=>{if(location.hash==="#updates")renderUpdates()});

function renderAll(){renderFilter();renderPool();renderTeams();renderIntel();renderRoster();renderCycleView();renderCharJson();renderStoreInfo();refreshExport();renderLeft();renderInvest();renderRecords();renderUpdates()}
function rerenderPlan(){renderPool();renderTeams();renderStoreInfo()}

