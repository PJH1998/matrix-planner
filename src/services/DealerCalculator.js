(function(g){
  /* 딜러(메인·서브) 계산.
     공명력 = 100 × 최종 스탯 피해 기대값 ÷ 이잘키 기준 피해 기대값 (EchoCalculator.resonance)
     개인 피해(한 바퀴) = 버프 전 한 바퀴 피해 × 공명력/100 × 무기 패시브 × 체인 배율(상시 체인 스탯 몫 제외)
                         × 전투 중 스탯 전환 × 레벨 × 주기 보정
     버프 전 한 바퀴 피해 = dps × rot ÷ (dps를 잰 Prydwen 파티의 버프력, 우리 계산식)
     상수는 CharacterCalculator(config)에 있다. 서포터 계산(supports)은 CharacterCalculator가 연결한다. */
  class DealerCalculator{
    constructor({state,chars,charMap,cycle,charDb,weapons,echoes,config}){
      this.state=state;this.chars=chars;this.charMap=charMap;this.cycle=cycle;this.db=charDb;this.weapons=weapons;this.echoes=echoes;this.config=config;this.supports=null;
      this.dpsExp=1;this.fallbackRot=10;this.dpsAverage={};this.refBuffs={};
    }
    clamp(v,a,b){return Math.max(a,Math.min(b,isFinite(v)?v:a))}
    reset(){this.dpsAverage={};this.refBuffs={};if(this.supports)this.supports.partners=null}
    averageDps(){if(this.dpsAverage.all==null){const xs=this.chars().filter(x=>x.role!=="support").map(x=>this.db.baseDps(x.id)).filter(Boolean);this.dpsAverage.all=xs.reduce((a,b)=>a+b,0)/(xs.length||1)}return this.dpsAverage.all}
    // DPS 상대 배율(평균 = 1). 강도 계산에는 쓰지 않고 화면·디버그용으로 남긴다
    dpsFactor(id){const value=this.db.baseDps(id);return value?value/this.averageDps():1}
    // Prydwen 체인 배율 전체(상시 체인 스탯 포함) — 화면 표시용
    chainMul(id){const c=this.charMap()[id],table=this.db.chain(id)||this.config.chain[c&&c.role]||this.config.chain.sub;return table[this.echoes.chainOf(id)]||1}
    // 강도에 곱하는 체인 배율: 상시 체인 스탯 몫은 최종 스탯(공명력)에 들어가므로 나눠서 뺀다
    chainRemain(id){const chain=this.echoes.chainOf(id);return this.chainMul(id)/this.echoes.chainStatMul(id,chain)}
    // 무기 패시브 계수: 무기 성능 % 중 스탯 몫(공명력에 이미 들어감)을 빼고 패시브 몫만 남긴다
    weaponPassive(id){const weapon=this.weapons.weaponOf(id);if(weapon.pct==null||!weapon.w)return 1;return this.clamp(weapon.pct/100/this.echoes.weaponStatRatio(id,weapon.w.id),.5,1.3)}
    rot(id){return this.db.rot(id)||this.fallbackRot}
    // Prydwen이 dps를 잴 때 넣은 파티원의 버프력(기준 세팅, 우리 계산식). 혼자 잰 값이면 1
    refBuff(id){if(this.refBuffs[id]!=null)return this.refBuffs[id];const map=this.charMap(),team=(this.db.dpsTeam(id)||[]).filter(x=>map[x]&&x!==id);
      return this.refBuffs[id]=team.length&&this.supports?this.supports.referenceBuff(id,team):1}
    // 버프 전 한 바퀴 피해
    baseDamage(id){const dps=this.db.baseDps(id);if(!dps)return 0;const avg=this.averageDps();return avg*Math.pow(dps/avg,this.dpsExp)*this.rot(id)/this.refBuff(id)}
    erAtkMul(id){const erAtk=this.db.combatErAtk(id);if(!erAtk)return 1;
      const sheet=this.echoes.finalStats(id),gain=er=>Math.min(erAtk.cap,Math.max(0,er-erAtk.start)*erAtk.per),base=sheet.atk||this.db.guide(id)?.atk||2000;
      return 1+this.db.share(id,"basic")*((base+gain(sheet.er))/(base+gain(erAtk.ref))-1)}
    levelMul(id){const growth=this.state().growth[id]||{};if(growth.trial)return 1;const level=this.clamp(+growth.lv||90,1,90);return level>=90?1:.5+.5*level/90}
    cycleMul(id){const bonus=(this.cycle().dmgBonus||{})[id];return bonus?1+bonus/100:1}
    resonance(id){return this.echoes.resonance(id)}
    // 개인 피해(한 바퀴, 버프 전). 파티 강도의 재료
    damage(id){if(!this.charMap()[id])return 0;
      return this.baseDamage(id)*this.resonance(id)/100*this.weaponPassive(id)*this.chainRemain(id)*this.erAtkMul(id)*this.levelMul(id)*this.cycleMul(id)}
    // 화면에 보이는 개인 점수 = 공명력
    score(id){return this.charMap()[id]?this.resonance(id):0}
  }
  g.MP.DealerCalculator=DealerCalculator;
})(typeof window!=="undefined"?window:globalThis);
