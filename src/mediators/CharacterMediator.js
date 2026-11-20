(function(g){
  class CharacterMediator{
    constructor(db,getState){this.db=db;this.getState=getState;this.characters=[];this.characterMap={}}
    bind(validElements){const state=this.getState();this.characters=(state.chars||this.db.defaults()).filter(c=>c&&c.id&&c.name&&validElements[c.el]);
      this.characterMap=Object.fromEntries(this.characters.map(c=>[c.id,c]));this.db.use(this.characters);
      this.characters.forEach(c=>{if(!(c.id in state.owned))state.owned[c.id]=true});return this}
    all(){return this.characters}
    map(){return this.characterMap}
    info(id){return this.characterMap[id]||null}
    growth(id){return this.getState().growth[id]||{}}
    ensureGrowth(id){const state=this.getState();return state.growth[id]||(state.growth[id]={})}
    // 공명 모드별 에코·세트·스탯 직접 입력 저장 위치: 0번 모드 = growth, 그 밖 = growth.alt[모드] (EchoCalculator.slot과 같은 규칙)
    slot(id){const growth=this.growth(id),mode=this.db.modeOf?this.db.modeOf(id):0;return mode>0?(((growth.alt||{})[mode])||{}):growth}
    ensureSlot(id){const growth=this.ensureGrowth(id),mode=this.db.modeOf?this.db.modeOf(id):0;if(!(mode>0))return growth;growth.alt=growth.alt||{};return growth.alt[mode]||(growth.alt[mode]={})}
    patchGrowth(id,patch){const growth=this.ensureGrowth(id);Object.assign(growth,patch);return growth}
    isOwned(id){return !!this.getState().owned[id]}
    setOwned(id,owned){this.getState().owned[id]=!!owned;return !!owned}
    toggleOwned(id){return this.setOwned(id,!this.isOwned(id))}
    setAllOwned(owned){this.characters.forEach(c=>this.setOwned(c.id,owned))}
    toggleFavorite(id){const state=this.getState();state.fav=state.fav||{};if(state.fav[id])delete state.fav[id];else state.fav[id]=true;return !!state.fav[id]}
  }
  g.MP.CharacterMediator=CharacterMediator;
})(typeof window!=="undefined"?window:globalThis);
