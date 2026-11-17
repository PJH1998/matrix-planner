"use strict";
/* ---------- routing ---------- */
const VIEWS=["plan","roster","invest","records","updates","cycle","data"];
document.getElementById("cycleTab").hidden=!IS_ADMIN;
function route(){const h=(location.hash||"").slice(1);let v=VIEWS.includes(h)?h:"plan";if(v==="cycle"&&!IS_ADMIN)v="plan";
  VIEWS.forEach(x=>document.getElementById("v-"+x).classList.toggle("on",x===v));
  document.querySelectorAll("nav.tabs a").forEach(a=>{if(a.dataset.v===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  if(v==="plan")setPlanTop();}
// 배치 화면 세 칸의 높이를 '머리글 아래 남은 화면'에 맞춘다 → 칸이 화면 밖으로 잘리지 않음
function setPlanTop(){const el=document.querySelector("#v-plan .plan");if(!el||!el.offsetParent)return;
  const t=Math.round(el.getBoundingClientRect().top+window.scrollY);document.documentElement.style.setProperty("--plan-top",t+"px")}
window.addEventListener("resize",setPlanTop);
window.addEventListener("hashchange",route);

/* ---------- theme toggle ---------- */
function isDark(){const t=document.documentElement.getAttribute("data-theme");return t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches}
function paintThemeBtn(){const b=document.getElementById("themeBtn");const d=isDark();b.textContent=d?"☀ 라이트 모드":"☾ 다크 모드";b.setAttribute("aria-pressed",String(d))}
document.getElementById("themeBtn").addEventListener("click",()=>{
  const next=isDark()?"light":"dark";document.documentElement.setAttribute("data-theme",next);
  try{localStorage.setItem("mp-theme",next)}catch(e){}paintThemeBtn();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",paintThemeBtn);
paintThemeBtn();

/* ---------- boot ---------- */
state=appMediator.load();derive();simCache=simulate(state.teams);archiveIfCycleChanged();renderAll();route();
setSave("ok","이 브라우저에 저장됨");
connect();
loadPortraits();loadGameImages();