(function(g){
  /* 딜러(메인·서브) 개인 강도.
     개인 강도 = 무기 성능 × 실측 DPS 상대 배율 × 스탯(또는 레벨) × 체인 배율 × 주기 보정.
     메인·서브 딜러는 같은 DPS 평균을 기준으로 삼는다. 상수는 CharacterCalculator(config)에 있다. */
  class DealerCalculator{
    constructor({state,chars,charMap,cycle,charDb,weapons,echoes,config}){
      this.state=state;this.chars=chars;this.charMap=charMap;this.cycle=cycle;this.db=charDb;this.weapons=weapons;this.echoes=echoes;this.config=config;this.dpsAverage={};
    }
    clamp(v,a,b){return Math.max(a,Math.min(b,isFinite(v)?v:a))}
    reset(){this.dpsAverage={}}
    dpsFactor(id){const c=this.charMap()[id];if(!c)return 1;const value=this.db.baseDps(id);if(!value)return 1;
      if(this.dpsAverage.all==null){const xs=this.chars().filter(x=>x.role!=="support").map(x=>this.db.baseDps(x.id)).filter(Boolean);this.dpsAverage.all=xs.reduce((a,b)=>a+b,0)/(xs.length||1)}
      return this.clamp(Math.pow(value/this.dpsAverage.all,.75),.4,2)}
    chainMul(id){const c=this.charMap()[id],chain=this.clamp(Math.round(+((this.state().growth[id]||{}).chain)||0),0,6),table=this.db.chain(id)||this.config.chain[c&&c.role]||this.config.chain.sub;return table[chain]||1}
    // 역할과 관계없이 쓰는 기존 개인 강도식. 서포터는 SupportCalculator가 이 값을 빌려 쓴다.
    score(id){const c=this.charMap()[id];if(!c)return 0;const growth=this.state().growth[id]||{},trial=!!growth.trial,level=trial?90:this.clamp(+growth.lv||90,1,90),hasDps=this.db.hasDps(id),weapon=this.weapons.weaponOf(id),stats=trial?null:this.echoes.statFactor(id);let score=hasDps?10:(c.rar===5?10:6);
      if(weapon.pct!=null)score=(score+4)*(stats&&weapon.w?this.clamp(weapon.pct/100/this.echoes.weaponStatRatio(id,weapon.w.id),.5,1.3):weapon.pct/100);else score+=4;
      score*=this.dpsFactor(id);score*=stats?stats.f:.5+.5*(level/90);score*=c.role==="support"&&!this.db.hasChainData(id)?1:this.chainMul(id);if(trial)score*=this.weapons.trialMul;
      const erAtk=this.db.combatErAtk(id);if(erAtk&&(this.echoes.echoesOf(id).length||growth.stats)){
        const sheet=this.echoes.sheetStats(id),gain=er=>Math.min(erAtk.cap,Math.max(0,er-erAtk.start)*erAtk.per),base=sheet.atk||this.db.guide(id)?.atk||2000;
        score*=1+this.db.share(id,"basic")*((base+gain(sheet.er))/(base+gain(erAtk.ref))-1)}
      const bonus=(this.cycle().dmgBonus||{})[id];if(bonus)score*=1+bonus/100;return score}
  }
  g.MP.DealerCalculator=DealerCalculator;
})(typeof window!=="undefined"?window:globalThis);
