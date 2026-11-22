(function(g){
  const clone=value=>JSON.parse(JSON.stringify(value));

  function createStateSchema(defaultChars,exampleTeams){
    const fresh=()=>({
      v:1,
      owned:Object.fromEntries(defaultChars.map(c=>[c.id,true])),
      growth:{},
      teams:clone(exampleTeams).concat(Array.from({length:4},()=>({slots:[null,null,null],buff:null}))),
      cycle:null,
      chars:null
    });
    // 파티별로 사용자가 고른 공명 모드 {공명자 id: 모드 번호}. 그 파티 칸에 있는 공명자만 남긴다. 없으면 필드를 만들지 않는다(자동 선택)
    const teamModes=t=>{const m=t&&t.modes;if(!m||typeof m!=="object"||!Array.isArray(t.slots))return {};const out={};
      Object.entries(m).forEach(([id,i])=>{if(t.slots.includes(id)&&Number.isInteger(i)&&i>=0)out[id]=i});return Object.keys(out).length?{modes:out}:{}};
    const normalize=s=>{
      const d=fresh();
      if(!s||typeof s!=="object")return d;
      return {v:1,owned:s.owned&&typeof s.owned==="object"?s.owned:d.owned,growth:s.growth&&typeof s.growth==="object"?s.growth:{},
        teams:Array.isArray(s.teams)?s.teams.map(t=>({slots:[0,1,2].map(i=>(t&&Array.isArray(t.slots)&&typeof t.slots[i]==="string")?t.slots[i]:null),buff:t&&typeof t.buff==="string"?t.buff:null,example:!!(t&&t.example),...teamModes(t)})):d.teams,
        cycle:s.cycle&&typeof s.cycle==="object"?s.cycle:null,chars:Array.isArray(s.chars)?s.chars:null,skill:typeof s.skill==="string"?s.skill:"top",records:Array.isArray(s.records)?s.records:[],cur:s.cur&&typeof s.cur==="object"?s.cur:null,poolSort:typeof s.poolSort==="string"?s.poolSort:"rar",rosterSort:(s.sortV>=2&&typeof s.rosterSort==="string")?s.rosterSort:"new",rosterView:s.rosterView==="profile"?"profile":"icon",fav:s.fav&&typeof s.fav==="object"?s.fav:{},sortV:2};
    };
    return {fresh,normalize};
  }

  g.MP.createStateSchema=createStateSchema;
})(typeof window!=="undefined"?window:globalThis);
