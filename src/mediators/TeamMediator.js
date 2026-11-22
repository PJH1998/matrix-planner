(function(g){
  class TeamMediator{
    constructor(getState){this.getState=getState}
    all(){return this.getState().teams}
    removeCharacter(id){this.all().forEach(team=>{team.slots=team.slots.map(slot=>slot===id?null:slot)})}
    clearSlots(){this.all().forEach(team=>{team.slots=[null,null,null]})}
    clear(){this.all().forEach(team=>{team.slots=[null,null,null];team.buff=null;team.example=false;delete team.modes})}
    // 파티에 고른 공명 모드: i가 null이면 자동 선택으로 돌린다. 칸에 없는 공명자의 선택은 지운다
    setMode(team,id,i){const modes=Object.assign({},team.modes||{});if(i==null)delete modes[id];else modes[id]=i;
      Object.keys(modes).forEach(x=>{if(!team.slots.includes(x))delete modes[x]});if(Object.keys(modes).length)team.modes=modes;else delete team.modes}
    pruneModes(team){if(team&&team.modes)this.setMode(team,null,null)}
  }
  g.MP.TeamMediator=TeamMediator;
})(typeof window!=="undefined"?window:globalThis);
