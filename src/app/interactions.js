"use strict";
/* ---------- placement logic ---------- */
function place(id,ti,si,from){
  const t=state.teams[ti]; if(!t||!charMap[id]) return;
  if(from){ // move/swap between slots
    const src=state.teams[from.team];
    const prev=t.slots[si];
    t.slots[si]=id; src.slots[from.slot]=prev||null;
    if(from.team===ti&&from.slot===si) return;
  }else{
    if(vigorOf(id)-usedCount(id)<=0 && !sameChar(t.slots[si],id)) return flash(id.startsWith("rover_")?"방랑자는 속성과 관계없이 한 명만 편성할 수 있습니다.":"배치 횟수를 모두 사용했습니다.");
    t.slots[si]=id;
  }
  if(t.slots.filter(x=>x===id).length>1){ // same character twice in one party is not allowed
    if(from){const src=state.teams[from.team];src.slots[from.slot]=id;t.slots[si]=null}
    else t.slots[si]=null;
    flash("같은 파티에 같은 공명자는 넣을 수 없습니다.");
  }
  t.example=false; persist(); rerenderPlan();
}
function unplace(ti,si){const t=state.teams[ti];if(!t)return;t.slots[si]=null;t.example=false;persist();rerenderPlan()}
let flashT=null;
function flash(msg){setSave("busy",msg);clearTimeout(flashT);flashT=setTimeout(()=>setSave("ok",storeMode==="account"?"내 계정에 저장됨":"이 브라우저에 저장됨"),1800)}

/* ---------- events ---------- */
/* 드래그 편성: 브라우저 기본 드래그(HTML5 DnD) 대신 포인터 이벤트로 직접 처리한다.
   (드래그 관련 브라우저 확장이 기본 드래그 이벤트를 가로채면 🚫 표시만 뜨고 놓을 수 없던 문제)
   · 마우스·펜만 해당. 터치는 기존대로 탭해서 넣기 / 길게 눌러 빼기(스크롤과 안 겹치게).
   · 누른 뒤 5px 이상 움직이면 드래그 시작, 그 전에 떼면 평소 클릭(첫 빈 칸에 넣기)으로 처리.
   · 움직임 처리는 프레임당 한 번(requestAnimationFrame), 리스너는 누르고 있는 동안에만 붙인다. */
let dragData=null,overSlot=null,overPool=false;
/* 놓을 칸 찾기: 칸 위가 아니어도(칸 사이 틈, 파티 카드 여백 등) 같은 파티 카드 안이면 가로 위치가 가장 가까운 칸으로 본다. */
function slotAt(e){const t=e.target;if(!t||!t.closest)return null;const s=t.closest(".slot");if(s)return s;
  const card=t.closest(".team");if(!card)return null;const ss=[...card.querySelectorAll(".slot")];if(!ss.length)return null;
  return ss.map(x=>{const r=x.getBoundingClientRect();return [x,Math.abs(e.clientX-(r.left+r.width/2))]}).sort((a,b)=>a[1]-b[1])[0][0]}
function setOver(sl){if(overSlot===sl)return;if(overSlot)overSlot.classList.remove("over");overSlot=sl||null;if(overSlot)overSlot.classList.add("over")}
const DRAG_PX=5;let press=null,ghost=null,rafId=0,lastPt=null,suppressClick=false;
function dragTargetAt(x,y){if(ghost)ghost.style.visibility="hidden";const el=document.elementFromPoint(x,y);if(ghost)ghost.style.visibility="";
  return {el,sl:el?slotAt({target:el,clientX:x}):null,pool:!!(el&&el.closest&&el.closest("#pool"))}}
function dragFrame(){rafId=0;if(!dragData||!lastPt)return;const {x,y}=lastPt;
  ghost.style.transform=`translate3d(${x-press.ox}px,${y-press.oy}px,0)`;
  const t=dragTargetAt(x,y);setOver(t.sl);const op=dragData.src==="slot"&&t.pool&&!t.sl;if(op!==overPool){overPool=op;$("#pool").classList.toggle("over",op)}}
