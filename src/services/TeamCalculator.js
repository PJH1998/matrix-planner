(function(g){
  /* 파티 강도는 역할별 캐릭터 강도에 반주·에코 세트·서포터 증폭·메커니즘 시너지를 합산한다.
     반주는 두 교대 방향 중 실제 이득이 큰 쪽을 선택한다. 보스 피해는 상위권 실측 회귀식
     (강도 / 37.8)^1.07을 사용하며 숙련도와 속성 저항을 별도로 반영한다. */
  class TeamCalculator{
    constructor({state,charMap,cycle,charDb,bossDb,echoDb,characters,echoes,condWeight,selectedBuff,damageLabels,mechanicLabels,elementLabels,anomalies}){
      this.state=state;this.charMap=charMap;this.cycle=cycle;this.db=charDb;this.bossDb=bossDb;this.echoDb=echoDb;this.characters=characters;this.echoes=echoes;
      this.condWeight=condWeight;this.selectedBuff=selectedBuff;this.damageLabels=damageLabels;this.mechanicLabels=mechanicLabels;this.elementLabels=elementLabels;this.anomalies=anomalies;
      this.atkBase=2;this.strengthRef=37.8;this.damageExp=1.07;this.maxRounds=bossDb.MAX_ROUNDS;
      this.skillLevels={top:{label:"숙련",mul:1},good:{label:"보통",mul:.8},normal:{label:"뉴비",mul:.65}};this.cache=new Map();
    }
    synOf(id){return this.db.syn(id)}
    typeShare(id,key){return this.db.typeShare(id,key)}
    hasMechanic(id,mechanics){return this.db.has(id,mechanics)}
    outroValues(giver,ids,receiver){const outro=this.db.outro(giver);if(!outro)return null;if(!outro.cond)return outro.v;
      if(outro.cond.to)return receiver&&this.hasMechanic(receiver,outro.cond.m)&&ids.filter(id=>this.hasMechanic(id,outro.cond.m)).length>=2?outro.cond.v:outro.v;
      return ids.some(id=>id!==giver&&this.hasMechanic(id,outro.cond.m))?outro.cond.v:outro.v}
    outroGain(giver,receiver,ids){const values=this.outroValues(giver,ids,receiver);if(!values)return 0;const cg=this.charMap()[giver],cr=this.charMap()[receiver];let gain=0;
      Object.entries(values).forEach(([key,value])=>{if(key==="all")gain+=value;else if(key==="el"){if(cg.el===cr.el)gain+=value/this.characters.bonusBase}else gain+=value*this.typeShare(receiver,key)/this.characters.bonusBase});return gain/100}
    usesAmp(id){const c=this.charMap()[id];return c&&c.role==="support"&&this.db.hasAmp(id)}
    outroMap(ids,main,weightOf){const run=order=>{const gain={},from={},links=[];ids.forEach(id=>{gain[id]=0;from[id]=0});let value=0;
        ids.forEach(giver=>{if(this.usesAmp(giver)||!this.outroValues(giver,ids))return;
          const add=(receiver,party)=>{const amount=this.outroGain(giver,receiver,ids);if(amount<=0)return;gain[receiver]+=amount;if(receiver!==giver)from[receiver]+=amount;value+=this.characters.score(receiver)*weightOf(receiver)*amount;links.push({from:giver,to:receiver,e:amount,party})};
          if(this.synOf(giver).p)ids.forEach(receiver=>add(receiver,1));else if(order.length>1)add(order[(order.indexOf(giver)+1)%order.length],0)});return {gain,from,links,val:value}};
      const a=run(ids),b=ids.length>2?run([ids[0],ids[2],ids[1]]):a;return a.val>=b.val?a:b}
    circuitMul(team,id){const buff=this.selectedBuff(team);if(!buff)return {mul:1,hits:[]};let add=0;const hits=[];
      (buff.effects||[]).forEach(effect=>{const value=+effect.dmg||0,weight=value?this.condWeight(effect.cond,team,id):0;if(weight>0){add+=value*weight;hits.push(effect.text+(weight<1?` (${Math.round(weight*100)}% 적용)`:""))}});return {mul:1+add/100,hits}}
    setFxGain(effect,id){const c=this.charMap()[id];if(!c)return 0;const value=effect.v/100;
      if(effect.k==="atk%")return value/this.atkBase;if(effect.k==="el")return effect.elem&&effect.elem!==c.el?0:value/this.characters.bonusBase;if(effect.k==="all")return value/this.characters.bonusBase;
      if(this.echoDb.DMG_TYPES.includes(effect.k))return value*this.typeShare(id,effect.k)/this.characters.bonusBase;return 0}
    mainDps(team){const ids=team.slots.filter(Boolean);if(!ids.length)return null;const by=list=>list.slice().sort((a,b)=>this.characters.score(b)-this.characters.score(a))[0],map=this.charMap();
      const dps=by(ids.filter(id=>map[id]&&map[id].role==="dps")),sub=by(ids.filter(id=>map[id]&&map[id].role==="sub"));
      if(dps&&sub&&this.characters.score(sub)>this.characters.score(dps)*this.characters.mainSubRatio)return sub;return dps||sub||by(ids)}
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
    teamCalc(team){const ids=team.slots.filter(Boolean),result={base:0,circuit:0,amp:0,syn:0,total:0,main:null,gain:{},links:[],weak:[],needs:[],supx:[],setx:[]};if(!ids.length)return result;
      const main=this.mainDps(team),map=this.charMap();result.main=main;const weightOf=id=>id===main?this.characters.roleWeight.main:(this.characters.roleWeight[map[id].role]||.5),outro=this.outroMap(ids,main,weightOf);result.gain=outro.gain;result.links=outro.links;
      ids.forEach(giver=>{const condition=this.db.supCond(giver);if(!condition||!this.usesAmp(giver))return;ids.forEach(receiver=>{if(receiver===giver||map[receiver].role==="support")return;const value=condition(receiver,ids,main,this.characters.supportContext());if(value.a>0){outro.gain[receiver]+=value.a;result.supx.push({from:giver,to:receiver,e:value.a,t:value.t})}})});
      ids.forEach(giver=>{const echoes=this.echoes.echoesOf(giver);if(!echoes.length)return;const context=this.echoes.context(giver),receivers=to=>to==="party"?ids.filter(id=>id!==giver):[giver===main?ids[(ids.indexOf(giver)+1)%ids.length]:main].filter(id=>id&&id!==giver);
        const add=(list,sign)=>list.forEach(effect=>receivers(effect.to).forEach(receiver=>{const amount=sign*this.setFxGain(effect,receiver);if(!amount)return;outro.gain[receiver]+=amount;
          const line=result.setx.find(x=>x.from===giver&&x.to===receiver);if(line){line.e+=amount;if(sign>0&&!line.t.includes(effect.set))line.t.push(effect.set)}else result.setx.push({from:giver,to:receiver,e:amount,t:sign>0?[effect.set]:[]})}));
        add(this.echoDb.teamFx(echoes,context),1);add(this.echoDb.refTeamFx(this.echoDb.refCounts(giver),context),-1)});
      const noSupport=!ids.some(id=>map[id].role==="support");let damage=0,circuitDamage=0;
      ids.forEach(id=>{let weight=weightOf(id);const ampIn=ids.filter(x=>x!==id&&map[x].role!=="support").reduce((sum,x)=>sum+this.characters.amp(x),0)/100;
        if(noSupport&&ids.length===3&&outro.from[id]+ampIn<this.characters.noSynergyMin){weight*=this.characters.noSynergyWeight;result.weak.push(id)}
        const need=this.db.needs(id);if(need&&!ids.some(x=>x!==id&&(this.synOf(x).m||[]).includes(need.m))){weight*=need.mul;result.needs.push(id)}
        const value=this.characters.score(id)*weight*(1+outro.gain[id]);damage+=value;circuitDamage+=value*this.circuitMul(team,id).mul});
      result.amp=ids.filter(id=>id!==main).reduce((sum,id)=>sum+(this.usesAmp(id)?this.characters.amp(id):(map[id].role==="support"?0:this.characters.amp(id))),0);
      const synergy=this.teamSynergy(team),seen=new Set();let syn=0;synergy.links.forEach(link=>{if(link.k==="mech"&&!seen.has(link.tag)){seen.add(link.tag);syn+=this.characters.synergyBonus.mech}});
      syn+=synergy.combos.length*this.characters.synergyBonus.combo;result.syn=Math.min(this.characters.synergyBonus.cap,syn);const multiplier=(1+result.amp/100)*(1+result.syn/100);
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
