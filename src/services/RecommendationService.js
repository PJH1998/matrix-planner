(function(g){
  /* 자동 추천 우선순위: 고정 프리셋 → 정석 2인 코어 → 반주·궁합 코어 → 서포터 배분.
     마지막에는 파티 사이의 세 번째 멤버를 교환해 강화 효과를 포함한 강도의 제곱 합을 높인다.
     그다음 서브 딜러를 파티끼리 바꾸거나 남는 서브 딜러로 바꿔, 예상 피해(partyDamage) × 사용감의 합을 높인다(1.6.5).
       정석 파트너 둘이 같은 서브를 원할 때(카를로타·금희 → 절지) 강도가 높은 쪽이 먼저 가져가 다른 쪽이 약한 서브만 남는 것을 막는다.
     사용감(ease): 메인이 아닌 딜러가 게임 태그 「빠른 협주」(quick)가 아니면 × easeMul. 강도·점수에는 넣지 않고 추천에만 쓴다. */
  class RecommendationService{
    constructor({state,chars,charMap,cycle,charDb,characters,teams,vigorOf,bestBuffs}){
      this.state=state;this.chars=chars;this.charMap=charMap;this.cycle=cycle;this.db=charDb;this.characters=characters;this.teams=teams;this.vigorOf=vigorOf;this.bestBuffs=bestBuffs;
      this.presets=charDb.presets();this.minPoints=charDb.minPoints();this.easeMul=.9;
    }
    // 사용감: 메인이 아닌 딜러 중 「빠른 협주」가 아닌 공명자마다 × easeMul (오래 필드에 있어야 하는 서브는 교대가 번거롭다)
    ease(ids){const map=this.charMap(),main=this.teams.mainDps({slots:ids.slice()});
      return ids.filter(id=>id&&id!==main&&map[id]&&map[id].role!=="support"&&!(this.db.quick&&this.db.quick(id))).reduce(v=>v*this.easeMul,1)}
    affinity(main,ids){return ids.filter(id=>id!==main).reduce((sum,id)=>sum+(this.db.pairW(main,id)||this.db.pairW(id,main)*.5),0)}
    recommend(){const state=this.state(),chars=this.chars(),map=this.charMap(),own=chars.filter(c=>state.owned[c.id]).map(c=>c.id),key=id=>id.startsWith("rover_")?"rover":id,left={};
      own.forEach(id=>{const k=key(id);left[k]=k==="rover"?1:Math.max(left[k]||0,this.vigorOf(id))});
      const can=id=>left[key(id)]>0,use=id=>{left[key(id)]--},okIds=ids=>new Set(ids.map(key)).size===ids.length,val=ids=>this.teams.teamCalc({slots:ids.slice(),buff:null}).base;
      const role=id=>map[id].role,isSupport=id=>role(id)==="support",pairWeight=(a,b)=>this.db.pairW(a,b)||this.db.pairW(b,a)||0,done=[],cores=[];
      this.presets.forEach(ids=>{if(ids.every(id=>map[id]&&state.owned[id]&&can(id))&&okIds(ids)){ids.forEach(use);done.push(ids.slice())}});
      const mains=own.filter(id=>role(id)==="dps"),pairs=[];
      mains.forEach(main=>Object.entries(this.db.pairs(main)).forEach(([id,weight])=>{if(weight>=1&&state.owned[id]&&map[id]&&!isSupport(id)&&key(id)!==key(main))pairs.push({ids:[main,id],v:val([main,id])})}));
      pairs.sort((a,b)=>b.v-a.v).forEach(pair=>{if(pair.ids.every(can)){pair.ids.forEach(use);cores.push(pair.ids)}});
      const synergizes=(main,id)=>pairWeight(main,id)>0||this.teams.outroGain(id,main,[main,id])>=.05||this.teams.outroGain(main,id,[main,id])>=.05;
      mains.filter(can).sort((a,b)=>this.characters.damage(b)-this.characters.damage(a)).forEach(main=>{if(!can(main))return;
        const options=own.filter(id=>id!==main&&can(id)&&!isSupport(id)&&key(id)!==key(main)&&(role(id)!=="dps"||pairWeight(main,id)>0)&&synergizes(main,id))
          .map(id=>({id,score:val([main,id])*(1+.4*pairWeight(main,id))})).sort((a,b)=>b.score-a.score);
        if(options.length){use(main);use(options[0].id);cores.push([main,options[0].id])}});
      cores.sort((a,b)=>val(b)-val(a)).forEach(core=>{const supports=own.filter(id=>isSupport(id)&&can(id));if(!supports.length)return;
        const main=this.teams.mainDps({slots:core}),fav=supports.filter(id=>pairWeight(main,id)>0).sort((a,b)=>pairWeight(main,b)-pairWeight(main,a)||val([...core,b])-val([...core,a])),best=list=>list.sort((a,b)=>val([...core,b])-val([...core,a]))[0];
        const support=fav[0]||best(supports.filter(id=>map[id].rar===5))||best(supports);if(support){use(support);core.push(support)}});
      cores.filter(core=>core.length<3).forEach(core=>{const option=own.filter(id=>can(id)&&!core.map(key).includes(key(id))&&role(id)!=="dps").sort((a,b)=>val([...core,b])-val([...core,a]))[0];if(option){use(option);core.push(option)}});
      mains.filter(can).sort((a,b)=>this.characters.damage(b)-this.characters.damage(a)).forEach(main=>{if(!can(main))return;
        const support=own.filter(id=>isSupport(id)&&can(id)).sort((a,b)=>val([main,b])-val([main,a]))[0];if(!support)return;
        const option=own.filter(id=>can(id)&&id!==main&&id!==support&&key(id)!==key(main)&&role(id)!=="dps"&&!isSupport(id)&&synergizes(main,id)).sort((a,b)=>val([main,support,b])-val([main,support,a]))[0];
        if(!option)return;const ids=[main,option,support];if(okIds(ids)){ids.forEach(use);cores.push(ids)}});
      const teamValue=ids=>{const team={slots:ids.slice(),buff:null};return Math.max(this.teams.teamCalc(team).base,...(this.cycle().buffs||[]).map(buff=>this.teams.teamCalc({...team,buff:buff.id}).total))};
      const all=done.concat(cores).filter(ids=>ids.length===3),fixed=new Set(done),third=ids=>ids.findIndex(isSupport)>=0?ids.findIndex(isSupport):2,square=value=>value*value;
      for(let iteration=0,improved=true;improved&&iteration<4;iteration++){improved=false;
        for(let i=0;i<all.length;i++){if(fixed.has(all[i]))continue;
          for(let j=i+1;j<all.length;j++){if(fixed.has(all[j]))continue;const a=all[i],b=all[j],ai=third(a),bi=third(b);if(a[ai]===b[bi])continue;
            const nextA=a.slice(),nextB=b.slice();[nextA[ai],nextB[bi]]=[b[bi],a[ai]];if(!okIds(nextA)||!okIds(nextB))continue;
            if(square(teamValue(nextA))+square(teamValue(nextB))>square(teamValue(a))+square(teamValue(b))+1e-6){all[i]=nextA;all[j]=nextB;improved=true}}
          const a=all[i],ai=third(a);if(!isSupport(a[ai]))continue;
          own.filter(id=>isSupport(id)&&can(id)&&id!==a[ai]).forEach(id=>{const current=all[i],next=current.slice();next[third(current)]=id;if(okIds(next)&&teamValue(next)>teamValue(current)+1e-6){left[key(current[third(current)])]++;use(id);all[i]=next;improved=true}})}}
      // 서브 딜러 교환·교체: 예상 피해 × 사용감의 합이 늘 때만
      const worth=ids=>this.teams.partyDamage(teamValue(ids)*this.ease(ids),{slots:ids.slice(),buff:null}),
        subOf=ids=>{const main=this.teams.mainDps({slots:ids.slice()});return ids.findIndex(id=>id!==main&&!isSupport(id))},
        // 새로 들어가는 서브는 메인과 궁합·반주 시너지가 있어야 한다(메인 딜러끼리는 궁합 표에 있을 때만)
        subOk=(ids,id)=>{const main=this.teams.mainDps({slots:ids.slice()});return id===main||((role(id)!=="dps"||pairWeight(main,id)>0)&&synergizes(main,id))};
      for(let iteration=0,improved=true;improved&&iteration<4;iteration++){improved=false;
        for(let i=0;i<all.length;i++){if(fixed.has(all[i]))continue;
          // 파티 i의 서브를 파티 j에 주고, 파티 i는 j의 원래 서브 또는 남는 서브 중 가장 좋은 공명자를 받는다 (양쪽 순서 모두)
          for(let j=0;j<all.length;j++){if(j===i||fixed.has(all[j]))continue;const a=all[i],b=all[j],ai=subOf(a),bi=subOf(b);if(ai<0||bi<0)continue;
            const nextB=b.slice();nextB[bi]=a[ai];if(!okIds(nextB)||!subOk(nextB,a[ai]))continue;const mainA=this.teams.mainDps({slots:a.slice()});
            const pool=[b[bi],...own.filter(id=>can(id)&&!isSupport(id)&&key(id)!==key(mainA)&&synergizes(mainA,id))].filter((id,k,list)=>list.indexOf(id)===k);
            let bestA=null,bestValue=worth(a)+worth(b)+1e-6;pool.forEach(id=>{const nextA=a.slice();nextA[ai]=id;if(!okIds(nextA)||!subOk(nextA,id))return;const value=worth(nextA)+worth(nextB);if(value>bestValue){bestValue=value;bestA=nextA}});
            if(bestA){if(bestA[ai]!==b[bi]){left[key(b[bi])]++;use(bestA[ai])}all[i]=bestA;all[j]=nextB;improved=true}}
          const current=all[i],si=subOf(current);if(si<0)continue;const main=this.teams.mainDps({slots:current.slice()});
          own.filter(id=>can(id)&&!isSupport(id)&&key(id)!==key(main)&&!current.map(key).includes(key(id))&&synergizes(main,id)).forEach(id=>{const now=all[i],k=subOf(now);if(k<0)return;const next=now.slice();next[k]=id;
            if(okIds(next)&&subOk(next,id)&&worth(next)>worth(now)+1e-6){left[key(now[k])]++;use(id);all[i]=next;improved=true}})}}
      const arrange=ids=>{const damage=ids.filter(id=>!isSupport(id)),supports=ids.filter(isSupport),slots=[damage[0]||null,damage[1]||null,supports.length?null:(damage[2]||null)];supports.forEach(id=>{if(!slots[2])slots[2]=id;else slots[slots.indexOf(null)]=id});return slots};
      return all.map(ids=>{const team={slots:arrange(ids),buff:null,example:false},buffs=[...this.bestBuffs(team)];team.buff=buffs[0]||null;return team})}
  }
  g.MP.RecommendationService=RecommendationService;
})(typeof window!=="undefined"?window:globalThis);