function startDrag(){const tk=press.tk;
  dragData={id:tk.dataset.id,src:tk.dataset.src,team:+tk.dataset.team,slot:+tk.dataset.slot};
  tip.classList.remove("on");tipFor=null;if(selected)setPick(null);
  const r=tk.getBoundingClientRect();ghost=tk.cloneNode(true);ghost.classList.add("dnd-ghost");ghost.removeAttribute("data-id");
  ghost.style.width=r.width+"px";ghost.style.height=r.height+"px";document.body.appendChild(ghost);
  tk.classList.add("dragging");document.body.classList.add("dnd");try{getSelection().removeAllRanges()}catch(_){}}
function endDrag(drop){
  if(rafId){cancelAnimationFrame(rafId);rafId=0}
  const d=dragData;let t=null;if(drop&&d&&lastPt)t=dragTargetAt(lastPt.x,lastPt.y);
  setOver(null);if(overPool){overPool=false;$("#pool").classList.remove("over")}
  if(ghost){ghost.remove();ghost=null}document.querySelectorAll(".tok.dragging").forEach(n=>n.classList.remove("dragging"));document.body.classList.remove("dnd");
  dragData=null;
  if(t&&d){if(t.sl)place(d.id,+t.sl.dataset.team,+t.sl.dataset.slot,d.src==="slot"?{team:d.team,slot:d.slot}:null);
    else if(d.src==="slot"&&t.pool)unplace(d.team,d.slot);}
}
function onPMove(e){if(!press||e.pointerId!==press.id)return;lastPt={x:e.clientX,y:e.clientY};
  if(!dragData){if(Math.hypot(e.clientX-press.x,e.clientY-press.y)<DRAG_PX)return;startDrag()}
  if(!rafId)rafId=requestAnimationFrame(dragFrame)}
function onPUp(e){if(!press||e.pointerId!==press.id)return;const was=!!dragData;
  if(was){lastPt={x:e.clientX,y:e.clientY};endDrag(e.type==="pointerup");suppressClick=true;setTimeout(()=>{suppressClick=false},0)}
  press=null;removeEventListener("pointermove",onPMove);removeEventListener("pointerup",onPUp);removeEventListener("pointercancel",onPUp)}
document.addEventListener("pointerdown",e=>{
  if(e.pointerType==="touch"||e.button!==0||press)return;
  const tk=e.target.closest&&e.target.closest(".tok[data-drag='1']");if(!tk)return;
  e.preventDefault(); // 글자 선택·이미지 기본 드래그 방지
  const r=tk.getBoundingClientRect();press={id:e.pointerId,tk,x:e.clientX,y:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top};lastPt=null;
  addEventListener("pointermove",onPMove,{passive:true});addEventListener("pointerup",onPUp);addEventListener("pointercancel",onPUp)});
// 드래그를 끝낸 직후 따라오는 클릭(첫 빈 칸에 넣기 등)은 무시
document.addEventListener("click",e=>{if(suppressClick){e.stopPropagation();e.preventDefault();suppressClick=false}},true);
addEventListener("keydown",e=>{if(e.key==="Escape"&&dragData){endDrag(false);press=null}});
addEventListener("blur",()=>{if(dragData){endDrag(false);press=null}});
document.addEventListener("dragstart",e=>{if(e.target.closest&&e.target.closest(".tok"))e.preventDefault()}); // 남은 기본 드래그 차단
/* 우클릭 동작은 마우스 오른쪽 버튼 누름(pointerdown, button 2)에서 바로 처리한다.
   '우클릭 허용' 확장 프로그램들은 contextmenu 이벤트를 가로채서(사이트 처리 무력화) 우클릭 기능이 안 먹는 경우가 있다.
   contextmenu는 메뉴를 막는 용도로만 쓰고, 터치 길게 누르기 등 포인터 우클릭이 없을 때만 대신 처리한다. */
