(function(g){
  class EchoMediator{
    constructor(db,characters){this.db=db;this.characters=characters}
    // 에코·세트는 공명 모드별로 저장한다(CharacterMediator.slot)
    slots(id,count=5){const slots=(this.characters.slot(id).echoes||[]).slice(0,count);while(slots.length<count)slots.push(null);return slots}
    patchSet(id,current,patch){const slot=this.characters.ensureSlot(id);slot.echoSet=Object.assign({},current,patch);return slot.echoSet}
    setEchoes(id,echoes){const slot=this.characters.ensureSlot(id);if((echoes||[]).some(Boolean))slot.echoes=echoes;else delete slot.echoes;return slot.echoes||[]}
    // 스탯 직접 입력(게임 스탯 화면 값)
    stats(id){return this.characters.slot(id).stats||null}
    ensureStats(id){const slot=this.characters.ensureSlot(id);return slot.stats=Object.assign({b:{}},slot.stats||{})}
    clearStats(id){delete this.characters.ensureSlot(id).stats}
  }
  g.MP.EchoMediator=EchoMediator;
})(typeof window!=="undefined"?window:globalThis);
