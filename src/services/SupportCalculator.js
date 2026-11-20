(function(g){
  /* 서포터 계산: 파티원에게 주는 버프(반주 · 조건부 보정 supCond · 에코 세트 파티 효과 · 무기 파티 버프 · 파티 딜증 amp)와 협주력.
     버프력 = (1 + 받는 버프 합) × (1 + amp/100) − 1
     협주력 = 100 × 내 세팅의 버프력 ÷ 기준 세팅의 버프력 (정석 파트너가 받는 값, 기준 = 지원 기준 충족 · 0체인 · 기본 추천 무기)
     서포터 체인은 buffChain(없으면 공통표)으로 amp · supCond · 반주에 곱한다. 상수는 CharacterCalculator(config)에 있다. */
  class SupportCalculator{
    constructor({state,charMap,charDb,echoDb,weapons,echoes,dealers,config}){
      this.state=state;this.charMap=charMap;this.db=charDb;this.echoDb=echoDb;this.weapons=weapons;this.echoes=echoes;this.dealers=dealers;this.config=config;this.atkBase=2;
    }
    isSupport(id){const c=this.charMap()[id];return !!c&&c.role==="support"}
    usesAmp(id){return this.isSupport(id)&&this.db.hasAmp(id)}
    buffChainMul(id,ref){if(!this.isSupport(id))return 1;const table=this.db.buffChain(id)||this.config.chain.support;return table[ref?0:this.echoes.chainOf(id)]||1}
    amp(id,ref){if(!this.charMap()[id])return 0;const value=this.db.amp(id);return this.usesAmp(id)?value*this.buffChainMul(id,ref):value}
    /* supCond·무기 버프가 읽는 컨텍스트.
       기본: 내 세팅(최종 스탯·체인). ref: 기준 세팅(지원 기준 스탯·0체인, 받는 쪽 크리티컬은 이잘키 기준).
       refCrit: 주는 쪽은 내 세팅, 받는 쪽 크리티컬만 이잘키 기준(협주력 계산용) */
    supportContext(mode){const ref=mode==="ref",refCrit=ref||mode==="refCrit",db=this.db,echoes=this.echoes;
      const refStat=(id,k)=>{const targets=db.supportTargets(id)||{},guide=db.guide(id)||{};return targets[k]!=null?+targets[k]:guide[k]!=null?+guide[k]:(k==="er"?100:0)};
      return {el:id=>(this.charMap()[id]||{}).el,has:(id,ms)=>db.has(id,ms),share:(id,k)=>db.share(id,k),
        stat:ref?refStat:(id,k)=>echoes.finalStats(id)[k]||0,
        chain:ref?()=>0:id=>echoes.chainOf(id),
        combatCrit:refCrit?id=>{const ijk=echoes.ijkOf(id);return {cr:ijk.cr,cd:ijk.cd}}:id=>{const s=echoes.finalStats(id);return {cr:s.cr,cd:s.cd}},
        BONUS_BASE:this.config.bonusBase,ATK_BASE:this.atkBase}}
    setFxGain(effect,id){const c=this.charMap()[id];if(!c)return 0;const value=effect.v/100;
      if(effect.k==="atk%")return value/this.atkBase;if(effect.k==="el")return effect.elem&&effect.elem!==c.el?0:value/this.config.bonusBase;if(effect.k==="all")return value/this.config.bonusBase;
      if(this.echoDb.DMG_TYPES.includes(effect.k))return value*this.db.typeShare(id,effect.k)/this.config.bonusBase;return 0}
    /* 반주 버프
       cond.to: 받는 쪽 본인이 m을 갖고 파티에 m 공명자가 2명 이상 · cond.rx: 받는 쪽 본인이 m을 가짐 · 그 밖: 다른 파티원 중 m이 있음
       noSelf: 반주를 쓴 본인은 받지 않음(파티 전체 반주) */
    outroValues(giver,ids,receiver){const outro=this.db.outro(giver);if(!outro)return null;if(!outro.cond)return outro.v;
      if(outro.cond.to)return receiver&&this.db.has(receiver,outro.cond.m)&&ids.filter(id=>this.db.has(id,outro.cond.m)).length>=2?outro.cond.v:outro.v;
      if(outro.cond.rx)return receiver&&this.db.has(receiver,outro.cond.m)?outro.cond.v:outro.v;
      return ids.some(id=>id!==giver&&this.db.has(id,outro.cond.m))?outro.cond.v:outro.v}
    outroSkipsSelf(giver){const outro=this.db.outro(giver);return !!(outro&&outro.noSelf)}
    /* 키: all 전체 피해 부스트 · el 같은 속성 피해 보너스 · 피해 유형(basic 등) 보너스 · 이상 효과(frost·burn 등) 피해 부스트
       이상 효과 부스트는 그 이상 효과를 거는 공명자의 이상 효과 피해(피해 비중 other)에만 붙는다 */
    outroGain(giver,receiver,ids,ref){if(giver===receiver&&this.outroSkipsSelf(giver))return 0;const values=this.outroValues(giver,ids,receiver);if(!values)return 0;const map=this.charMap(),cg=map[giver],cr=map[receiver];if(!cg||!cr)return 0;let gain=0;const anom=g.MP.ANOM||[];
      Object.entries(values).forEach(([key,value])=>{if(key==="all")gain+=value;else if(key==="el"){if(cg.el===cr.el)gain+=value/this.config.bonusBase}
        else if(anom.includes(key)){if(this.db.has(receiver,[key]))gain+=value*this.db.share(receiver,"other")}
        else gain+=value*this.db.typeShare(receiver,key)/this.config.bonusBase});
      return gain/100*this.buffChainMul(giver,ref)}
    /* 한 공명자가 파티원에게 주는 반주 외 버프 목록 [{kind: sup|set|weapon, to, e, …}]. ref면 기준 세팅(세트 차이 0, 기본 추천 무기) */
    giverBuffs(giver,ids,main,context,ref){const map=this.charMap(),out=[];
      const condition=this.db.supCond(giver);if(condition&&this.usesAmp(giver)){const mul=this.buffChainMul(giver,ref);
        ids.forEach(receiver=>{if(receiver===giver||map[receiver].role==="support")return;const value=condition(receiver,ids,main,context);if(value.a>0)out.push({kind:"sup",to:receiver,e:value.a*mul,t:value.t})})}
      const echoes=ref?[]:this.echoes.echoesOf(giver);if(echoes.length){const echoContext=this.echoes.context(giver),receivers=to=>to==="party"?ids.filter(id=>id!==giver):[giver===main?ids[(ids.indexOf(giver)+1)%ids.length]:main].filter(id=>id&&id!==giver);
        const add=(list,sign)=>list.forEach(effect=>receivers(effect.to).forEach(receiver=>{const amount=sign*this.setFxGain(effect,receiver);if(amount)out.push({kind:"set",to:receiver,e:amount,set:effect.set,sign})}));
        add(this.echoDb.teamFx(echoes,echoContext),1);add(this.echoDb.refTeamFx(this.echoDb.refCounts(giver),echoContext),-1)}
      // 지원 무기의 명시된 팀 버프만 반영한다(공명자 파일의 teamWeaponBuff). 장착자의 스킬로 회복해야 발동하는 교향곡은 해당 공명자 파일에만 적는다.
      const weapon=ref?this.db.defaultWeaponId(giver):this.weapons.weaponOf(giver).w?.id,buffs=weapon?this.db.teamWeaponBuff(giver,weapon):null;
      if(buffs)ids.forEach(receiver=>{let amount=0;
        buffs.forEach(buff=>{if(buff.has&&!this.db.has(receiver,buff.has))return;
          if(buff.atk)amount+=buff.atk/100/this.atkBase;
          if(buff.cd){const crit=context.combatCrit(receiver),cr=Math.min(100,Math.max(0,crit.cr))/100;amount+=(cr*buff.cd/100)/(1+cr*(crit.cd/100-1))}
          if(buff.echo)amount+=buff.echo/100*this.db.typeShare(receiver,"echo")/this.config.bonusBase});
        out.push({kind:"weapon",to:receiver,e:amount,weapon})});
      return out}
    /* 파티원에게 주는 버프를 gain[받는 공명자]에 더하고, 화면용 내역을 result.supx · setx · weaponx에 남긴다. */
    teamBuffs(ids,main,gain,result){const context=this.supportContext(),all=ids.map(giver=>({giver,list:this.giverBuffs(giver,ids,main,context,false)}));
      all.forEach(({giver,list})=>list.filter(x=>x.kind==="sup").forEach(x=>{gain[x.to]+=x.e;result.supx.push({from:giver,to:x.to,e:x.e,t:x.t})}));
      all.forEach(({giver,list})=>list.filter(x=>x.kind==="set").forEach(x=>{gain[x.to]+=x.e;const line=result.setx.find(y=>y.from===giver&&y.to===x.to);
        if(line){line.e+=x.e;if(x.sign>0&&!line.t.includes(x.set))line.t.push(x.set)}else result.setx.push({from:giver,to:x.to,e:x.e,t:x.sign>0?[x.set]:[]})}));
      all.forEach(({giver,list})=>list.filter(x=>x.kind==="weapon").forEach(x=>{gain[x.to]+=x.e;result.weaponx.push({from:giver,to:x.to,e:x.e,weapon:x.weapon})}))}
    /* receiver가 givers와 한 파티일 때 받는 버프 배율 (1 + 버프 합) × (1 + amp/100). receiver를 메인으로 본다.
       mode "ref"는 기준 세팅(Prydwen dps 되돌리기용). 반주는 receiver가 가장 많이 받는 교대 순서를 쓴다. */
    receivedBuff(receiver,givers,mode){const ref=mode==="ref",ids=[receiver,...givers],context=this.supportContext(mode);
      const outroFor=order=>ids.reduce((sum,giver)=>{if(this.usesAmp(giver)||!this.outroValues(giver,ids))return sum;
        const hits=this.db.syn(giver).p||(order.length>1&&order[(order.indexOf(giver)+1)%order.length]===receiver);return hits?sum+this.outroGain(giver,receiver,ids,ref):sum},0);
      let gain=Math.max(...(ids.length>2?[ids,[ids[0],ids[2],ids[1]]]:[ids]).map(outroFor));
      ids.forEach(giver=>this.giverBuffs(giver,ids,receiver,context,ref).forEach(x=>{if(x.to===receiver)gain+=x.e}));
      const amp=givers.reduce((sum,id)=>sum+this.amp(id,ref),0);return (1+gain)*(1+amp/100)}
    referenceBuff(receiver,givers){return this.receivedBuff(receiver,givers,"ref")}
    /* 협주력을 잴 정석 파트너: 이 서포터를 궁합(pairs)에 가장 높게 적은 딜러. 같으면 dps가 높은 쪽 */
    partner(id){if(this.partners&&id in this.partners)return this.partners[id];const map=this.charMap();
      const list=Object.keys(map).filter(x=>map[x].role!=="support"&&x!==id).map(x=>({x,w:Math.max(this.db.pairW(x,id),this.db.pairW(id,x))})).filter(r=>r.w>0)
        .sort((a,b)=>b.w-a.w||(this.db.baseDps(b.x)||0)-(this.db.baseDps(a.x)||0));
      (this.partners=this.partners||{})[id]=list[0]?.x||null;return this.partners[id]}
    buffPower(id,ref){const partner=this.partner(id);if(!partner)return null;return this.receivedBuff(partner,[id],ref?"ref":"refCrit")-1}
    // 협주력 = 100 × 내 세팅의 버프력 ÷ 기준 세팅의 버프력
    score(id){if(!this.charMap()[id])return 0;const mine=this.buffPower(id,false),base=this.buffPower(id,true);return mine==null||!(base>1e-9)?100:100*mine/base}
  }
  g.MP.SupportCalculator=SupportCalculator;
})(typeof window!=="undefined"?window:globalThis);