const RIGHT_ACTS=[]; // [선택자, 처리 함수(요소)]
function rightAct(target){for(const [sel,fn] of RIGHT_ACTS){const el=target&&target.closest&&target.closest(sel);if(el){fn(el);return true}}return false}
let lastRightAt=0;
document.addEventListener("pointerdown",e=>{if(e.button!==2||e.pointerType==="touch")return;if(rightAct(e.target)){lastRightAt=Date.now()}});
// 배치·보유 캐릭터 화면에서는 우클릭 기능이 없는 곳에서도 브라우저 메뉴를 띄우지 않는다(입력칸·글 선택 중일 때는 그대로)
const NO_MENU="#v-plan,#v-roster,#prof";
document.addEventListener("contextmenu",e=>{const t=e.target;const hit=RIGHT_ACTS.some(([sel])=>t.closest&&t.closest(sel));
  if(!hit){if(t.closest&&t.closest(NO_MENU)&&!t.closest("input,textarea,select,[contenteditable]")&&!String(getSelection&&getSelection()).trim())e.preventDefault();return}
  e.preventDefault();if(Date.now()-lastRightAt>700)rightAct(e.target)});
RIGHT_ACTS.push([".slot .tok",tk=>unplace(+tk.dataset.team,+tk.dataset.slot)]);
/* 보유 공명자 우클릭 → 칸 고르기: 우클릭한 공명자를 집어 든 상태가 되고, 원하는 칸(빈 칸·찬 칸 모두)을 누르면 거기에 넣는다.
   찬 칸이면 원래 있던 공명자와 바뀐다. 같은 공명자를 다시 우클릭하거나 Esc·빈 곳 클릭이면 취소. */
function pickHover(e){setOver(slotAt(e))}
function setPick(id){selected=id;tip.classList.remove("on");tipFor=null;document.body.classList.toggle("picking",!!id);renderPool();
  if(id)document.addEventListener("mouseover",pickHover);else{document.removeEventListener("mouseover",pickHover);setOver(null)}
  if(id)flash(`${charMap[id].name}: 넣을 칸을 누르세요 (Esc 취소)`)}
RIGHT_ACTS.push(["#pool .tok[data-src=pool]",tk=>{
  if(tk.classList.contains("used"))return flash(tk.dataset.id.startsWith("rover_")?"방랑자는 속성과 관계없이 한 명만 편성할 수 있습니다.":"배치 횟수를 모두 사용했습니다.");
  setPick(selected===tk.dataset.id?null:tk.dataset.id)}]);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&selected)setPick(null)});
