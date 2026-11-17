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
    patchGrowth(id,patch){const growth=this.ensureGrowth(id);Object.assign(growth,patch);return growth}
    isOwned(id){return !!this.getState().owned[id]}
    setOwned(id,owned){this.getState().owned[id]=!!owned;return !!owned}
    toggleOwned(id){return this.setOwned(id,!this.isOwned(id))}
    setAllOwned(owned){this.characters.forEach(c=>this.setOwned(c.id,owned))}
    toggleFavorite(id){const state=this.getState();state.fav=state.fav||{};if(state.fav[id])delete state.fav[id];else state.fav[id]=true;return !!state.fav[id]}
  }
  g.MP.CharacterMediator=CharacterMediator;
})(typeof window!=="undefined"?window:globalThis);
