(function(g){
  /* 서포터 계산: 파티 딜증(amp), 조건부 보정(supCond)용 컨텍스트, 파티원에게 주는 버프
     (서포터 조건부 보정 · 에코 세트 파티 효과 · 무기 파티 버프). 상수는 CharacterCalculator(config)에 있다. */
  class SupportCalculator{
    constructor({state,charMap,charDb,echoDb,weapons,echoes,dealers,config}){
      this.state=state;this.charMap=charMap;this.db=charDb;this.echoDb=echoDb;this.weapons=weapons;this.echoes=echoes;this.dealers=dealers;this.config=config;this.atkBase=2;
    }
    score(id){return this.dealers.score(id)}
    amp(id){return this.charMap()[id]?this.db.amp(id):0}
    usesAmp(id){const c=this.charMap()[id];return c&&c.role==="support"&&this.db.hasAmp(id)}
    supportContext(){return {el:id=>(this.charMap()[id]||{}).el,has:(id,ms)=>this.db.has(id,ms),share:(id,k)=>this.db.share(id,k),stat:(id,k)=>{const growth=this.state().growth[id]||{};
        if(k==="er"&&growth.stats?.er==null&&!this.echoes.echoesOf(id).length)return this.db.guide(id)?.er||this.db.erMin(id).min;
        return this.echoes.sheetStats(id)[k]||0},
      chain:id=>+((this.state().growth[id]||{}).chain)||0,combatCrit:id=>{const growth=this.state().growth[id]||{},sheet=this.echoes.sheetStats(id),guide=this.db.guide(id)||{};
        const echoes=this.echoes.echoesOf(id).length;
        return {cr:echoes||growth.stats?.cr!=null?sheet.cr:(guide.cr||70),cd:echoes||growth.stats?.cd!=null?sheet.cd:(guide.cd||250)}},BONUS_BASE:this.config.bonusBase,ATK_BASE:this.atkBase}}
    setFxGain(effect,id){const c=this.charMap()[id];if(!c)return 0;const value=effect.v/100;
      if(effect.k==="atk%")return value/this.atkBase;if(effect.k==="el")return effect.elem&&effect.elem!==c.el?0:value/this.config.bonusBase;if(effect.k==="all")return value/this.config.bonusBase;
      if(this.echoDb.DMG_TYPES.includes(effect.k))return value*this.db.typeShare(id,effect.k)/this.config.bonusBase;return 0}
    /* 파티원에게 주는 버프를 gain[받는 공명자]에 더하고, 화면용 내역을 result.supx · setx · weaponx에 남긴다. */
    teamBuffs(ids,main,gain,result){const map=this.charMap();
      ids.forEach(giver=>{const condition=this.db.supCond(giver);if(!condition||!this.usesAmp(giver))return;ids.forEach(receiver=>{if(receiver===giver||map[receiver].role==="support")return;const value=condition(receiver,ids,main,this.supportContext());if(value.a>0){gain[receiver]+=value.a;result.supx.push({from:giver,to:receiver,e:value.a,t:value.t})}})});
      ids.forEach(giver=>{const echoes=this.echoes.echoesOf(giver);if(!echoes.length)return;const context=this.echoes.context(giver),receivers=to=>to==="party"?ids.filter(id=>id!==giver):[giver===main?ids[(ids.indexOf(giver)+1)%ids.length]:main].filter(id=>id&&id!==giver);
        const add=(list,sign)=>list.forEach(effect=>receivers(effect.to).forEach(receiver=>{const amount=sign*this.setFxGain(effect,receiver);if(!amount)return;gain[receiver]+=amount;
          const line=result.setx.find(x=>x.from===giver&&x.to===receiver);if(line){line.e+=amount;if(sign>0&&!line.t.includes(effect.set))line.t.push(effect.set)}else result.setx.push({from:giver,to:receiver,e:amount,t:sign>0?[effect.set]:[]})}));
        add(this.echoDb.teamFx(echoes,context),1);add(this.echoDb.refTeamFx(this.echoDb.refCounts(giver),context),-1)});
      ids.forEach(giver=>{const weapon=this.weapons.weaponOf(giver).w?.id;
        // 지원 무기의 명시된 팀 버프만 반영한다(공명자 파일의 teamWeaponBuff). 장착자의 스킬로 회복해야 발동하는 교향곡은 해당 공명자 파일에만 적는다.
        const buffs=weapon?this.db.teamWeaponBuff(giver,weapon):null;if(!buffs)return;
        ids.forEach(receiver=>{let amount=0;
          buffs.forEach(buff=>{if(buff.has&&!this.db.has(receiver,buff.has))return;
            if(buff.atk)amount+=buff.atk/100/this.atkBase;
            if(buff.cd){const crit=this.supportContext().combatCrit(receiver),cr=Math.min(100,Math.max(0,crit.cr))/100;
              amount+=(cr*buff.cd/100)/(1+cr*(crit.cd/100-1))}
            if(buff.echo)amount+=buff.echo/100*this.db.typeShare(receiver,"echo")/this.config.bonusBase});
          gain[receiver]+=amount;result.weaponx.push({from:giver,to:receiver,e:amount,weapon})})});}
  }
  g.MP.SupportCalculator=SupportCalculator;
})(typeof window!=="undefined"?window:globalThis);
