(function(g){
  /* 파티 강도 = Σ(딜러 한 바퀴 피해 × (1 + 받는 버프)) ÷ (Σ 딜러 한 바퀴 시간 + 서포터 1명당 7초)
                × (1 + 파티 딜증) × (1 + 메커니즘·조합 시너지) × strengthScale
     딜러는 1:1로 더한다(서브 딜러도 자기 로테이션을 다 한다고 본다). 메인 = 개인 피해가 가장 큰 딜러(버프 대상·표시용).
     반주는 두 교대 방향 중 실제 이득이 큰 쪽을 선택한다. strengthScale은 예전 강도 눈금(보스 회귀식)에 맞춘 상수다(공식 가이드 스탯 기준 중앙값을 맞춤, scripts/compare-strength.mjs).
     보스 피해는 상위권 실측 회귀식 (강도 / 37.8)^1.07을 사용하며 숙련도와 속성 저항을 별도로 반영한다. */
  class TeamCalculator{
    constructor({state,charMap,cycle,charDb,bossDb,echoDb,characters,echoes,condWeight,selectedBuff,damageLabels,mechanicLabels,elementLabels,anomalies}){
      this.state=state;this.charMap=charMap;this.cycle=cycle;this.db=charDb;this.bossDb=bossDb;this.echoDb=echoDb;this.characters=characters;this.echoes=echoes;
      this.condWeight=condWeight;this.selectedBuff=selectedBuff;this.damageLabels=damageLabels;this.mechanicLabels=mechanicLabels;this.elementLabels=elementLabels;this.anomalies=anomalies;
      this.atkBase=2;this.strengthScale=.00061;this.strengthRef=37.8;this.damageExp=1.07;this.maxRounds=bossDb.MAX_ROUNDS;
      this.skillLevels={top:{label:"숙련",mul:1},good:{label:"보통",mul:.8},normal:{label:"뉴비",mul:.65}};this.cache=new Map();
    }
    synOf(id){return this.db.syn(id)}
    typeShare(id,key){return this.db.typeShare(id,key)}
    hasMechanic(id,mechanics){return this.db.has(id,mechanics)}
        outroValues(giver,ids,receiver){return this.characters.supports.outroValues(giver,ids,receiver)}
    outroGain(giver,receiver,ids){return this.characters.supports.outroGain(giver,receiver,ids)}
    usesAmp(id){return this.characters.supports.usesAmp(id)}
    outroMap(ids,main){const run=order=>{const gain={},from={},links=[];ids.forEach(id=>{gain[id]=0;from[id]=0});let value=0;
        ids.forEach(giver=>{if(this.usesAmp(giver)||!this.outroValues(giver,ids))return;
          const add=(receiver,party)=>{const amount=this.outroGain(giver,receiver,ids);if(amount<=0)return;gain[receiver]+=amount;if(receiver!==giver)from[receiver]+=amount;value+=this.characters.damage(receiver)*amount;links.push({from:giver,to:receiver,e:amount,party})};
          if(this.synOf(giver).p)ids.forEach(receiver=>add(receiver,1));else if(order.length>1)add(order[(order.indexOf(giver)+1)%order.length],0)});return {gain,from,links,val:value}};
      const a=run(ids),b=ids.length>2?run([ids[0],ids[2],ids[1]]):a;return a.val>=b.val?a:b}
    circuitMul(team,id){const buff=this.selectedBuff(team);if(!buff)return {mul:1,hits:[]};let add=0;const hits=[];
      (buff.effects||[]).forEach(effect=>{const value=+effect.dmg||0,weight=value?this.condWeight(effect.cond,team,id):0;if(weight>0){add+=value*weight;hits.push(effect.text+(weight<1?` (${Math.round(weight*100)}% 적용)`:""))}});return {mul:1+add/100,hits}}
    setFxGain(effect,id){return this.characters.supports.setFxGain(effect,id)}
    // 메인 = 파티 딜러 중 개인 피해가 가장 큰 공명자 (딜러가 없으면 첫 공명자)
    mainDps(team){const ids=team.slots.filter(Boolean);if(!ids.length)return null;const map=this.charMap(),dealers=ids.filter(id=>map[id]&&map[id].role!=="support");
      return dealers.length?dealers.slice().sort((a,b)=>this.characters.damage(b)-this.characters.damage(a))[0]:ids[0]}
    pairLinks(a,b){const out=[],sa=this.synOf(a),sb=this.synOf(b),ca=this.charMap()[a],cb=this.charMap()[b];if(!ca||!cb)return out;
      const outro=(from,to,source,target,cf,ct)=>{const hit=(source.ob||[]).filter(type=>(target.w||[]).includes(type)).map(type=>this.damageLabels[type]);
        if((source.ob||[]).includes("el")&&cf.el===ct.el&&(target.w||[]).length)hit.unshift(this.elementLabels[ct.el]+" 피해");
        if(hit.length)out.push({k:"outro",from,to,n:hit.length,txt:`${cf.name} → ${ct.name} · ${hit.join("·")}`})};
      outro(a,b,sa,sb,ca,cb);outro(b,a,sb,sa,cb,ca);const ma=sa.m||[],mb=sb.m||[],shared=ma.filter(type=>mb.includes(type));
      if(ma.includes("anom")&&!mb.includes("anom"))shared.push(...mb.filter(type=>this.anomalies.includes(type)));
      if(mb.includes("anom")&&!ma.includes("anom"))shared.push(...ma.filter(type=>this.anomalies.includes(type)));
      const needsCoord=id=>((this.db.needs(id)||{}).m)==="coord";
      [...new Set(shared)].filter(type=>type!=="coord"||needsCoord(a)||needsCoord(b)).forEach(type=>out.push({k:"mech",tag:type,txt:this.mechanicLabels[type]}));return out}
    teamSynergy(team){const ids=team.slots.filter(Boolean),adj=[false,false,false];let links=[];
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=team.slots[i],b=team.slots[j];if(a&&b)links.push(...this.pairLinks(a,b).map(link=>({...link,i,j})))}
      const best={};links.filter(link=>link.k==="outro"&&!this.synOf(link.from).p).forEach(link=>{const old=best[link.from],rank=x=>x.n*10+(this.charMap()[x.to].role==="dps"?1:0);if(!old||rank(link)>rank(old))best[link.from]=link});
      links=links.filter(link=>link.k!=="outro"||this.synOf(link.from).p||best[link.from]===link);links.forEach(link=>{if(link.j===link.i+1)adj[link.j]=true;else adj.wrap=true});
      return {links,adj,combos:this.db.combos().filter(combo=>combo.ids.every(id=>ids.includes(id)))}}
    teamCalc(team){const ids=team.slots.filter(Boolean),result={base:0,circuit:0,amp:0,syn:0,total:0,main:null,gain:{},links:[],weak:[],needs:[],supx:[],setx:[],weaponx:[],parts:[],time:0};if(!ids.length)return result;
      const main=this.mainDps(team),map=this.charMap();result.main=main;const outro=this.outroMap(ids,main);result.gain=outro.gain;result.links=outro.links;
      this.characters.supports.teamBuffs(ids,main,outro.gain,result);
      const noSupport=!ids.some(id=>map[id].role==="support");let damage=0,circuitDamage=0,time=0;
      ids.forEach(id=>{let weight=1;const support=map[id].role==="support",ampIn=ids.filter(x=>x!==id&&map[x].role!=="support").reduce((sum,x)=>sum+this.characters.amp(x),0)/100;
        if(noSupport&&ids.length===3&&outro.from[id]+ampIn<this.characters.noSynergyMin){weight*=this.characters.noSynergyWeight;result.weak.push(id)}
        const need=this.db.needs(id);if(need&&!ids.some(x=>x!==id&&(this.synOf(x).m||[]).includes(need.m))){weight*=need.mul;result.needs.push(id)}
        time+=this.characters.rot(id);if(support)return;
        const personal=this.characters.damage(id),value=personal*weight*(1+outro.gain[id]);damage+=value;circuitDamage+=value*this.circuitMul(team,id).mul;result.parts.push({id,dmg:personal,rot:this.characters.rot(id),value})});
      result.time=time;
      result.amp=ids.filter(id=>id!==main).reduce((sum,id)=>sum+this.characters.amp(id),0);
      const synergy=this.teamSynergy(team),seen=new Set();let syn=0;synergy.links.forEach(link=>{if(link.k==="mech"&&!seen.has(link.tag)){seen.add(link.tag);syn+=this.characters.synergyBonus.mech}});
      syn+=synergy.combos.length*this.characters.synergyBonus.combo;result.syn=Math.min(this.characters.synergyBonus.cap,syn);const multiplier=(1+result.amp/100)*(1+result.syn/100)*(time>0?this.strengthScale/time:0);
      result.base=damage*multiplier;result.total=circuitDamage*multiplier;result.circuit=result.total-result.base;return result}
    teamBase(team){return (this.cache.get(team)||this.teamCalc(team)).base}
    teamScore(team){return (this.cache.get(team)||this.teamCalc(team)).total}
    skillMul(){return (this.skillLevels[this.state().skill]||this.skillLevels.top).mul}
    partyDamage(score){return Math.pow(Math.max(0,score)/this.strengthRef,this.damageExp)*this.skillMul()}
    simulate(teams){const bosses=this.bossDb.bosses(),live=teams.filter(team=>team.slots.some(Boolean)),res=teams.map(()=>({hits:[]}));if(!bosses.length||!live.length)return {progress:0,res,bad:0};
      const bossHp=this.bossDb.hp;let bossIndex=0,round=1,hp=bossHp(bosses[0],1),progress=0,bad=0;
      teams.forEach((team,teamIndex)=>{if(!team.slots.some(Boolean))return;const main=this.mainDps(team),element=main&&this.charMap()[main].el;let damage=this.partyDamage(this.teamScore(team));
        while(damage>1e-9&&round<=this.maxRounds){const boss=bosses[bossIndex],resistance=this.bossDb.resMul(boss,element);if(!res[teamIndex].hits.length&&resistance<1)bad++;
          const maxHp=bossHp(boss,round),hit={name:boss.name,round,resisted:resistance<1,from:hp/maxHp*100,left:0,pts:0};res[teamIndex].hits.push(hit);const points=dealt=>this.bossDb.points(dealt,boss,round);
          if(damage*resistance>=hp){damage-=hp/resistance;progress+=hp/maxHp;hit.pts=points(hp)+this.bossDb.killBonus(boss);bossIndex++;if(bossIndex>=bosses.length){bossIndex=0;round++}hp=bossHp(bosses[bossIndex],round)}
          else{hp-=damage*resistance;progress+=damage*resistance/maxHp;hit.pts=points(damage*resistance);hit.left=hp/maxHp*100;damage=0}}});
      res.forEach(result=>result.pts=result.hits.reduce((sum,hit)=>sum+hit.pts,0));return {progress,res,bad,total:res.reduce((sum,result)=>sum+result.pts,0)}}
    permutations(values){if(values.length<=1)return [values];const out=[];values.forEach((value,index)=>this.permutations(values.slice(0,index).concat(values.slice(index+1))).forEach(row=>out.push([value].concat(row))));return out}
    bestOrder(){this.cache.clear();this.state().teams.forEach(team=>this.cache.set(team,this.teamCalc(team)));try{return this.bestOrderInternal()}finally{this.cache.clear()}}
    bestOrderInternal(){const live=this.state().teams.filter(team=>team.slots.some(Boolean)),empty=this.state().teams.filter(team=>!team.slots.some(Boolean)),scores=new Map(live.map(team=>[team,this.teamScore(team)]));
      const value=order=>{const run=this.simulate(order);let inversions=0;for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++)if(scores.get(order[i])>scores.get(order[j])*1.05)inversions++;return run.progress-.15*run.bad-.03*inversions};
      let best=live.slice().sort((a,b)=>scores.get(a)-scores.get(b)),bestValue=value(best);
      if(live.length<=8)this.permutations(live).forEach(order=>{const v=value(order);if(v>bestValue){bestValue=v;best=order}});
      else{let improved=true;while(improved){improved=false;for(let i=0;i<best.length;i++)for(let j=i+1;j<best.length;j++){const order=best.slice();[order[i],order[j]]=[order[j],order[i]];const v=value(order);if(v>bestValue){bestValue=v;best=order;improved=true}}}}
      return best.concat(empty)}
  }
  g.MP.TeamCalculator=TeamCalculator;
})(typeof window!=="undefined"?window:globalThis);
