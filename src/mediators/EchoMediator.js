(function(g){
  class EchoMediator{
    constructor(db,characters){this.db=db;this.characters=characters}
    slots(id,count=5){const slots=(this.characters.growth(id).echoes||[]).slice(0,count);while(slots.length<count)slots.push(null);return slots}
    patchSet(id,current,patch){const growth=this.characters.ensureGrowth(id);growth.echoSet=Object.assign({},current,patch);return growth.echoSet}
    setEchoes(id,echoes){const growth=this.characters.ensureGrowth(id);if((echoes||[]).some(Boolean))growth.echoes=echoes;else delete growth.echoes;return growth.echoes||[]}
  }
  g.MP.EchoMediator=EchoMediator;
})(typeof window!=="undefined"?window:globalThis);
