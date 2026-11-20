(function(g){
  /* 스펙업 효율 — 에코를 새로 깎았을 때 지금보다 좋아질 기대값.
     에코 한 칸을 같은 코스트·주옵·세트의 새 에코(25레벨, 부옵 5개)로 바꾼다고 보고,
     부옵은 공식 확률 공시(EchoDB.subOdds)대로 뽑는다: 13종 중 남은 종류에서 균등하게, 수치는 단계별 확률.
       p     새 에코가 지금 에코보다 좋을 확률
             = 개인 점수(공명력·협주력)가 오르고, 지금 공명 효율 최소치를 채우고 있다면 계속 채우는 경우
       gain  좋아졌을 때 개인 점수가 평균 몇 % 오르는지
       eff   p × gain = 새 에코 1개당 기대 상승률(%)  ← 정렬 기준
       tries 1/p (좋은 에코가 나올 때까지 평균 몇 개를 깎아야 하는지)
     순수하게 공명자 스펙만 본다: 이번 주기 보스·파워 서킷·파티 편성은 넣지 않는다(주기마다 표가 달라지지 않게).
     공명 체인·무기는 돈이 드는 성장이라 투자 효율 탭이 다루고, 주파수 조정기 재구성도 넣지 않는다.
     공명 효율이 모자란 공명자를 위로 올리지 않는다(경고는 따로 한다).
     공명 모드 공명자는 모드마다 에코가 따로라, 에코를 입력한 모드마다 따로 계산한다.
     확률은 고정 시드 몬테카를로로 구한다 — 같은 입력이면 늘 같은 결과. */
  class SpecUpManager{
    constructor({state,charMap,charDb,echoDb,echoes,characters,samples}){
      this.state=state;this.charMap=charMap;this.db=charDb;this.echoDb=echoDb;this.echoes=echoes;this.characters=characters;
      this.samples=samples||1500;this.cache=new Map();
    }
    /* ---------- 확률 ---------- */
    rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
    hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
    // 단계별 공시 확률 [{v, p}]
    tierOdds(key){const tiers=this.echoDb.subTiers(key)||[],weights=this.echoDb.subOdds(key)||tiers.map(()=>1),sum=weights.reduce((a,b)=>a+b,0);
      return tiers.map((v,i)=>({v,p:weights[i]/sum}))}
    pickTier(key,random){const odds=this.tierOdds(key);let x=random();for(const t of odds){x-=t.p;if(x<0)return t.v}return odds[odds.length-1].v}
    // 새 에코 부옵: 남은 종류 중 균등하게 하나씩(중복 없음), 수치는 단계별 공시 확률
    rollSubs(random,count=5){const pool=this.echoDb.subKeys().slice(),out=[];
      for(let n=0;n<count&&pool.length;n++){const k=pool.splice(Math.floor(random()*pool.length),1)[0];out.push({k,v:this.pickTier(k,random)})}return out}
    // 같은 코스트·주옵의 새 에코 (주옵은 25레벨 최대치)
    freshEcho(echo,subs){const main=(this.echoDb.mainStats(echo.cost)||{}).main||{},v=main[echo.main.k];
      const out=Object.assign({},echo,{lv:25,subs,main:Object.assign({},echo.main,v!=null?{v}:{})});delete out.fixed;return out}
    /* ---------- 대상 ---------- */
    hasEchoes(id){return (this.echoes.slot(id).echoes||[]).some(e=>e&&e.main)}
    // 계산할 모드 목록: 모드 공명자는 에코를 입력한 모드 전부, 그 밖은 [null]
    modesOf(id){if(!this.db.hasModes(id))return [null];return this.db.modes(id).map(m=>m.i).filter(i=>this.db.withModes({[id]:i},()=>this.hasEchoes(id)))}
    inMode(id,mode,fn){return mode==null?fn():this.db.withModes({[id]:mode},fn)}
    // 계산 중에만 에코 한 칸을 바꿔 끼운다 (저장 데이터는 바로 되돌린다)
    withEcho(id,index,echo,fn){const list=this.echoes.slot(id).echoes,old=list[index];list[index]=echo;try{return fn()}finally{list[index]=old}}
    /* ---------- 공명자 한 명 ---------- */
    // 에코 한 칸의 효율 (지금 모드 기준)
    slotEff(id,index){const list=this.echoes.slot(id).echoes||[],cur=list[index];if(!cur||!cur.main)return null;
      const base=this.characters.score(id),erBefore=this.echoes.erOk(id),random=this.rng(this.hash(`${id}|${this.db.modeOf(id)}|${index}`));
      let hits=0,sum=0;
      for(let s=0;s<this.samples;s++){const echo=this.freshEcho(cur,this.rollSubs(random));
        // 공명 효율은 점수가 오른 경우에만, 지금 최소치를 채우고 있을 때만 확인한다
        const d=this.withEcho(id,index,echo,()=>{const score=this.characters.score(id),d=base>0?(score/base-1)*100:0;return d>1e-9&&(!erBefore||this.echoes.erOk(id))?d:0});
        if(d>0){hits++;sum+=d}}
      const p=hits/this.samples,gain=hits?sum/hits:0;
      return {index,cost:cur.cost,main:cur.main.k,set:(this.echoes.echoesOf(id)[list.slice(0,index).filter(e=>e&&e.main).length]||{}).set||null,
        p,gain,eff:p*gain,tries:p>0?1/p:null}}
    /* 결과 캐시: 공명자·모드마다 따로 둔다. 그 공명자의 입력(서명)이 바뀐 것만 다시 계산한다.
       개인 점수는 그 공명자 자신의 육성 데이터(공통: 레벨·체인·무기·체험 세팅 / 모드별: 에코·세트·스탯 직접 입력)로만 정해진다.
       예외: 서포터 협주력은 정석 파트너의 메커니즘을 보므로, 파트너가 모드 공명자면 파트너가 보고 있는 모드도 서명에 넣는다 */
    inputSig(id,mode){const growth=this.state().growth[id]||{},{alt,echoes,echoSet,stats,...common}=growth;
      const own=mode>0?((alt||{})[mode]||{}):{echoes,echoSet,stats},sig=[common,own,this.samples];
      if(this.characters.isSupport(id)){const partner=this.characters.supports.partner(id);if(partner&&this.db.hasModes(partner))sig.push(partner,this.db.viewMode(partner))}
      return JSON.stringify(sig)}
    cached(id,mode,make){const key=`${id}|${mode}`,sig=this.inputSig(id,mode),hit=this.cache.get(key);if(hit&&hit.sig===sig)return hit.result;
      const result=make();this.cache.set(key,{sig,result});return result}
    /* 공명자 한 명, 한 모드의 결과 {id, mode, skip, score, erOk, slots:[칸별 결과], eff(칸 중 최고)}
       mode를 안 주면 모드 공명자는 지금 보고 있는 모드 */
    forChar(id,mode){if(mode==null&&this.db.hasModes(id))mode=this.db.viewMode(id);if(!this.db.hasModes(id))mode=null;
      return this.cached(id,mode,()=>this.inMode(id,mode,()=>this.computeChar(id,mode)))}
    computeChar(id,mode){const growth=this.state().growth[id]||{};
      const skip=!this.charMap()[id]?"unknown":growth.trial?"trial":!this.hasEchoes(id)?"noEcho":null;
      if(skip)return {id,mode,skip,slots:[],eff:0};
      const slots=(this.echoes.slot(id).echoes||[]).map((e,i)=>this.slotEff(id,i)).filter(Boolean);
      return {id,mode,skip:null,score:this.characters.score(id),erOk:this.echoes.erOk(id),slots,eff:Math.max(0,...slots.map(r=>r.eff))}}
    // 에코를 입력한 모드 전부 (모드 공명자가 아니면 1개)
    forCharAll(id){const modes=(this.state().growth[id]||{}).trial?[]:this.modesOf(id);return modes.length?modes.map(m=>this.forChar(id,m)):[this.forChar(id)]}
    /* ---------- 전체 ---------- */
    // scope: "owned"(보유 공명자) | "team"(편성된 공명자, 대상만 고르고 계산에는 파티를 쓰지 않는다)
    // 칸 단위 행을 합쳐 개인 점수 기대 상승(eff) 순으로 정렬한다
    table({scope="owned",ids}={}){const state=this.state();
      const list=(ids||(scope==="team"?[...new Set(state.teams.flatMap(t=>t.slots.filter(Boolean)))]:Object.keys(state.owned||{}).filter(id=>state.owned[id]))).filter(id=>this.charMap()[id]);
      const chars=list.flatMap(id=>this.forCharAll(id));
      const rows=chars.flatMap(c=>c.slots.map(s=>Object.assign({id:c.id,mode:c.mode,erOk:c.erOk},s))).sort((a,b)=>b.eff-a.eff);
      return {chars:chars.filter(c=>!c.skip),rows,skipped:chars.filter(c=>c.skip).map(c=>({id:c.id,skip:c.skip}))}}
  }
  g.MP.SpecUpManager=SpecUpManager;
})(typeof window!=="undefined"?window:globalThis);