document.addEventListener("click",e=>{if(selected&&!(e.target.closest&&(e.target.closest("#teams")||e.target.closest("#pool"))))setPick(null)});
// long press to remove (touch)
let lp=null;
document.addEventListener("touchstart",e=>{const tk=e.target.closest&&e.target.closest(".slot .tok");if(!tk)return;lp=setTimeout(()=>{unplace(+tk.dataset.team,+tk.dataset.slot);lp=null},550)},{passive:true});
["touchend","touchmove","touchcancel"].forEach(ev=>document.addEventListener(ev,()=>{clearTimeout(lp)},{passive:true}));
// tap-to-place
document.getElementById("pool").addEventListener("click",e=>{
  const tk=e.target.closest(".tok"); if(!tk||tk.classList.contains("used")) return;
  if(selected){setPick(null);return}
  quickPlace(tk.dataset.id);
});
// 초상화를 누르면 위에서부터 첫 번째 빈 칸(같은 공명자가 없는 파티)에 넣는다. 빈 칸이 없으면 파티를 하나 추가한다.
function quickPlace(id){
  if(vigorOf(id)-usedCount(id)<=0) return flash(id.startsWith("rover_")?"방랑자는 속성과 관계없이 한 명만 편성할 수 있습니다.":"배치 횟수를 모두 사용했습니다.");
  let ti=state.teams.findIndex(t=>!t.slots.includes(id)&&t.slots.some(x=>!x));
  if(ti<0){state.teams.push({slots:[null,null,null],buff:null});ti=state.teams.length-1}
  const si=state.teams[ti].slots.findIndex(x=>!x);
  place(id,ti,si,null);
  const el=document.querySelector(`.slot[data-team="${ti}"][data-slot="${si}"]`);
  if(el){el.classList.add("just");el.scrollIntoView({block:"nearest",behavior:"smooth"});setTimeout(()=>el.classList.remove("just"),700)}
}
document.getElementById("pool").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("tok")){e.preventDefault();e.target.click()}});
document.getElementById("teams").addEventListener("click",e=>{
  const b=e.target.closest("button[data-act]");
  if(b){const i=+b.dataset.team;const T=state.teams;
    if(b.dataset.act==="up"&&i>0)[T[i-1],T[i]]=[T[i],T[i-1]];
    if(b.dataset.act==="down"&&i<T.length-1)[T[i+1],T[i]]=[T[i],T[i+1]];
    if(b.dataset.act==="del")T.splice(i,1);
    persist();rerenderPlan();return}
  if(selected){const s=slotAt(e);if(!s){setPick(null);return}const id=selected;selected=null;document.body.classList.remove("picking");document.removeEventListener("mouseover",pickHover);setOver(null);
    place(id,+s.dataset.team,+s.dataset.slot,null);
    const el=document.querySelector(`.slot[data-team="${s.dataset.team}"][data-slot="${s.dataset.slot}"]`);if(el){el.classList.add("just");setTimeout(()=>el.classList.remove("just"),700)}}
});
document.getElementById("teams").addEventListener("change",e=>{const sel=e.target.closest("select[data-buff]");if(!sel)return;state.teams[+sel.dataset.buff].buff=sel.value||null;persist();renderTeams()});
$("#q").addEventListener("input",e=>{ui.q=e.target.value;renderPool()});
$("#elFilter").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;ui.el=b.dataset.el||null;renderFilter();renderPool()});
$("#poolSort").addEventListener("change",e=>{state.poolSort=e.target.value;persist();renderPool()});
$("#rosterSort").addEventListener("change",e=>{state.rosterSort=e.target.value;persist();renderRoster()});
document.querySelector(".rview").addEventListener("click",e=>{const b=e.target.closest("[data-rview]");if(!b)return;state.rosterView=b.dataset.rview;persist();renderRoster()});
$("#invScope").addEventListener("change",renderInvest);
document.querySelector("table.inv thead").addEventListener("click",e=>{const b=e.target.closest(".thsort");if(!b)return;
  if(invSort.k===b.dataset.k)invSort.dir*=-1;else{invSort.k=b.dataset.k;invSort.dir=-1}drawInvest();});
window.addEventListener("hashchange",()=>{const h=location.hash;if(h==="#invest")renderInvest();if(h==="#records")renderRecords();});
$("#recSave").addEventListener("click",()=>{state.records.unshift(snapRecord());persist();renderRecords();flash("지금 편성을 기록했습니다.")});
$("#recList").addEventListener("click",e=>{const b=e.target.closest("[data-del]");if(!b)return;state.records.splice(+b.dataset.del,1);persist();renderRecords()});
$("#recList").addEventListener("change",e=>{const x=e.target.closest(".ract");if(!x)return;const r=x.dataset.rec==="cur"?state.cur:state.records[+x.dataset.rec];if(!r)return;r.actual=r.actual||{};
  if(x.value==="")delete r.actual[x.dataset.i];else r.actual[x.dataset.i]=Math.max(0,Math.round(+x.value));persist();setTimeout(renderRecords,0)});
