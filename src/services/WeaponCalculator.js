(function(g){
  /* 공명자별 최고 무기를 100%로 정규화한다. 딜러의 미등록 무기만 등급별로 추정한다.
     서포터의 개인 피해 무기 표는 지원 기여도 수치로 사용하지 않는다. */
  class WeaponCalculator{
    constructor({state,charMap,charDb,weapons,weaponTypes,weaponStats,weaponSheetFx}){
      this.state=state;this.charMap=charMap;this.db=charDb;this.types=weaponTypes||{};this.stats=weaponStats||{};this.sheetEffects=weaponSheetFx||{};
      this.map={};(weapons||[]).forEach(([id,name,type,q,icon])=>this.map[id]={id,name,type,q,icon});
      this.refStep={5:3,4:2,3:1.5};this.trialMul=.82;this.cache={};
    }
    reset(){this.cache={}}
    perfList(cid){if(this.cache[cid])return this.cache[cid];const support=this.charMap()[cid]?.role==="support";
      const l=(support?this.db.supportWeaponPerf(cid):this.db.weaponPerf(cid)).filter(x=>this.map[x[0]]);
      const mx=Math.max(0,...l.map(x=>x[2])),seen=new Set();
      return this.cache[cid]=l.filter(x=>!seen.has(x[0])&&seen.add(x[0])).map(([id,r,p])=>({id,r,p:p/mx*100})).sort((a,b)=>b.p-a.p)}
    weaponPct(cid,wid,ref){const w=this.map[wid];if(!w)return null;const l=this.perfList(cid),e=l.find(x=>x.id===wid);let base,baseR;
      if(e){base=e.p;baseR=e.r}else{if(this.charMap()[cid]?.role==="support")return null;const same=l.filter(x=>this.map[x.id].q===w.q);base=same.length?Math.min(...same.map(x=>x.p))-3:({5:85,4:72,3:60}[w.q]||55);baseR=w.q===5?1:5}
      if(this.charMap()[cid]?.role==="support"&&l.length===1)return base;
      return base*(1+(this.refStep[w.q]||2)/100*(ref-baseR))}
    charType(cid){return this.db.wtype(cid)}
    defaultWeapon(cid){const c=this.charMap()[cid],growth=this.state().growth[cid]||{},want=+growth.wr||(c&&c.rar===5?5:4);
      const preferred=this.db.defaultWeaponId(cid);if(!growth.wr&&preferred&&this.map[preferred])return preferred;
      const l=this.perfList(cid),best=l.find(x=>this.map[x.id].q===want)||l[0];if(best)return best.id;
      const type=this.charType(cid),w=Object.values(this.map).find(x=>x.type===type&&x.q===want);return w?w.id:null}
    trialWeapon(cid){const c=this.charMap()[cid],type=+this.charType(cid);
      if(c&&c.rar===5&&type){const id=21000015+type*10000;if(this.map[id])return id}
      const l=this.perfList(cid).filter(x=>this.map[x.id].q===4);if(l.length)return l[l.length-1].id;
      const w=Object.values(this.map).find(x=>x.type===type&&x.q===4);return w?w.id:null}
    weaponOf(cid){const growth=this.state().growth[cid]||{};
      if(growth.trial){const id=this.trialWeapon(cid),w=this.map[id]||null;return {w,ref:1,pct:w?this.weaponPct(cid,id,1):null,custom:false,trial:true}}
      const id=growth.wid&&this.map[growth.wid]?growth.wid:this.defaultWeapon(cid),w=this.map[id]||null;
      const ref=Math.max(1,Math.min(5,isFinite(+growth.ref||0)?(+growth.ref||(w&&w.q<5?5:1)):1));
      return {w,ref,pct:w?this.weaponPct(cid,id,ref):null,custom:!!(growth.wid&&this.map[growth.wid])}}
    bestWeaponId(cid){const l=this.perfList(cid);return l.length?l[0].id:this.defaultWeapon(cid)}
    stat(id){return this.stats[id]||null}
    sheetFx(id,ref){const fx=this.sheetEffects[id]||{},rank=Math.max(1,Math.min(5,+ref||1))-1,out={};
      Object.entries(fx).forEach(([k,v])=>out[k]=Array.isArray(v)?v[rank]:v);return out}
  }
  g.MP.WeaponCalculator=WeaponCalculator;
})(typeof window!=="undefined"?window:globalThis);
