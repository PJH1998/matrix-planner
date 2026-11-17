(function(g){
  /* 캐릭터 강도 = 무기 성능 × 실측 DPS 상대 배율 × 스탯(또는 레벨) × 체인 배율 × 주기 보정.
     메인·서브 딜러는 같은 DPS 평균을 기준으로 삼아 서브 딜러가 과대평가되지 않게 한다. */
  class CharacterCalculator{
    constructor({state,chars,charMap,cycle,charDb,weapons,echoes}){
      this.state=state;this.chars=chars;this.charMap=charMap;this.cycle=cycle;this.db=charDb;this.weapons=weapons;this.echoes=echoes;
      this.chain={dps:[1,1.09,1.27,1.49,1.58,1.66,2.21],sub:[1,1.07,1.21,1.42,1.52,1.62,1.92],support:[1,1.03,1.06,1.1,1.13,1.16,1.2]};
      this.bonusBase=1.9;this.mainSubRatio=1.3;this.roleWeight={main:1,dps:.5,sub:.5,support:.2};this.noSynergyWeight=.75;this.noSynergyMin=.05;this.synergyBonus={mech:5,combo:5,cap:30};this.dpsAverage={};
    }
    clamp(v,a,b){return Math.max(a,Math.min(b,isFinite(v)?v:a))}
    reset(){this.dpsAverage={};this.weapons.reset()}
    dpsFactor(id){const c=this.charMap()[id];if(!c)return 1;const value=this.db.baseDps(id);if(!value)return 1;
      if(this.dpsAverage.all==null){const xs=this.chars().filter(x=>x.role!=="support").map(x=>this.db.baseDps(x.id)).filter(Boolean);this.dpsAverage.all=xs.reduce((a,b)=>a+b,0)/(xs.length||1)}
      return this.clamp(Math.pow(value/this.dpsAverage.all,.75),.4,2)}
    chainMul(id){const c=this.charMap()[id],chain=this.clamp(Math.round(+((this.state().growth[id]||{}).chain)||0),0,6),table=this.db.chain(id)||this.chain[c&&c.role]||this.chain.sub;return table[chain]||1}
    score(id){const c=this.charMap()[id];if(!c)return 0;const growth=this.state().growth[id]||{},trial=!!growth.trial,level=trial?90:this.clamp(+growth.lv||90,1,90),hasDps=this.db.hasDps(id),weapon=this.weapons.weaponOf(id),stats=trial?null:this.echoes.statFactor(id);let score=hasDps?10:(c.rar===5?10:6);
      if(weapon.pct!=null)score=(score+4)*(stats&&weapon.w?this.clamp(weapon.pct/100/this.echoes.weaponStatRatio(id,weapon.w.id),.5,1.3):weapon.pct/100);else score+=4;
      score*=this.dpsFactor(id);score*=stats?stats.f:.5+.5*(level/90);score*=c.role==="support"&&!this.db.hasChainData(id)?1:this.chainMul(id);if(trial)score*=this.weapons.trialMul;
      const erAtk=this.db.combatErAtk(id);if(erAtk&&(this.echoes.echoesOf(id).length||growth.stats)){
        const sheet=this.echoes.sheetStats(id),gain=er=>Math.min(erAtk.cap,Math.max(0,er-erAtk.start)*erAtk.per),base=sheet.atk||this.db.guide(id)?.atk||2000;
        score*=1+this.db.share(id,"basic")*((base+gain(sheet.er))/(base+gain(erAtk.ref))-1)}
      const bonus=(this.cycle().dmgBonus||{})[id];if(bonus)score*=1+bonus/100;return score}
    amp(id){return this.charMap()[id]?this.db.amp(id):0}
    supportContext(){return {el:id=>(this.charMap()[id]||{}).el,has:(id,ms)=>this.db.has(id,ms),share:(id,k)=>this.db.share(id,k),stat:(id,k)=>{const growth=this.state().growth[id]||{};
        if(k==="er"&&growth.stats?.er==null&&!this.echoes.echoesOf(id).length)return this.db.guide(id)?.er||this.db.erMin(id).min;
        return this.echoes.sheetStats(id)[k]||0},
      chain:id=>+((this.state().growth[id]||{}).chain)||0,combatCrit:id=>{const growth=this.state().growth[id]||{},sheet=this.echoes.sheetStats(id),guide=this.db.guide(id)||{};
        const echoes=this.echoes.echoesOf(id).length;
        return {cr:echoes||growth.stats?.cr!=null?sheet.cr:(guide.cr||70),cd:echoes||growth.stats?.cd!=null?sheet.cd:(guide.cd||250)}},BONUS_BASE:this.bonusBase,ATK_BASE:2}}
  }
  g.MP.CharacterCalculator=CharacterCalculator;
})(typeof window!=="undefined"?window:globalThis);
