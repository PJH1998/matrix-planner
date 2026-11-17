(function(g){
  /* 에코·무기·기본 스탯을 최종 스탯으로 합친 뒤 기대 피해
     (주 스탯 × 기대 치명타 × 피해 보너스)를 기준 세팅과 비교한다.
     에코를 직접 입력한 경우가 수동 스탯 입력보다 우선한다. */
  class EchoCalculator{
    constructor({state,charMap,charDb,echoDb,weapons}){
      this.state=state;this.charMap=charMap;this.db=charDb;this.echoDb=echoDb;this.weapons=weapons;
      this.typeRef=10;this.flatAtk=350;this.flatHp=2300;
      this.bonusKeys={el:"속성",basic:"일반 공격",heavy:"강공격",skill:"공명 스킬",lib:"공명 해방",echo:"에코 어빌리티"};
    }
    clamp(v,a,b){return Math.max(a,Math.min(b,isFinite(v)?v:a))}
    defaultSetOf(id){const row=(this.db.sets(id)||[])[0],fallback=this.echoDb.setNames()[0];if(!row)return {mode:"5",a:fallback,b:null,c:null};
      const parts=[];for(let i=0;i<row.length;i+=2){if(typeof row[i]!=="string")break;parts.push({name:row[i].split("|")[0],count:+row[i+1]||0})}
      if(parts.length===3&&parts[0].count===1&&parts[1].count===2&&parts[2].count===2)return {mode:"122",a:parts[0].name,b:parts[1].name,c:parts[2].name};
      const a=parts[0]&&parts[0].name||fallback,b=parts[1]&&parts[1].name||null;return {mode:(parts[0]&&parts[0].count>=5||!b)?"5":"32",a,b:b||a,c:null}}
    setOf(id){const base=this.defaultSetOf(id),saved=(this.state().growth[id]||{}).echoSet;return saved&&saved.a?Object.assign({},base,saved):base}
    modesOf(id){return this.defaultSetOf(id).mode==="122"?["5","32","122"]:["5","32"]}
    bonusKeysOf(id){const syn=this.db.syn(id);return ["el",...(syn.w||[]).filter(k=>this.bonusKeys[k])]}
    scaleOf(id){return this.db.scale(id)}
    ijkOf(id){const ijk=this.db.ijk(id);if(ijk)return ijk;const c=this.charMap()[id]||{},scale=this.scaleOf(id);
      return {main:[scale,scale==="hp"?45000:(c.rar===5?2300:1900)],cr:c.rar===5?70:65,cd:c.rar===5?260:240,el:2,cfg:"속속",node:0,est:1}}
    elRefOf(id){const ijk=this.ijkOf(id);return ijk.el*30+10+(ijk.node?12:0)}
    expDmg(main,cr,cd,bonus){return main*(1+Math.min(Math.max(cr,0),100)/100*(cd/100-1))*(1+bonus/100)}
    refDmg(id){const ijk=this.ijkOf(id);return this.expDmg(ijk.main[1],ijk.cr,ijk.cd,this.elRefOf(id)+this.typeRef)}
    statsWithWeapon(cid,wid){const ijk=this.ijkOf(cid),scale=ijk.main[0],base=this.db.base(cid)||[11000,400,1150];
      const result={main:ijk.main[1],cr:ijk.cr,cd:ijk.cd},best=this.weapons.bestWeaponId(cid),w0=this.weapons.stat(best),w1=this.weapons.stat(wid);if(!w0||!w1||best===wid)return result;
      const sub=(w,k)=>w[1]===k?w[2]:0;
      if(scale==="atk"){const b=base[1],p0=Math.max(0,(ijk.main[1]-this.flatAtk)/(b+w0[0])-1),p1=p0-sub(w0,"atk%")/100+sub(w1,"atk%")/100;result.main=(b+w1[0])*(1+p1)+this.flatAtk}
      else if(scale==="hp"){const b=base[0],p0=Math.max(0,(ijk.main[1]-this.flatHp)/b-1);result.main=b*(1+p0-sub(w0,"hp%")/100+sub(w1,"hp%")/100)+this.flatHp}
      result.cr+=sub(w1,"cr")-sub(w0,"cr");result.cd+=sub(w1,"cd")-sub(w0,"cd");return result}
    weaponStatRatio(cid,wid){const r=this.statsWithWeapon(cid,wid);return this.expDmg(r.main,r.cr,r.cd,this.elRefOf(cid)+this.typeRef)/this.refDmg(cid)}
    // 5세트는 전부 a, 3+2는 앞 3개가 a, 1+2+2는 첫 칸부터 a·b·b·c·c 순서로 배정한다.
    echoesOf(id){const echoes=((this.state().growth[id]||{}).echoes||[]).filter(e=>e&&e.main);if(!echoes.length)return echoes;const set=this.setOf(id);
      return echoes.map((e,i)=>Object.assign({},e,{set:set.mode==="122"?(i===0?set.a:(i<3?set.b:set.c)):(set.mode==="5"||i<3?set.a:(set.b||set.a))}))}
    dmgWeights(id){const profile=this.db.profile(id),weights={};if(profile)this.echoDb.DMG_TYPES.forEach(k=>{if(profile[k])weights[k]=profile[k]});
      if(!Object.keys(weights).length)(this.db.syn(id).w||[]).forEach(k=>{if(this.echoDb.DMG_TYPES.includes(k))weights[k]=1});if(!Object.keys(weights).length)weights.basic=1;return weights}
    context(id){return {el:(this.charMap()[id]||{}).el,has:ms=>this.db.has(id,ms),share:k=>this.db.share(id,k)}}
    sheetStats(id){const echoes=this.echoesOf(id),growth=this.state().growth[id]||{};
      if(!echoes.length&&growth.stats){const st=growth.stats,b=st.b||{},base=this.sheetBuild(id,[]).screen,out=Object.assign({},base);
        ["atk","hp","def","cr","cd","er"].forEach(k=>{if(st[k]!=null&&st[k]!=="")out[k]=+st[k]});out.types=Object.assign({},base.types,b);if(b.el!=null)out.el=+b.el;return out}
      return this.sheetBuild(id,echoes).screen}
    sheetBuild(id,echoes){const weapon=this.weapons.weaponOf(id);
      return this.echoDb.build(Object.assign(this.context(id),{base:this.db.base(id)||[11000,400,1150],nodes:this.db.nodes(id),weapon:weapon.w?this.weapons.stat(weapon.w.id):null,sheetFx:weapon.w?this.weapons.sheetFx(weapon.w.id,weapon.ref):null,echoes:echoes||[]}))}
    build(id,list){const echoes=list||this.echoesOf(id);if(!echoes.length)return null;const weapon=this.weapons.weaponOf(id);
      return this.echoDb.build(Object.assign(this.context(id),{base:this.db.base(id)||[11000,400,1150],nodes:this.db.nodes(id),weapon:weapon.w?this.weapons.stat(weapon.w.id):null,sheetFx:weapon.w?this.weapons.sheetFx(weapon.w.id,weapon.ref):null,echoes}))}
    reference(id){const ijk=this.ijkOf(id),weapon=this.weapons.stat(this.weapons.bestWeaponId(id));
      return this.echoDb.refBuild(Object.assign(this.context(id),{ijk,elRef:this.elRefOf(id),typeRef:this.typeRef,typeKeys:this.bonusKeysOf(id).filter(k=>k!=="el"),base:this.db.base(id)||[11000,400,1150],weaponAtk:weapon?weapon[0]:0,counts:this.echoDb.refCounts(id)}))}
    factor(id){const build=this.build(id);if(!build)return null;const sheet=build.screen,scale=this.scaleOf(id),weights=this.dmgWeights(id),f=this.clamp(this.echoDb.dmg(sheet,scale,weights)/this.refDmg(id),.4,2);
      return {f,sc:scale,crit:1+Math.min(sheet.cr,100)/100*(sheet.cd/100-1),bonus:sheet.el,echo:build}}
    supportTargets(id){const targets=Object.assign({},this.db.supportTargets(id)||{}),growth=this.state().growth[id]||{},chain=+growth.chain||0,set=this.setOf(id);
      this.db.supportTargetAdjust(id).forEach(rule=>{if(chain>=rule.chain&&(!rule.set||set.a===rule.set||set.b===rule.set||set.c===rule.set))targets.er=rule.er});
      return targets}
    supportProgress(id){const targets=this.supportTargets(id),sheet=this.sheetStats(id),keys=Object.keys(targets);
      return {met:keys.filter(k=>sheet[k]+.05>=targets[k]).length,total:keys.length,targets,sheet}}
    usefulStat(id,k){const c=this.charMap()[id];if(!c)return false;const scale=this.scaleOf(id);
      if(c.role!=="support"){if(k==="cr"||k==="cd"||k==="er")return true;if(k==="atk%"||k==="atk")return scale==="atk";if(k==="hp%"||k==="hp")return scale==="hp";if(k==="def%"||k==="def")return scale==="def";if(["basic","heavy","skill","lib"].includes(k))return this.db.share(id,k)>=.08;return false}
      const guide=this.db.guide(id)||{},base=k.endsWith("%")?k.slice(0,-1):k;
      const targets=this.supportTargets(id);
      if(k==="er")return targets.er!=null&&this.sheetStats(id).er+.05<Math.max(targets.er,this.db.erBuffCap(id)||0);
      if(["atk","hp","def"].includes(base))return base===scale||targets[base]!=null;
      if(k==="heal")return guide.heal!=null;
      return false}
    statFactor(id){const c=this.charMap()[id];if(!c||c.role==="support")return null;const ef=this.factor(id);if(ef)return ef;
      const stats=(this.state().growth[id]||{}).stats;if(!stats)return null;const scale=this.scaleOf(id),main=+stats[scale],cr=+stats.cr,cd=+stats.cd;if(!main||!cr||!cd)return null;
      const bonuses=stats.b||{},has=k=>bonuses[k]!=null&&bonuses[k]!=="",el=has("el")?+bonuses.el:this.elRefOf(id),keys=this.bonusKeysOf(id).filter(k=>k!=="el"),profile=this.db.profile(id)||{};
      const weight=k=>(profile[k]||0)>0?profile[k]:1,total=keys.reduce((a,k)=>a+weight(k),0),typeBonus=keys.length?keys.reduce((a,k)=>a+(has(k)?+bonuses[k]:this.typeRef)*weight(k),0)/total:this.typeRef,bonus=el+typeBonus;
      return {f:this.clamp(this.expDmg(main,cr,cd,bonus)/this.refDmg(id),.4,2),sc:scale,crit:1+Math.min(cr,100)/100*(cd/100-1),bonus}}
  }
  g.MP.EchoCalculator=EchoCalculator;
})(typeof window!=="undefined"?window:globalThis);