$("#skillSel").addEventListener("change",e=>{state.skill=e.target.value;persist();renderTeams()});
$("#btnAdd").addEventListener("click",()=>{state.teams.push({slots:[null,null,null],buff:null});persist();renderTeams()});
let clearArm=false;
$("#btnClear").addEventListener("click",e=>{
  if(!clearArm){clearArm=true;e.target.textContent="한 번 더 누르면 비웁니다";setTimeout(()=>{clearArm=false;e.target.textContent="전체 비우기"},2500);return}
  clearArm=false;e.target.textContent="전체 비우기";
  state.teams.forEach(t=>{t.slots=[null,null,null];t.buff=null;t.example=false});persist();rerenderPlan();
});
/* ---------- 파티 자동 추천 (조합 데이터: teams.js) ----------
   1) 최우선 조합(TEAM_PRESETS)을 그대로 묶는다. (히유키·루실라·수수, 여우의 별자리·쇄명·릴리, 장리·브렌트·루파 …)
   2) 정석 메인+서브 짝(공명자 파일 pairs 궁합 1)을 예상 점수보다 먼저 묶는다.
   3) 남은 메인 딜러는 궁합 또는 반주 이득이 있는 파트너가 있을 때만 짝을 짓는다. 메인 딜러를 모두 쓰려고 하지 않는다.
   4) 센 짝부터 서포터를 넣는다: 궁합 표의 서포터 → 5성 → 4성. 서포터가 남으면 안 쓴 메인 딜러로 파티를 더 만든다.
   5) 3명을 못 채운 파티는 빼고, 파티끼리 서포터를 맞바꿔 전체(강화 효과 포함)가 세지면 바꾼 뒤, 강화 효과·순서를 정한 뒤 예상 점수가 MIN_POINTS(1000점) 미만인 파티는 뺀다. 방랑자는 속성과 관계없이 1명. */
const recommendationService=new window.MP.RecommendationService({state:calculationContext.state,chars:calculationContext.chars,
  charMap:calculationContext.charMap,cycle:calculationContext.cycle,charDb:CharDB,characters:characterCalculator,teams:teamCalculator,vigorOf,bestBuffs});
const TEAM_PRESETS=recommendationService.presets,MIN_POINTS=recommendationService.minPoints;
const affinity=(main,ids)=>recommendationService.affinity(main,ids),recommendTeams=()=>recommendationService.recommend();
/* 자동 추천 미리보기: 처음 누를 때의 편성을 스냅샷으로 저장하고, 적용을 누르기 전까지는 저장소에 스냅샷 편성을 그대로 둔다.
   여러 번 눌러도 스냅샷은 첫 번째 그대로 → 되돌리기는 항상 자동 추천을 처음 누르기 전으로 돌아간다. */
let undoTeams=null;
const recPending=()=>undoTeams!=null;
function setRecBar(){$("#recBar").hidden=!recPending()}
$("#btnAuto").addEventListener("click",()=>{
  const ok=chars.filter(c=>state.owned[c.id]).length;if(ok<3){flash("보유 캐릭터 탭에서 가진 공명자를 먼저 체크하세요.");return}
  const t0=performance.now();const teams=recommendTeams();
  if(!teams.length){flash("추천할 수 있는 파티가 없습니다.");return}
  if(!recPending())undoTeams=JSON.parse(JSON.stringify(state.teams));
  state.teams=teams;state.teams=bestOrder();
  // 예상 점수가 MIN_POINTS 미만인 파티는 빼고 다시 정렬 (뺀 만큼 뒤 파티 점수가 달라지므로 두어 번 반복)
  let cut=0;for(let k=0;k<3;k++){const r=simulate(state.teams);const keep=state.teams.filter((t,i)=>r.res[i].pts>=MIN_POINTS);if(keep.length===state.teams.length)break;cut+=state.teams.length-keep.length;state.teams=keep;state.teams=bestOrder()}
  rerenderPlan();setRecBar();
  flash(`파티 ${state.teams.length}개를 추천했습니다${cut?` (예상 ${MIN_POINTS}점 미만 ${cut}개 제외)`:""} — 적용을 눌러야 저장됩니다`);
  console.log("recommend ms",Math.round(performance.now()-t0));
});
$("#btnApply").addEventListener("click",()=>{if(!recPending())return;undoTeams=null;setRecBar();persist();rerenderPlan();flash("추천 편성을 적용했습니다.")});
$("#btnUndo").addEventListener("click",()=>{if(!recPending())return;state.teams=undoTeams;undoTeams=null;setRecBar();persist();rerenderPlan();flash("자동 추천 전으로 되돌렸습니다.")});
$("#btnSort").addEventListener("click",()=>{
  // 보스 진행을 시뮬레이션해 가장 멀리 가는 순서를 고른다 (메인 딜러 저항 보스는 피하고, 비슷하면 약한 파티를 앞으로). 빈 파티는 맨 뒤.
  state.teams=bestOrder();const r=simulate(state.teams);
  persist();renderTeams();flash(r.bad?`정렬했습니다. 저항 보스를 만나는 파티 ${r.bad}개는 피할 수 없었습니다.`:"저항 보스를 피하면서 약한 파티부터 정렬했습니다.");
});
// roster
$("#rq").addEventListener("input",e=>{ui.rq=e.target.value;renderRoster()});
$("#rElFilter").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;ui.rel=b.dataset.el||null;renderRoster()});
$("#rgrid").addEventListener("click",e=>{const fv=e.target.closest("[data-fav]");if(fv){e.stopPropagation();appMediator.characters.toggleFavorite(fv.dataset.fav);persist();renderRoster();return}
  const tk=e.target.closest(".rcard");if(tk)openProfile(tk.dataset.id)});
