(function(g){
  /* 에코 점수 — 에코 5개의 부옵이 이 공명자에게 얼마나 쓸모 있는지 500점 만점으로 매긴다 (에코 1개 = 100점 만점).
     부옵 한 줄 = 수치 ÷ 그 부옵의 최대 수치(유효 줄). 점수 = Σ 유효 줄 × 가중치 × 20 × 보정 (최대 수치 한 줄 = 20점). 주옵은 코스트마다 고르는 값이라 넣지 않는다.
     딜러 가중치
       크리티컬      목표치(공식 가이드 → 이잘키)를 채울 때까지 1, 넘는 부분은 0.25
       크리티컬 피해  1 (높을수록 좋음)
       주력 스탯%    1 (공격력·HP·방어력 중 이 공명자가 쓰는 것) / 같은 스탯 고정 수치는 %로 바꾼 값만큼
                    HP 변환 공명자(경연): 공격력 1, HP는 상한(hpConv.cap)을 채울 때까지 1·넘는 부분은 0
       피해 보너스    그 공격의 피해 비중 ÷ 60% (60% 이상이면 1)
       공명 효율      최소치를 채울 때까지 1, 넘는 부분은 0
     서포터 가중치: 지원 기준 스탯(HP·공격력·방어력)·주력 스탯 supportMain(1.5), 공명 효율은 기준치(버프 상한이 더 높으면 상한)까지 1.5,
       공식 가이드에 크리티컬·크리티컬 피해 추천이 있으면 딜러처럼(1), 가이드가 「높을수록 좋음」(gt)으로 둔 공명 효율은 넘는 부분도 1.5.
       딜 스탯(1.6.6): 서포터도 딜을 하므로 아래는 supportDeal(0.5)만큼 — 기준치를 넘은 공명 효율, 크리티컬(이잘키 목표치까지, 넘으면 0.25배),
       크리티컬 피해, 피해 보너스(피해 비중이 있으면 딜러처럼, 없으면 네 종류 모두 절반). 공격력%는 피해 계수가 공격력인 서포터만(주력 스탯).
     「채울 때까지」는 비전투 최종 스탯으로 본다(무기·주옵이 이미 채운 몫은 빼고). 넘는 부분은 그 부옵을 가진 에코들에 고르게 나눈다.
     보정: 쓸모 있는 부옵 종류는 공명자마다 다르고(서포터는 2~3종), 크리티컬·공명 효율은 넘치면 덜 쳐준다.
       지금 주옵·세트·무기에서 에코마다 가장 좋은 부옵 5종이 최대 수치로 붙은 「완벽한 세팅」 = 500점이 되도록 배율을 곱한다(ideal).
     등급 구간은 data/echoes.js의 MP.ECHO_GRADES. */
  class EchoScoreCalculator{
    constructor({charMap,charDb,echoDb,echoes,weapons}){
      this.charMap=charMap;this.db=charDb;this.echoDb=echoDb;this.echoes=echoes;this.weapons=weapons;
      this.critOver=.25;this.mainOver=.25;this.supportDeal=.5;this.supportMain=1.5;this.typeFull=.6;this.perLine=20;this.maxTotal=500;
      this.types=["basic","heavy","skill","lib"];this.cache=new Map();
    }
    isSupport(id){const c=this.charMap()[id];return !!c&&c.role==="support"}
    // 부옵 키별 합
    sum(list,key){return list.reduce((a,e)=>a+(e.subs||[]).filter(s=>s&&s.k===key).reduce((b,s)=>b+(+s.v||0),0),0)}
    // 「채울 때까지 1, 넘는 부분은 over」인 부옵의 평균 가중치. have = 부옵이 준 몫, without = 부옵을 빼고 이미 있는 값
    capped(have,without,target,over){if(!(have>0))return 1;const need=Math.max(0,target-without),counted=Math.min(have,need);return (counted+over*(have-counted))/have}
    // 고정 수치 부옵의 가중치 = 최대 고정 수치가 % 부옵 최대치의 몇 배인가 (기본 스탯 기준, 1 이하)
    flatWeight(id,stat){const base=this.db.base(id)||[11000,400,1150],w=this.weapons.weaponOf(id),ws=w.w?this.weapons.stat(w.w.id):null;
      const b=stat==="atk"?base[1]+(ws?ws[0]:0):stat==="hp"?base[0]:base[2],flat=this.echoDb.subMax(stat),pct=this.echoDb.subMax(stat+"%");
      return b>0&&flat&&pct?Math.min(1,flat/b/(pct/100)):0}
    /* HP 변환 공명자(경연): HP 부옵은 HP 상한(cap)을 채울 때까지 1, 넘는 부분은 0. HP%·고정 HP 부옵을 HP 수치로 합쳐 같은 비율을 준다 */
    hpCapped(id,list,sheet,cap,w,best){const base=(this.db.base(id)||[11000,400,1150])[0],have=base*this.sum(list,"hp%")/100+this.sum(list,"hp"),without=sheet.hp-have;
      const r=this.capped(have,without,cap,0),fw=this.flatWeight(id,"hp");w["hp%"]=r;w.hp=fw*r;best["hp%"]=without<cap?1:0;best.hp=without<cap?fw:0}
    /* 에코 목록(세트 배정 포함) 기준 부옵 키별 가중치 {w:{키: 가중치}, best:{키: 남은 몫이 있으면 1, 없으면 넘는 부분 가중치}} */
    weights(id,list){const sheet=this.echoes.sheetBuild(id,list).screen,scale=this.echoes.scaleOf(id),w={},best={};
      const cap=(k,target,over)=>{const have=this.sum(list,k),without=sheet[k]-have;w[k]=this.capped(have,without,target,over);best[k]=without<target?1:over};
      const full=(k,v)=>{w[k]=best[k]=v};
      const stat=s=>{full(s+"%",1);full(s,this.flatWeight(id,s))};
      const erMin=()=>this.echoes.erMin(id,this.echoes.build(id,list)).min;
      if(this.isSupport(id)){const targets=this.echoes.supportTargets(id),guide=this.db.guide(id)||{},gt=guide.gt||[],D=this.supportDeal,S=this.supportMain;
        // 지원 스탯(HP·공격력·방어력 · 주력 스탯)과 기준치까지의 공명 효율은 S(1.5)
        new Set([scale,...["hp","atk","def"].filter(k=>targets[k]!=null)]).forEach(s=>{stat(s);[s+"%",s].forEach(k=>{w[k]*=S;best[k]*=S})});
        // 서포터도 딜을 한다(1.6.6): 기준치를 넘은 공명 효율 · 크리티컬 · 크리티컬 피해 · 피해 보너스를 딜 스탯으로 D만큼 쳐준다
        cap("er",Math.max(targets.er||0,this.db.erBuffCap(id)||0)||erMin(),gt.includes("er")?1:D/S);w.er*=S;best.er*=S;
        if(guide.cr)cap("cr",guide.cr,this.critOver);else{cap("cr",this.echoes.ijkOf(id).cr,this.critOver);w.cr*=D;best.cr*=D}
        full("cd",guide.cd?1:D);
        // 피해 보너스: 피해 비중 데이터가 있으면 딜러처럼(× D), 없으면 어느 공격이 주력인지 몰라 네 종류 모두 D의 절반
        const typed=this.types.some(k=>this.db.share(id,k)>0);
        this.types.forEach(k=>{const share=this.db.share(id,k);if(!typed)full(k,D/2);else if(share>0)full(k,D*Math.min(1,share/this.typeFull))});
        return {w,best}}
      const ijk=this.echoes.ijkOf(id),guide=this.db.guide(id)||{};
      cap("cr",guide.cr||ijk.cr,this.critOver);full("cd",1);
      const conv=this.db.hpConv(id);
      if(conv){stat("atk");this.hpCapped(id,list,sheet,conv.cap,w,best)}else stat(scale);
      this.types.forEach(k=>{const share=this.db.share(id,k);if(share>0)full(k,Math.min(1,share/this.typeFull))});
      cap("er",erMin(),0);return {w,best}}
    /* 보정 배율: 지금 주옵·세트·무기 그대로, 에코마다 가장 좋은 부옵 5종이 최대 수치로 붙은 「완벽한 세팅」 = 500점이 되도록.
       크리티컬·공명 효율은 넘치면 덜 쳐주므로, 쓸모 있는 부옵 상위 7종 중 5종 조합을 모두 넣어 보고 가장 높은 것을 기준으로 삼는다.
       빈 칸은 그 자리의 기본 에코(4코 크리티컬 · 3코 속성 피해 · 1코 주력 스탯%)로 채운다 */
    ideal(id,list){const el=(this.charMap()[id]||{}).el,scale=this.echoes.scaleOf(id),cost=[4,3,3,1,1];
      const base=[0,1,2,3,4].map(i=>list[i]||{cost:cost[i],main:cost[i]===4?{k:"cr"}:cost[i]===3?{k:"el",elem:el}:{k:scale+"%"},set:(list.find(Boolean)||{}).set}).map(e=>{
        const M=(this.echoDb.mainStats(e.cost)||{}).main||{};return Object.assign({},e,{main:Object.assign({},e.main,{v:e.main.v!=null?e.main.v:M[e.main.k]||0})})});
      const key=JSON.stringify([id,base.map(e=>[e.cost,e.main.k,e.main.elem||"",+e.main.v,e.set||""]),this.weapons.weaponOf(id)]);if(this.cache.has(key))return this.cache.get(key);
      const {best}=this.weights(id,base),pool=Object.keys(best).sort((a,b)=>best[b]-best[a]);
      this.echoDb.subKeys().forEach(k=>{if(!pool.includes(k))pool.push(k)});const top=pool.slice(0,7);
      let max=0;const pick=(start,chosen)=>{if(chosen.length===5){const L=base.map(e=>Object.assign({},e,{subs:chosen.map(k=>({k,v:this.echoDb.subMax(k)}))})),{w}=this.weights(id,L);
          max=Math.max(max,chosen.reduce((a,k)=>a+(w[k]||0),0)*this.perLine*5);return}
        for(let i=start;i<top.length;i++)pick(i+1,chosen.concat(top[i]))};
      pick(0,[]);const f=max>0?this.maxTotal/max:0;this.cache.set(key,f);return f}
    // 에코 한 개 점수 (100점 만점)와 부옵별 점수. f = 보정 배율
    echoScore(echo,w,f){const subs=(echo&&echo.subs||[]).map(s=>{const max=this.echoDb.subMax(s.k),pts=max?Math.min(1,(+s.v||0)/max)*(w[s.k]||0)*this.perLine*f:0;return {k:s.k,v:s.v,pts}});
      const sum=subs.reduce((a,s)=>a+s.pts,0),cap=this.perLine*5;if(sum>cap)subs.forEach(s=>s.pts*=cap/sum);
      return {score:Math.min(cap,sum),subs}}
    /* 지금 모드의 에코 점수 {total, grade, slots:[칸별 {score, subs} | null], parts:{키: 점수}, count, weights, norm}. 에코가 없으면 null */
    score(id){if(!this.charMap()[id])return null;const raw=(this.echoes.slot(id).echoes||[]).slice(0,5);if(!raw.some(e=>e&&e.main))return null;
      const withSet=this.echoes.echoesOf(id);let n=0;const list=[0,1,2,3,4].map(i=>raw[i]&&raw[i].main?withSet[n++]:null);
      const {w}=this.weights(id,withSet),f=this.ideal(id,list),slots=list.map(e=>e?this.echoScore(e,w,f):null),parts={};
      slots.forEach(s=>s&&s.subs.forEach(x=>{if(x.pts>0)parts[x.k]=(parts[x.k]||0)+x.pts}));
      const total=Math.min(this.maxTotal,slots.reduce((a,s)=>a+(s?s.score:0),0));
      return {total,grade:this.echoDb.grade(total),slots,parts,count:slots.filter(Boolean).length,weights:w,norm:f}}
  }
  g.MP.EchoScoreCalculator=EchoScoreCalculator;
})(typeof window!=="undefined"?window:globalThis);
