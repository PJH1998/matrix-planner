/* =====================================================================
   EchoDB — 에코 데이터 중개자
   에코 세트·주옵·부옵·이름·세트 효과(data/echoes.js)와 공명자별 노드·주력 세트(CharDB)를 한 곳에서 내준다.
   에코 입력·캡처 인식·스탯 계산은 이 객체로만 에코 데이터를 읽는다.

   에코 한 개: {cost, lv, main:{k, v, elem}, subs:[{k, v}], set}
     k  주옵·부옵 키 — atk% hp% def% atk hp def cr cd er heal el(속성 피해, elem) basic heavy skill lib
   ===================================================================== */
(function(g){
  const MP=g.MP;
  const ELS={"응결":"glacio","용융":"fusion","전도":"electro","기류":"aero","회절":"spectro","인멸":"havoc"};
  const LABEL={"atk%":"공격력","hp%":"HP","def%":"방어력",atk:"공격력",hp:"HP",def:"방어력",cr:"크리티컬",cd:"크리티컬 피해",er:"공명 효율",heal:"치료 효과",
    el:"속성 피해",basic:"일반 공격 피해",heavy:"강공격 피해",skill:"공명 스킬 피해",lib:"공명 해방 피해",echo:"에코 어빌리티 피해",outro:"반주 스킬 피해",all:"전체 피해",
    "cr:heavy":"강공격 크리티컬","cr:echo":"에코 어빌리티 크리티컬"};
  const PCT_KEYS=new Set(["atk%","hp%","def%","cr","cd","er","heal","el","basic","heavy","skill","lib"]);
  const DMG_TYPES=["basic","heavy","skill","lib","echo","intro","outro"];
  const FIXED={4:["atk",150],3:["atk",100],1:["hp",2280]};
  // 글자 인식에서 서로 헷갈리기 쉬운 숫자
  const CONF={"0":"869","1":"74","2":"7","3":"58","4":"1","5":"36","6":"85","7":"1","8":"3609","9":"80"};

  /* ---------- 캡처 글자 → 에코 ---------- */
  function keyOf(label,pct){
    const s=label.replace(/\s+/g,"");
    if(/크리티[컬칼]피해/.test(s))return {k:"cd"};
    if(/크리티[컬칼]/.test(s))return {k:"cr"};
    if(/공명효율/.test(s))return {k:"er"};
    if(/치료/.test(s))return {k:"heal"};
    const m=s.match(/(응결|용융|전도|기류|회절|인멸)/);if(m)return {k:"el",elem:ELS[m[1]]};
    if(/일반공격/.test(s))return {k:"basic"};
    if(/강공격/.test(s))return {k:"heavy"};
    if(/공명스킬/.test(s))return {k:"skill"};
    if(/공명해방/.test(s))return {k:"lib"};
    if(/공격력/.test(s))return {k:pct?"atk%":"atk"};
    if(/방어력/.test(s))return {k:pct?"def%":"def"};
    if(/HP|체력|H₽/i.test(s))return {k:pct?"hp%":"hp"};
    // 밝은 배경에서 글자 일부만 읽힌 경우(예: 「격력」, 「> 피해」, 「명 해방 피해」)
    if(/티[컬칼]|리티/.test(s))return {k:/피해/.test(s)?"cd":"cr"};
    if(/해방/.test(s))return {k:"lib"};
    if(/스킬/.test(s))return {k:"skill"};
    if(/[효요]율|공명[^스해]?율/.test(s))return {k:"er"};
    if(/격력/.test(s))return {k:pct?"atk%":"atk"};
    if(/어력/.test(s))return {k:pct?"def%":"def"};
    return null}
  // 이름을 못 읽은 부옵: 수치가 그 단계에 있는 부옵 종류가 하나뿐이면 그것으로 본다(이미 나온 종류 제외, 「피해」가 보이면 피해 계열만)
  const DMG_SUBS=new Set(["cd","basic","heavy","skill","lib"]);
  function guessSub(label,raw,pct,taken){const v=num(raw),T=MP.ECHO_SUB_TIERS||{},dmg=/피해|보너스/.test(label);
    const c=Object.keys(T).filter(k=>!taken.has(k)&&T[k].includes(v)&&PCT_KEYS.has(k)===pct&&(!dmg||DMG_SUBS.has(k)));return c.length===1?{k:c[0]}:null}
  // 숫자 문자열에서 헷갈리는 숫자를 최대 n개 바꾼 후보들 (바꾼 개수가 적은 순)
  function variants(raw,n){const out=[[raw]];let cur=[raw];const seen=new Set([raw]);
    for(let d=0;d<(n||2);d++){const nx=[];cur.forEach(s=>{for(let i=0;i<s.length;i++){const alt=CONF[s[i]];if(!alt)continue;
      for(const a of alt){const t=s.slice(0,i)+a+s.slice(i+1);if(!seen.has(t)){seen.add(t);nx.push(t)}}}});out.push(nx);cur=nx}
    return out}
  const num=s=>parseFloat(String(s).replace(/,/g,""));
  // 부옵: 게임에 있는 단계 값으로 맞춘다
  function snapSub(k,raw){const v=num(raw);const T=(MP.ECHO_SUB_TIERS||{})[k];if(!T||!isFinite(v))return {v,fix:false};
    if(T.includes(v))return {v,fix:false};
    for(const lvl of variants(String(raw).replace(/,/g,""),2).slice(1)){const hit=lvl.map(num).filter(x=>T.includes(x));if(hit.length)return {v:hit[0],fix:true,from:v}}
    const near=T.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a);return {v:near,fix:true,from:v}}
  // 주옵: 코스트별 최대치(+25)를 넘으면 헷갈린 숫자로 보고 맞춘다
  function snapMain(cost,k,raw){const v=num(raw);const M=((MP.ECHO_MAIN||{})[cost]||{}).main||{};const mx=M[k];if(mx==null||!isFinite(v))return {v,fix:false};
    if(v<=mx+0.05)return {v,fix:false};
    for(const lvl of variants(String(raw).replace(/,/g,""),2).slice(1)){const c=lvl.map(num).filter(x=>x<=mx+0.05);const eq=c.find(x=>Math.abs(x-mx)<0.05);if(eq!=null)return {v:mx,fix:true,from:v};if(c.length)return {v:Math.max(...c),fix:true,from:v}}
    return {v:mx,fix:true,from:v}}
  function parse(text){
    const lines=String(text||"").split(/\n/).map(l=>l.trim()).filter(Boolean);
    let cost=null,lv=null;const rows=[];
    lines.forEach(l=>{const c=l.match(/COST\s*([134])/i);if(c)cost=+c[1];
      const L=l.match(/\+\s*(\d{1,2})\b/);if(L&&lv==null&&!/[%]/.test(l))lv=+L[1];
      const t=l.replace(/(?<=\d)[Oo]|[Oo](?=[\d.])/g,"0").replace(/(?<=\d)[lI|]|[lI|](?=\d)/g,"1");
      const m=t.match(/(\d[\d,]*(?:\.\d+)?)\s*(%?)\s*[^\d%]{0,2}$/);if(!m)return;
      const pct=!!m[2]||/\.\d/.test(m[1]);const label=t.slice(0,m.index);let k=keyOf(label,pct);
      // 주옵 줄의 속성 이름이 깨진 경우(「£8 피해 보너스」): 3코 속성 피해 30%로 본다. 속성은 공명자 속성으로 채운다(elem 없음)
      if(!k&&!rows.length&&pct&&/피해|보너스/.test(label)&&num(m[1])===((MP.ECHO_MAIN||{})[3]||{main:{}}).main.el)k={k:"el"};
      if(!k&&rows.length){const isFixed=r=>!r.pct&&((r.k==="atk"&&[100,150].includes(num(r.raw)))||(r.k==="hp"&&num(r.raw)===2280));
        k=guessSub(label,m[1],pct,new Set(rows.slice(1).filter(r=>!isFixed(r)).map(r=>r.k)));if(k)k.guess=1}
      if(!k)return;
      rows.push(Object.assign({raw:m[1],pct},k))});
    if(!rows.length)return null;
    // 1번째 줄 = 주옵, 고정 부주옵(공격력 150·100 / HP 2280) = 코스트, 나머지 = 부옵
    const main=rows[0];let fi=rows.findIndex((r,i)=>i>0&&!r.pct&&((r.k==="atk"&&[100,150].includes(num(r.raw)))||(r.k==="hp"&&num(r.raw)===2280)));
    if(fi<0)fi=rows.findIndex((r,i)=>i===1&&!r.pct&&(r.k==="atk"||r.k==="hp"));
    if(cost==null){const f=fi>=0?rows[fi]:null;cost=f?(f.k==="hp"?1:num(f.raw)>=125?4:3):(["cr","cd","heal"].includes(main.k)?4:["el","er"].includes(main.k)?3:4)}
    const fixes=[];
    const mk=main.k==="atk"?"atk%":main.k==="hp"?"hp%":main.k==="def"?"def%":main.k; // 주옵은 항상 % (고정값 주옵 없음)
    const ms=snapMain(cost,mk,main.raw);if(ms.fix)fixes.push(`${LABEL[mk]} ${ms.from} → ${ms.v}`);
    let subFix=0;const subOk=[];
    const subs=rows.filter((r,i)=>i>0&&i!==fi).slice(0,5).map(r=>{const s=snapSub(r.k,r.raw);if(s.fix){subFix++;fixes.push(`${LABEL[r.k]} ${s.from} → ${s.v}`)}subOk.push(!s.fix&&!r.guess);return {k:r.k,v:s.v}});
    // 여러 번 인식한 결과 중 고를 때 쓰는 점수: 읽은 부옵 수가 많고, 고친 숫자가 적을수록 높다
    // 게임의 부옵은 종류가 겹치지 않으므로 겹치면 잘못 읽은 것으로 보고 크게 깎는다. 이름을 수치로 추정한 줄은 조금 깎는다
    const dup=subs.length-new Set(subs.map(s=>s.k)).size,guessed=rows.filter((r,i)=>i>0&&i!==fi&&r.guess).length;
    const score=subs.length*10-subFix*3+(fi>=0?2:0)-(ms.fix?1:0)-dup*8-guessed;
    return {cost,lv,main:Object.assign({k:mk,v:ms.v},main.elem?{elem:main.elem}:{}),subs,subOk,fixes,subFix,guessed,score}}

  /* 같은 캡처를 여러 번 읽은 결과를 합친다. 패스마다 놓치는 줄이 달라서(밝은 배경의 줄) 줄 순서가 아니라 부옵 종류별로 모은다.
     - 주옵·코스트: 모든 패스의 다수결(동점이면 점수가 높은 패스). 속성 이름은 읽힌 패스의 것을 쓴다
     - 부옵: 게임의 부옵은 종류가 겹치지 않는다. 여러 패스에 나온 종류부터 최대 5개, 수치는 숫자를 고치지 않고 읽힌 값의 다수결
     - 순서: 패스 안에서의 줄 순서(평균) */
  function merge(list){const L=(list||[]).filter(e=>e&&e.main).sort((a,b)=>b.score-a.score);if(!L.length)return null;if(L.length===1)return L[0];
    const vote=(rows,f)=>{const m=new Map();rows.forEach((e,r)=>{const key=f(e);if(key==null)return;const x=m.get(key)||{c:0,r};x.c++;m.set(key,x)});
      return [...m.entries()].sort((a,b)=>b[1].c-a[1].c||a[1].r-b[1].r)[0]};
    const mv=vote(L,e=>e.main.k+"|"+e.main.v),cv=vote(L,e=>String(e.cost));
    const mainOf=L.find(e=>e.main.k+"|"+e.main.v===mv[0]),withElem=L.find(e=>e.main.k===mainOf.main.k&&e.main.elem);
    const main=Object.assign({},mainOf.main,withElem?{elem:withElem.main.elem}:{});
    const by=new Map();
    L.forEach((e,r)=>e.subs.forEach((s,i)=>{const x=by.get(s.k)||{k:s.k,n:0,r,pos:0,vals:new Map()};x.n++;x.pos+=i/Math.max(1,e.subs.length-1);
      const v=x.vals.get(s.v)||{c:0,ok:0,r};v.c++;if(!e.subOk||e.subOk[i])v.ok++;x.vals.set(s.v,v);by.set(s.k,x)}));
    const subs=[...by.values()].sort((a,b)=>b.n-a.n||a.r-b.r).slice(0,5).sort((a,b)=>a.pos/a.n-b.pos/b.n)
      .map(x=>({k:x.k,v:[...x.vals.entries()].sort((a,b)=>b[1].ok-a[1].ok||b[1].c-a[1].c||a[1].r-b[1].r)[0][0]}));
    return Object.assign({},L[0],{cost:+cv[0],main,subs,fixes:L[0].fixes,passes:L.length})}

  /* ---------- 세트 ---------- */
  function setCounts(echoes){const n={};(echoes||[]).forEach(e=>{if(e&&e.set)n[e.set]=(n[e.set]||0)+1});return n}
  // 기준 세트(공명자 파일의 sets 첫 줄) → {세트: 개수}
  function refCounts(id){const r=(MP.CharDB.sets(id)||[])[0];const n={};if(!r)return n;for(let i=0;i<r.length;i+=2){if(typeof r[i]!=="string")break;const name=r[i].split("|")[0];if(MP.ECHO_SETS[name])n[name]=+r[i+1]||0}return n}
  // 활성화된 세트 효과 목록 (2세트 고정 스탯 + 개수 조건 효과)
  function activeFx(counts){const out=[];Object.entries(counts).forEach(([name,c])=>{const S=MP.ECHO_SETS[name],F=(MP.SET_FX||{})[name];if(!S)return;
      if(S.p2&&c>=2)out.push({set:name,pc:2,p2:S.p2});
      if(F&&c>=F.n)F.fx.forEach(fx=>out.push({set:name,pc:F.n,fx}))});return out}
  // 조건부 효과의 실제 반영 비율 (조건 미충족이면 0)
  function fxMul(fx,C,stats){const nd=fx.need||{};let m=(fx.st||1)*(fx.up==null?1:fx.up);
    if(nd.m&&!C.has(nd.m))return 0;
    if(nd.er&&!(stats&&stats.er>=nd.er))return 0;
    if(nd.t){const sh=nd.t.reduce((a,k)=>a+C.share(k),0);if(sh<0.1)m*=0.3}
    if(fx.k==="el"&&fx.elem&&fx.elem!==C.el)return 0;
    return m}

  /* ---------- 스탯 합산 ----------
     o: {el, base:[HP,공,방], nodes, weapon:[공격력, 부옵 키, 수치]|null, sheetFx, echoes, has(ms), share(k)}
     최종 = 기본 + 무기(기본 공격력·부옵) + 고유 노드 + 에코 주옵·고정 부주옵·부옵 + 세트 2세트 + 조건부 효과(장착자 본인 몫) */
  function blank(){return {pct:{atk:0,hp:0,def:0},flat:{atk:0,hp:0,def:0},cr:5,cd:150,er:100,heal:0,el:0,all:0,types:{},crT:{}}}
  function addKey(S,k,v,elem,myEl){if(!v)return;
    if(k==="atk%"||k==="hp%"||k==="def%")S.pct[k.slice(0,-1)]+=v;
    else if(k==="atk"||k==="hp"||k==="def")S.flat[k]+=v;
    else if(k==="cr"||k==="cd"||k==="er"||k==="heal")S[k]+=v;
    else if(k==="el"){if(!elem||elem===myEl)S.el+=v}
    else if(k==="all")S.all+=v;
    else if(k.startsWith("cr:"))S.crT[k.slice(3)]=(S.crT[k.slice(3)]||0)+v;
    else S.types[k]=(S.types[k]||0)+v}
  function finish(S,o,baseAtk){const B=o.base||[0,0,0];
    S.atk=(baseAtk)*(1+S.pct.atk/100)+S.flat.atk;S.hp=B[0]*(1+S.pct.hp/100)+S.flat.hp;S.def=B[2]*(1+S.pct.def/100)+S.flat.def;return S}
  /* HP 변환(CharDB.hpConv): HP는 cap까지만 센다. part의 키마다 HP 1000당 증가량 */
  function hpPart(hp,conv,part){const h=Math.min(Math.max(+hp||0,0),conv.cap||Infinity)/1000,out={};Object.entries(part||{}).forEach(([k,v])=>out[k]=v*h);return out}
  // 스탯 화면에 잡히는 HP 변환(공격력·속성 피해)을 더한다
  function hpScreen(S,conv){if(!conv||!conv.screen)return S;const x=hpPart(S.hp,conv,conv.screen);if(x.atk)S.atk+=x.atk;if(x.el)S.el+=x.el;if(x.all)S.all+=x.all;return S}
  function build(o){
    const S=blank();const B=o.base||[0,0,0];const W=o.weapon;const C={el:o.el,has:o.has,share:o.share};
    Object.entries(o.nodes||{}).forEach(([k,v])=>addKey(S,k,v,null,o.el));
    if(W){if(W[1])addKey(S,W[1],W[2],null,o.el)}
    Object.entries(o.sheetFx||{}).forEach(([k,v])=>addKey(S,k,v,null,o.el));
    const E=(o.echoes||[]).filter(e=>e&&e.main);
    E.forEach(e=>{addKey(S,e.main.k,+e.main.v||0,e.main.elem,o.el);const f=FIXED[e.cost];if(f)addKey(S,f[0],e.fixed!=null?+e.fixed:f[1],null,o.el);
      (e.subs||[]).forEach(s=>addKey(S,s.k,+s.v||0,null,o.el))});
    const act=activeFx(setCounts(E));
    act.filter(a=>a.p2).forEach(a=>Object.entries(a.p2).forEach(([k,v])=>{if(k!=="elem")addKey(S,k,v,a.p2.elem,o.el)}));
    // 스탯 화면에 보이는 값(조건부 효과 전) — 공식 추천 스탯과 비교할 때 쓴다
    {const T=hpScreen(finish(JSON.parse(JSON.stringify(S)),o,B[1]+(W?W[0]:0)),o.hpConv);S.screen={atk:T.atk,hp:T.hp,def:T.def,cr:T.cr,cd:T.cd,er:T.er,heal:T.heal,el:T.el,all:T.all,types:Object.assign({},T.types),crT:Object.assign({},T.crT)}}
    S.fx=[];
    act.filter(a=>a.fx&&a.fx.to!=="next").forEach(a=>{const m=fxMul(a.fx,C,S);S.fx.push({set:a.set,pc:a.pc,k:a.fx.k,v:a.fx.v*(a.fx.st||1),eff:a.fx.v*m,elem:a.fx.elem,to:a.fx.to||"self"});if(m>0)addKey(S,a.fx.k,a.fx.v*m,a.fx.elem,o.el)});
    act.filter(a=>a.fx&&a.fx.to==="next").forEach(a=>{const m=fxMul(a.fx,C,S);S.fx.push({set:a.set,pc:a.pc,k:a.fx.k,v:a.fx.v*(a.fx.st||1),eff:a.fx.v*m,elem:a.fx.elem,to:"next"})});
    S.sets=Object.entries(setCounts(E)).map(([name,c])=>({name,c,on:act.filter(a=>a.set===name).map(a=>a.pc).filter((x,i,l)=>l.indexOf(x)===i)}));
    return hpScreen(finish(S,o,B[1]+(W?W[0]:0)),o.hpConv)}
  /* 기준 세팅: '이 정도면 잘 키웠다' 스탯(스탯 화면 값, 2세트 고정 스탯 포함) + 기준 세트의 조건부 효과
     o: {el, ijk:{main:[atk|hp, 값], cr, cd}, elRef, typeRef, typeKeys, base, weaponAtk, has, share, counts} */
  function refBuild(o){const S=blank();const C={el:o.el,has:o.has,share:o.share};
    S.cr=o.ijk.cr;S.cd=o.ijk.cd;S.el=o.elRef;(o.typeKeys||[]).forEach(k=>S.types[k]=(S.types[k]||0)+o.typeRef);S.er=130;
    const sc=o.ijk.main[0],mv=o.ijk.main[1];const baseAtk=((o.base||[])[1]||0)+(o.weaponAtk||0),baseHp=(o.base||[])[0]||0;
    let addAtk=0,addHp=0;
    activeFx(o.counts||{}).filter(a=>a.fx&&a.fx.to!=="next").forEach(a=>{const m=fxMul(a.fx,C,S);if(m<=0)return;const v=a.fx.v*m;
      if(a.fx.k==="atk%")addAtk+=baseAtk*v/100;else if(a.fx.k==="hp%")addHp+=baseHp*v/100;else addKey(S,a.fx.k,v,a.fx.elem,o.el)});
    S.atk=(sc==="atk"?mv:0)+addAtk;S.hp=(sc==="hp"?mv:0)+addHp;return S}
  /* 기대 피해: 피해 유형별 비중(w)으로 크리티컬·피해 보너스를 나눠 계산.
     conv(HP 변환)가 있으면 공격력 × 피해 유형 배율(HP 비례, cap까지)로 계산하고, 전투 중 HP 변환 피해 보너스를 더한다 (스탯 화면 몫은 S에 이미 들어 있다) */
  function dmg(S,scale,w,conv){const ks=Object.keys(w).filter(k=>w[k]>0);const tw=ks.reduce((a,k)=>a+w[k],0)||1;const main=conv?S.atk:scale==="hp"?S.hp:scale==="def"?S.def:S.atk;
    const fight=conv?hpPart(S.hp,conv,conv.fight):{},h=conv?Math.min(Math.max(+S.hp||0,0),conv.cap||Infinity):0,crT=S.crT||{},types=S.types||{};
    const mul=k=>{const m=conv&&(conv.mul||{})[k];return m?1+m.per/100*Math.max(0,h-(m.from||0))/1000:1};
    let d=0;ks.forEach(k=>{const cr=Math.min(Math.max(S.cr+(crT[k]||0),0),100)/100;d+=w[k]*mul(k)*(1+cr*(S.cd/100-1))*(1+((S.el||0)+(S.all||0)+(fight.el||0)+(fight.all||0)+(types[k]||0))/100)});
    return main*d/tw}
  /* 파티에 주는 세트 효과(다른 파티원 몫): to party(장착자 제외) / next */
  function teamFx(echoes,C){const E=(echoes||[]).filter(e=>e&&e.main);return activeFx(setCounts(E)).filter(a=>a.fx&&(a.fx.to==="party"||a.fx.to==="next")).map(a=>({set:a.set,to:a.fx.to,k:a.fx.k,elem:a.fx.elem,v:a.fx.v*fxMul(Object.assign({},a.fx,{k:"x"}),C,null)})).filter(x=>x.v>0)}
  function refTeamFx(counts,C){return activeFx(counts||{}).filter(a=>a.fx&&(a.fx.to==="party"||a.fx.to==="next")).map(a=>({set:a.set,to:a.fx.to,k:a.fx.k,elem:a.fx.elem,v:a.fx.v*fxMul(Object.assign({},a.fx,{k:"x"}),C,null)})).filter(x=>x.v>0)}

  const DB={
    LABEL,PCT_KEYS,DMG_TYPES,FIXED,ELS,
    sets:()=>MP.ECHO_SETS||{},
    setNames:()=>Object.keys(MP.ECHO_SETS||{}),
    set:name=>(MP.ECHO_SETS||{})[name]||null,
    setFx:name=>(MP.SET_FX||{})[name]||null,
    setIcon:name=>(MP.ECHO_SET_ICON||{})[name]||null,     // [번호, 아이콘 파일명]
    // 부옵 수치 단계(1~8). 고정 공격력·방어력처럼 4단계인 옵션은 8단계 기준으로 늘린다
    tier(k,v){const T=(MP.ECHO_SUB_TIERS||{})[k];if(!T)return 0;let i=T.indexOf(+v);if(i<0)i=T.reduce((b,x,j)=>Math.abs(x-v)<Math.abs(T[b]-v)?j:b,0);return T.length===8?i+1:Math.round((i+1)*8/T.length)},
    mainStats:cost=>(MP.ECHO_MAIN||{})[cost]||null,       // 코스트별 주옵 최대치·고정 부주옵
    subRange:key=>(MP.ECHO_SUB||{})[key]||null,           // 부옵 [최소, 최대]
    subTiers:key=>(MP.ECHO_SUB_TIERS||{})[key]||null,
    subKeys:()=>Object.keys(MP.ECHO_SUB||{}),
    subOdds:key=>(MP.ECHO_SUB_ODDS||{})[key]||null,       // 수치 단계별 가중치 (공식 확률 공시, subTiers와 같은 순서)
    subMax:key=>{const t=(MP.ECHO_SUB_TIERS||{})[key];return t?t[t.length-1]:null}, // 부옵 최대 수치(마지막 단계)
    grades:()=>MP.ECHO_GRADES||[],                         // 에코 점수 등급 [{id, name, desc, min, icons}] 높은 등급부터
    // 등급 아이콘 경로. v = 지역 아이콘 번호(1부터). 아이콘이 1개인 등급은 v를 보지 않는다
    gradeIcon(id,v=1){const g=(MP.ECHO_GRADES||[]).find(x=>x.id===id);if(!g)return "";const n=g.icons||1;return n>1?`icons/grade/${id}/${Math.min(n,Math.max(1,v|0||1))}.webp`:`icons/grade/${id}.webp`},
    /* 점수의 등급 {id, name, desc, min, sub, label}. 맨 위 등급을 뺀 등급은 [min, 윗 등급 min) 구간을 셋으로 나눠 sub = III · II · I (I이 가장 높음) */
    grade(score){const G=MP.ECHO_GRADES||[],i=G.findIndex(g=>score>=g.min);if(i<0)return null;const g=G[i],up=G[i-1];let sub=null;
      if(up){const t=(score-g.min)/(up.min-g.min);sub=t>=2/3?"I":t>=1/3?"II":"III"}
      return Object.assign({},g,{sub,label:sub?`${g.name} ${sub}`:g.name})},
    names:()=>MP.ECHO_NAMES||[],
    /* 공명자 연결 — 공명자 데이터는 CharDB를 거친다 */
    charSets:id=>MP.CharDB.sets(id),                       // [[세트, 개수, …], …] 위에 있을수록 정배
    charNodes:id=>MP.CharDB.nodes(id),                     // 고유 스탯 노드 합계
    mainSet(id){const s=DB.charSets(id)[0];return s?s[0].split("|")[0]:null},
    refCounts,
    /* 계산 */
    parse,merge,snapSub,snapMain,build,refBuild,dmg,hpPart,teamFx,refTeamFx,setCounts,activeFx
  };
  MP.EchoDB=DB;
})(typeof window!=="undefined"?window:globalThis);