$("#rgrid").addEventListener("keydown",e=>{const tk=e.target.closest(".rcard");if(tk&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openProfile(tk.dataset.id)}});
RIGHT_ACTS.push(["#rgrid .rcard",tk=>toggleOwned(tk.dataset.id)]);
let rlp=null,rlpFired=false;
$("#rgrid").addEventListener("touchstart",e=>{const tk=e.target.closest(".rcard");if(!tk)return;rlpFired=false;rlp=setTimeout(()=>{rlpFired=true;toggleOwned(tk.dataset.id)},550)},{passive:true});
["touchend","touchmove","touchcancel"].forEach(ev=>$("#rgrid").addEventListener(ev,e=>{clearTimeout(rlp);if(ev==="touchend"&&rlpFired){e.preventDefault();rlpFired=false}}));
$("#prof").addEventListener("click",e=>{
  const d=$("#prof");if(e.target===d){d.close();return}
  if(e.target.id==="pfPick"){$("#pfFile").click();return}
  if(e.target.id==="pfStClear"){const g=state.growth[profId]||{};delete g.stats;return setGrowth(profId,{})}
  const pt=e.target.closest("[data-ptab]");if(pt){pfTabSel=pt.dataset.ptab;return renderProfile()}
  if(e.target.id==="pfEClear"){Object.keys(echoMsg).forEach(k=>{if(k.startsWith(profId+":"))delete echoMsg[k]});echoEdit=null;echoSel=null;return saveEchoes(profId,[null,null,null,null,null])}
  const ee=e.target.closest("[data-eedit]");if(ee){const i=+ee.dataset.eedit;echoEdit=echoEdit===i?null:i;return renderProfile()}
  const ed=e.target.closest("[data-edel]");if(ed){const i=+ed.dataset.edel;const a=echoSlots(profId);a[i]=null;delete echoMsg[profId+":"+i];if(echoEdit===i)echoEdit=null;return saveEchoes(profId,a)}
  const nw=e.target.closest("[data-enew]");if(nw){const i=+nw.dataset.enew;const a=echoSlots(profId);a[i]=newEcho(profId,i);echoEdit=i;return saveEchoes(profId,a)}
  const cp=e.target.closest("[data-ecap]");if(cp){echoSel=+cp.dataset.ecap;$("#pfEFile").click();return}
  const sm=e.target.closest("[data-esmode]");if(sm){const S=echoSetOf(profId);return saveEchoSet(profId,{mode:sm.dataset.esmode,b:S.b||S.a})}
  const es=e.target.closest(".ecard");if(es&&!e.target.closest("select,input,button")){const i=+es.dataset.eslot;
    if(es.classList.contains("empty")){echoSel=i;renderProfile();$("#pfEFile").click();return}
    echoSel=echoSel===i?null:i;return renderProfile()}
  const ch=e.target.closest("#pfCh button");if(ch)return setGrowth(profId,{chain:+ch.dataset.v});
  const r=e.target.closest("#pfR button");if(r)return setGrowth(profId,{ref:+r.dataset.v});
  const w=e.target.closest("#pfW button");if(w){const W=WMAP[+w.dataset.w];const g=state.growth[profId]||{};
    return setGrowth(profId,{wid:W.id,wr:W.q,ref:g.wid===W.id?g.ref:(W.q<5?5:1)})}
});
$("#prof").addEventListener("input",e=>{
  if(e.target.id==="pfLv"){$("#pfLvN").value=e.target.value;}
  if(e.target.id==="pfLvN"&&e.target.value===""){return}
});
document.addEventListener("paste",e=>{const d=$("#prof");if(!d||!d.open||!profId)return;
  const its=[...(e.clipboardData||{}).items||[]].filter(i=>i.type.startsWith("image/"));if(!its.length)return;e.preventDefault();
  if(pfTab(profId)==="echo")echoQueue(profId,its.map(i=>i.getAsFile()));else ocrStats(its[0].getAsFile());});
