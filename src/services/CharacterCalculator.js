(function(g){
  /* 공명자 계산의 진입점. 딜러는 DealerCalculator, 서포터는 SupportCalculator가 계산한다.
     공용 상수와 기존 호출부(characterCalculator.score · amp · supportContext 등)를 여기서 유지한다. */
  class CharacterCalculator{
    constructor({state,chars,charMap,cycle,charDb,echoDb,weapons,echoes}){
      this.state=state;this.chars=chars;this.charMap=charMap;this.cycle=cycle;this.db=charDb;this.weapons=weapons;this.echoes=echoes;
      this.chain={dps:[1,1.09,1.27,1.49,1.58,1.66,2.21],sub:[1,1.07,1.21,1.42,1.52,1.62,1.92],support:[1,1.03,1.06,1.1,1.13,1.16,1.2]};
      this.bonusBase=1.9;this.mainSubRatio=1.3;this.roleWeight={main:1,dps:.5,sub:.5,support:.2};this.noSynergyWeight=.75;this.noSynergyMin=.05;this.synergyBonus={mech:5,combo:5,cap:30};
      this.dealers=new g.MP.DealerCalculator({state,chars,charMap,cycle,charDb,weapons,echoes,config:this});
      this.supports=new g.MP.SupportCalculator({state,charMap,charDb,echoDb,weapons,echoes,dealers:this.dealers,config:this});
    }
    clamp(v,a,b){return Math.max(a,Math.min(b,isFinite(v)?v:a))}
    reset(){this.dealers.reset();this.weapons.reset()}
    isSupport(id){const c=this.charMap()[id];return !!c&&c.role==="support"}
    dpsFactor(id){return this.dealers.dpsFactor(id)}
    chainMul(id){return this.dealers.chainMul(id)}
    score(id){return this.isSupport(id)?this.supports.score(id):this.dealers.score(id)}
    amp(id){return this.supports.amp(id)}
    supportContext(){return this.supports.supportContext()}
  }
  g.MP.CharacterCalculator=CharacterCalculator;
})(typeof window!=="undefined"?window:globalThis);
