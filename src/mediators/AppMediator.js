(function(g){
  class AppMediator{
    constructor({store,charDb,echoDb,bossDb}){this.store=store;this.state=null;const getState=()=>this.state;
      this.characters=new g.MP.CharacterMediator(charDb,getState);this.echoes=new g.MP.EchoMediator(echoDb,this.characters);
      this.teams=new g.MP.TeamMediator(getState);this.bosses=new g.MP.BossMediator(bossDb,getState)}
    load(){return this.state=this.store.load()}
    replace(value){return this.state=this.store.replace(value)}
    save(value){return this.store.save(value||this.state)}
    bind(state,{validElements,admin}){this.state=state;this.characters.bind(validElements);const cycle=this.bosses.bind(admin);
      return {characters:this.characters.all(),characterMap:this.characters.map(),cycle}}
  }
  g.MP.AppMediator=AppMediator;
})(typeof window!=="undefined"?window:globalThis);