const DROPZ="#pfPaste,.ecard";
$("#prof").addEventListener("dragover",e=>{const z=e.target.closest(DROPZ);if(z){e.preventDefault();z.classList.add("over")}});
$("#prof").addEventListener("dragleave",e=>{const z=e.target.closest(DROPZ);if(z)z.classList.remove("over")});
$("#prof").addEventListener("drop",e=>{const z=e.target.closest(DROPZ);if(!z)return;e.preventDefault();z.classList.remove("over");const fs=[...e.dataTransfer.files].filter(f=>f.type.startsWith("image/"));if(!fs.length)return;
  if(z.id==="pfPaste")return ocrStats(fs[0]);
  if(z.classList.contains("ecard")&&fs.length===1){echoSel=+z.dataset.eslot}
  echoQueue(profId,fs)});
$("#prof").addEventListener("change",e=>{
  if(e.target.id==="pfFile"){const f=e.target.files[0];if(f)ocrStats(f);return}
  if(e.target.id==="pfEFile"){const fs=[...e.target.files];e.target.value="";if(fs.length)echoQueue(profId,fs);return}
  const T=e.target,ds=T.dataset;
  if(ds.eseta!=null)return saveEchoSet(profId,{a:T.value});
  if(ds.esetb!=null)return saveEchoSet(profId,{b:T.value});
  if(ds.ecost!=null||ds.emk!=null||ds.emv!=null||ds.eme!=null||ds.esk!=null||ds.esv!=null){
    const a=echoSlots(profId);const i=+(ds.ecost??ds.emk??ds.emv??ds.eme??String(ds.esk??ds.esv).split(":")[0]);const x=a[i];if(!x)return;
    const e2=JSON.parse(JSON.stringify(x));
    if(ds.ecost!=null){e2.cost=+T.value;const M=(EchoDB.mainStats(e2.cost)||{}).main||{};if(M[e2.main.k]==null){const k=Object.keys(M)[0];e2.main={k,v:M[k]}}}
    if(ds.emk!=null){const M=(EchoDB.mainStats(e2.cost)||{}).main||{};e2.main={k:T.value,v:M[T.value]??e2.main.v};if(T.value==="el")e2.main.elem=charMap[profId].el}
    if(ds.emv!=null)e2.main.v=+T.value||0;
    if(ds.eme!=null)e2.main.elem=T.value;
    if(ds.esk!=null||ds.esv!=null){const j=+String(ds.esk??ds.esv).split(":")[1];const subs=(e2.subs||[]).slice();while(subs.length<=j)subs.push(null);
      const cur=subs[j]||{k:"",v:0};if(ds.esk!=null){cur.k=T.value;const t=EchoDB.subTiers(T.value);if(t&&!cur.v)cur.v=t[0]}else cur.v=+T.value||0;
      subs[j]=cur.k?cur:null;e2.subs=subs.filter(Boolean)}
    a[i]=e2;return saveEchoes(profId,a)}
  if(e.target.dataset.st){const g=state.growth[profId]=state.growth[profId]||{};const st=g.stats=Object.assign({b:{}},g.stats||{});const v=e.target.value===""?null:+e.target.value;
    if(e.target.dataset.grp==="b"){st.b=Object.assign({},st.b);if(v==null)delete st.b[e.target.dataset.st];else st.b[e.target.dataset.st]=v}else{if(v==null)delete st[e.target.dataset.st];else st[e.target.dataset.st]=v}
    persist();$("#pfStSum").textContent=statSum(profId);$("#pfScore").textContent=charScore(profId).toFixed(1);renderRoster();rerenderPlan();return}
  if(e.target.id==="pfLv"||e.target.id==="pfLvN")return setGrowth(profId,{lv:clamp(+e.target.value||90,1,90)});
  if(e.target.id==="pfTrial")return setGrowth(profId,{trial:e.target.checked});
  if(e.target.id==="pfOwn"){if(!!state.owned[profId]!==e.target.checked)toggleOwned(profId);renderProfile();}
});
$("#ownAll").addEventListener("click",()=>{appMediator.characters.setAllOwned(true);persist();renderRoster();rerenderPlan()});
$("#ownNone").addEventListener("click",()=>{appMediator.characters.setAllOwned(false);appMediator.teams.clearSlots();persist();renderRoster();rerenderPlan()});
// cycle
$("#cycleSave").addEventListener("click",()=>{
  const m=$("#cycleMsg");
  try{const o=JSON.parse($("#cycleJson").value);
    if(!Array.isArray(o.bosses)||!Array.isArray(o.buffs)) throw new Error("bosses와 buffs는 배열이어야 합니다.");
    state.cycle=o;derive();persist();renderAll();m.className="msg okm";m.textContent="주기 데이터를 적용했습니다.";
  }catch(err){m.className="msg err";m.textContent="적용하지 못했습니다: "+err.message}
});
$("#cycleReset").addEventListener("click",()=>{state.cycle=null;derive();persist();renderAll();$("#cycleMsg").className="msg okm";$("#cycleMsg").textContent="data/cycle.js 기본값으로 되돌렸습니다."});
// chars
$("#charSave").addEventListener("click",()=>{
  const m=$("#charMsg");
  try{const arr=JSON.parse($("#charJson").value);if(!Array.isArray(arr))throw new Error("배열이어야 합니다.");
    const bad=arr.find(c=>!c||!c.id||!c.name||!EL[c.el]||![4,5].includes(+c.rar));
    if(bad) throw new Error(`형식이 맞지 않는 항목: ${JSON.stringify(bad)}`);
    const ids=new Set();for(const c of arr){if(ids.has(c.id))throw new Error("중복된 id: "+c.id);ids.add(c.id);c.rar=+c.rar;c.role=c.role||"dps"}
    state.chars=arr;derive();persist();renderAll();m.className="msg okm";m.textContent=`공명자 ${arr.length}명을 적용했습니다.`;
  }catch(err){m.className="msg err";m.textContent="적용하지 못했습니다: "+err.message}
});
$("#charReset").addEventListener("click",()=>{state.chars=null;derive();persist();renderAll();$("#charMsg").className="msg okm";$("#charMsg").textContent="기본 목록으로 되돌렸습니다."});
// data
$("#btnCopy").addEventListener("click",async()=>{const b=$("#exportBox");try{await navigator.clipboard.writeText(b.value);$("#dataMsg").className="msg okm";$("#dataMsg").textContent="복사했습니다."}catch(e){b.focus();b.select();$("#dataMsg").className="msg";$("#dataMsg").textContent="선택해 두었습니다. Ctrl+C로 복사하세요."}});
function doImport(text){
  const m=$("#dataMsg");
  try{const o=JSON.parse(text);if(!o||typeof o!=="object"||!o.owned)throw new Error("편성기 백업 형식이 아닙니다.");
    replaceState(o);derive();persist();renderAll();m.className="msg okm";m.textContent="백업을 불러왔습니다.";
  }catch(err){m.className="msg err";m.textContent="불러오지 못했습니다: "+err.message}
}
$("#btnImport").addEventListener("click",()=>doImport($("#importBox").value));
$("#fileIn").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>doImport(String(r.result));r.readAsText(f);e.target.value=""});
$("#btnDownload").hidden=false;
$("#btnDownload").addEventListener("click",()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="matrix-planner-backup.json";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});

