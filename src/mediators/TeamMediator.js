(function(g){
  class TeamMediator{
    constructor(getState){this.getState=getState}
    all(){return this.getState().teams}
    removeCharacter(id){this.all().forEach(team=>{team.slots=team.slots.map(slot=>slot===id?null:slot)})}
    clearSlots(){this.all().forEach(team=>{team.slots=[null,null,null]})}
    clear(){this.all().forEach(team=>{team.slots=[null,null,null];team.buff=null;team.example=false})}
  }
  g.MP.TeamMediator=TeamMediator;
})(typeof window!=="undefined"?window:globalThis);
