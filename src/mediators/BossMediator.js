(function(g){
  class BossMediator{
    constructor(db,getState){this.db=db;this.getState=getState}
    bind(admin){const state=this.getState();this.db.use(admin&&state.cycle||null);return this.db.cycle()}
    cycle(){return this.db.cycle()}
    examples(){return this.db.examples()}
    vigor(id){return this.db.vigor(id)}
  }
  g.MP.BossMediator=BossMediator;
})(typeof window!=="undefined"?window:globalThis);
