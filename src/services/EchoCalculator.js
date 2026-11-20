(function(g){
  /* 에코·무기·기본 스탯을 최종 스탯으로 합친 뒤 기대 피해
     (주 스탯 × 기대 치명타 × 피해 보너스)를 기준 세팅과 비교한다.
     에코를 직접 입력한 경우가 수동 스탯 입력보다 우선한다.
     공명 모드 공명자는 모드마다 에코·세트·스탯 직접 입력을 따로 저장한다(slot). 0번 모드 = growth 그대로, 그 밖 = growth.alt[모드].
     레벨·체인·무기·체험 세팅 여부는 공명자 공통(growth). */
  class EchoCalculator{
    constructor({state,charMap,charDb,echoDb,weapons}){
      this.state=state;this.charMap=charMap;this.db=charDb;this.echoDb=echoDb;this.weapons=weapons;
      this.typeRef=10;this.flatAtk=350;this.flatHp=2300;
      this.bonusKeys={el:"속성",basic:"일반 공격",heavy:"강공격",skill:"공명 스킬",lib:"공명 해방",echo:"에코 어빌리티"};
    }
    clamp(v,a,b){return Math.max(a,Math.min(b,isFinite(v)?v:a))}
    // 지금 모드(CharDB.modeOf)의 에코·세트·스탯 저장 위치
    slot(id){const growth=this.state().growth[id]||{},mode=this.db.modeOf(id);return mode>0?(((growth.alt||{})[mode])||{}):growth}
    defaultSetOf(id){const row=(this.db.sets(id)||[])[0],fallback=this.echoDb.setNames()[0];if(!row)return {mode:"5",a:fallback,b:null,c:null};
      const parts=[];for(let i=0;i<row.length;i+=2){if(typeof row[i]!=="string")break;parts.push({name:row[i].split("|")[0],count:+row[i+1]||0})}
      if(parts.length===3&&parts[0].count===1&&parts[1].count===2&&parts[2].count===2)return {mode:"122",a:parts[0].name,b:parts[1].name,c:parts[2].name};
      const a=parts[0]&&parts[0].name||fallback,b=parts[1]&&parts[1].name||null;return {mode:(parts[0]&&parts[0].count>=5||!b)?"5":"32",a,b:b||a,c:null}}
    setOf(id){const base=this.defaultSetOf(id),saved=this.slot(id).echoSet;return saved&&saved.a?Object.assign({},base,saved):base}
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
    echoesOf(id){const echoes=(this.slot(id).echoes||[]).filter(e=>e&&e.main);if(!echoes.length)return echoes;const set=this.setOf(id);
      return echoes.map((e,i)=>Object.assign({},e,{set:set.mode==="122"?(i===0?set.a:(i<3?set.b:set.c)):(set.mode==="5"||i<3?set.a:(set.b||set.a))}))}
    dmgWeights(id){const profile=this.db.profile(id),weights={};if(profile)this.echoDb.DMG_TYPES.forEach(k=>{if(profile[k])weights[k]=profile[k]});
      if(!Object.keys(weights).length)(this.db.syn(id).w||[]).forEach(k=>{if(this.echoDb.DMG_TYPES.includes(k))weights[k]=1});if(!Object.keys(weights).length)weights.basic=1;return weights}
    context(id){return {el:(this.charMap()[id]||{}).el,has:ms=>this.db.has(id,ms),share:k=>this.db.share(id,k)}}
    sheetStats(id){const echoes=this.echoesOf(id),growth=this.slot(id);
      if(!echoes.length&&growth.stats){const st=growth.stats,b=st.b||{},base=this.sheetBuild(id,[]).screen,out=Object.assign({},base);
        ["atk","hp","def","cr","cd","er"].forEach(k=>{if(st[k]!=null&&st[k]!=="")out[k]=+st[k]});out.types=Object.assign({},base.types,b);if(b.el!=null)out.el=+b.el;return out}
      return this.sheetBuild(id,echoes).screen}
    /* 체인 단계: 체험 세팅이면 data/trial.js의 chain(null이면 사용자 값), 아니면 사용자가 정한 체인 */
    chainOf(id){const growth=this.state().growth[id]||{},own=this.clamp(Math.round(+growth.chain||0),0,6);if(!growth.trial)return own;const spec=this.db.trialSpec(id);return spec.chain==null?own:this.clamp(spec.chain,0,6)}
    /* 상시 체인 스탯을 스탯 화면 값에 더한다 (공격력%·HP%·방어력%는 기본값 기준) */
    addChainStats(id,sheet,chain){const rows=this.db.chainStats(id).filter(row=>row.chain<=chain);if(!rows.length)return sheet;
      const out=Object.assign({},sheet,{types:Object.assign({},sheet.types||{})}),base=this.db.base(id)||[11000,400,1150],weapon=this.weapons.weaponOf(id),w=weapon.w?this.weapons.stat(weapon.w.id):null,baseAtk=base[1]+(w?w[0]:0);
      rows.forEach(row=>Object.entries(row).forEach(([k,v])=>{if(k==="chain")return;
        if(k==="atk%")out.atk+=baseAtk*v/100;else if(k==="hp%")out.hp+=base[0]*v/100;else if(k==="def%")out.def+=base[2]*v/100;
        else if(["atk","hp","def","cr","cd","er","el","all","heal"].includes(k))out[k]=(out[k]||0)+v;else out.types[k]=(out.types[k]||0)+v}));return out}
    /* 체험 세팅 스탯: 기본+무기+노드 위에 data/trial.js 기준(공식 가이드 추천 스탯 등)을 덮어쓴다.
       기준에 없는 항목(가이드에 공격력이 없는 공명자 등)은 이잘키 기준 스탯으로 채운다. 피해 유형 보너스는 이잘키 기준값 */
    trialStats(id){const spec=this.db.trialSpec(id),out=Object.assign({},this.sheetBuild(id,[]).screen),ijk=this.ijkOf(id);out.types=Object.assign({},out.types);
      const ref={cr:ijk.cr,cd:ijk.cd,el:this.elRefOf(id)};ref[ijk.main[0]]=ijk.main[1];
      Object.entries(Object.assign(ref,spec.stats||{})).forEach(([k,v])=>out[k]=+v);this.bonusKeysOf(id).filter(k=>k!=="el").forEach(k=>out.types[k]=(out.types[k]||0)+this.typeRef);
      return this.addChainStats(id,out,this.chainOf(id))}
    /* 에코도 스탯 직접 입력도 없으면 체험 세팅 기준 스탯으로 계산한다(무기·체인은 사용자 설정) */
    usesTrialStats(id){const growth=this.state().growth[id]||{};return !!growth.trial||(!this.echoesOf(id).length&&!this.slot(id).stats)}
    /* 최종 스탯: 필드에 꺼낸 상태의 정보창 값. 에코 + 상시 체인 스탯. 에코 미입력이면 체험 세팅 기준 스탯.
       스탯 직접 입력은 게임 화면 값을 옮겨 적은 것이라 체인 스탯을 더하지 않는다. */
    finalStats(id){if(this.usesTrialStats(id))return this.trialStats(id);
      const sheet=this.sheetStats(id);if(!this.echoesOf(id).length&&this.slot(id).stats)return sheet;return this.addChainStats(id,sheet,this.chainOf(id))}
    /* 이잘키 기준 스탯에 n체인까지의 상시 체인 스탯을 더했을 때의 피해 배율 (체인 배율에서 이 몫을 뺀다) */
    chainStatMul(id,chain){const rows=this.db.chainStats(id).filter(row=>row.chain<=chain);if(!rows.length)return 1;
      const ijk=this.ijkOf(id),scale=ijk.main[0],base=this.db.base(id)||[11000,400,1150],best=this.weapons.stat(this.weapons.bestWeaponId(id)),r={main:ijk.main[1],cr:ijk.cr,cd:ijk.cd,bonus:this.elRefOf(id)+this.typeRef};
      rows.forEach(row=>Object.entries(row).forEach(([k,v])=>{if(k==="cr"||k==="cd")r[k]+=v;else if(k==="el"||k==="all")r.bonus+=v;
        else if(k===scale+"%")r.main+=(scale==="atk"?base[1]+(best?best[0]:0):scale==="hp"?base[0]:base[2])*v/100;else if(k===scale)r.main+=v}));
      return this.expDmg(r.main,r.cr,r.cd,r.bonus)/this.refDmg(id)}
    /* 공명력 = 100 × 최종 스탯 피해 기대값 ÷ 이잘키 기준 스탯 피해 기대값 (아래 제한 없음). 스탯 직접 입력에서 피해 보너스를 비우면 기준값을 쓴다 */
    resonance(id){const growth=this.state().growth[id]||{};
      if(!growth.trial&&!this.echoesOf(id).length&&this.slot(id).stats){const f=this.manualFactor(id);if(f!=null)return 100*f}
      return 100*this.echoDb.dmg(this.finalStats(id),this.scaleOf(id),this.dmgWeights(id))/this.refDmg(id)}
    manualFactor(id){const stats=this.slot(id).stats;if(!stats)return null;const scale=this.scaleOf(id),main=+stats[scale],cr=+stats.cr,cd=+stats.cd;if(!main||!cr||!cd)return null;
      const bonuses=stats.b||{},has=k=>bonuses[k]!=null&&bonuses[k]!=="",el=has("el")?+bonuses.el:this.elRefOf(id),keys=this.bonusKeysOf(id).filter(k=>k!=="el"),profile=this.db.profile(id)||{};
      const weight=k=>(profile[k]||0)>0?profile[k]:1,total=keys.reduce((a,k)=>a+weight(k),0),typeBonus=keys.length?keys.reduce((a,k)=>a+(has(k)?+bonuses[k]:this.typeRef)*weight(k),0)/total:this.typeRef;
      return this.expDmg(main,cr,cd,el+typeBonus)/this.refDmg(id)}
    sheetBuild(id,echoes){const weapon=this.weapons.weaponOf(id);
      return this.echoDb.build(Object.assign(this.context(id),{base:this.db.base(id)||[11000,400,1150],nodes:this.db.nodes(id),weapon:weapon.w?this.weapons.stat(weapon.w.id):null,sheetFx:weapon.w?this.weapons.sheetFx(weapon.w.id,weapon.ref):null,echoes:echoes||[]}))}
    build(id,list){const echoes=list||this.echoesOf(id);if(!echoes.length)return null;const weapon=this.weapons.weaponOf(id);
      return this.echoDb.build(Object.assign(this.context(id),{base:this.db.base(id)||[11000,400,1150],nodes:this.db.nodes(id),weapon:weapon.w?this.weapons.stat(weapon.w.id):null,sheetFx:weapon.w?this.weapons.sheetFx(weapon.w.id,weapon.ref):null,echoes}))}
    reference(id){const ijk=this.ijkOf(id),weapon=this.weapons.stat(this.weapons.bestWeaponId(id));
      return this.echoDb.refBuild(Object.assign(this.context(id),{ijk,elRef:this.elRefOf(id),typeRef:this.typeRef,typeKeys:this.bonusKeysOf(id).filter(k=>k!=="el"),base:this.db.base(id)||[11000,400,1150],weaponAtk:weapon?weapon[0]:0,counts:this.echoDb.refCounts(id)}))}
    factor(id){const build=this.build(id);if(!build)return null;const sheet=build.screen,scale=this.scaleOf(id),weights=this.dmgWeights(id),f=this.clamp(this.echoDb.dmg(sheet,scale,weights)/this.refDmg(id),.4,2);
      return {f,sc:scale,crit:1+Math.min(sheet.cr,100)/100*(sheet.cd/100-1),bonus:sheet.el,echo:build}}
    /* 공명 효율 최소치(CharDB.erMin)에 지금 에코 세트 보정(erAdj)을 더한 값. build를 주면 그 세팅 기준 */
    erMin(id,build){const erm=this.db.erMin(id),eb=build||this.build(id);
      if(eb)(erm.adj||[]).forEach(a=>{const x=eb.sets.find(z=>z.name===a.set);if(x&&x.c>=a.n){erm.min+=a.d;erm.adjText=`${a.set} ${a.n}세트 ${a.d>0?"+":""}${a.d}`}});return erm}
    erOk(id){return this.sheetStats(id).er+.05>=this.erMin(id).min}
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
      const stats=this.slot(id).stats;if(!stats)return null;const scale=this.scaleOf(id),main=+stats[scale],cr=+stats.cr,cd=+stats.cd;if(!main||!cr||!cd)return null;
      const bonuses=stats.b||{},has=k=>bonuses[k]!=null&&bonuses[k]!=="",el=has("el")?+bonuses.el:this.elRefOf(id),keys=this.bonusKeysOf(id).filter(k=>k!=="el"),profile=this.db.profile(id)||{};
      const weight=k=>(profile[k]||0)>0?profile[k]:1,total=keys.reduce((a,k)=>a+weight(k),0),typeBonus=keys.length?keys.reduce((a,k)=>a+(has(k)?+bonuses[k]:this.typeRef)*weight(k),0)/total:this.typeRef,bonus=el+typeBonus;
      return {f:this.clamp(this.expDmg(main,cr,cd,bonus)/this.refDmg(id),.4,2),sc:scale,crit:1+Math.min(cr,100)/100*(cd/100-1),bonus}}
  }
  g.MP.EchoCalculator=EchoCalculator;
})(typeof window!=="undefined"?window:globalThis);
