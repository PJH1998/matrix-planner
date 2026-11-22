(function(g){
  /* 픽업 추천: 배너 공명자를 뽑으면 무엇이 얼마나 좋아지는지 계산한다.
     배너마다 전용 무기를 같이 뽑을지 고른다(opt.weapon). 안 뽑으면 기본 무기(baseWeapon): 상시 5성 무기 R1,
       서포터는 상시 5성과 4성 공명 효율 무기(R5) 중 협주력이 높은 쪽.
     미보유(새로 뽑기) — 0체인 + 기본 무기(또는 전용 무기), 에코는 체험 세팅(공식 가이드 추천 스탯) 기준
       조합 후보: 고정 조합(TEAM_PRESETS) + 궁합(pairs)으로 묶이는 메인 딜러 기준 3인 조합.
         메인 딜러 2명은 정석 짝(궁합 1)일 때만, 서포터는 1명까지.
         정석 = 고정 조합이거나, 메인 딜러와 나머지(서포터 제외)의 궁합이 모두 1. 서포터는 궁합 표·보유 서포터 중 강도 순
         서브 = 그 밖의 조합(보유 공명자만). 정석과 다른 조합 중 총점이 가장 오르는 것 + (그게 다른 파티를 깨면) 깨지 않는 것
       파티 넣기: 필요한 공명자가 지금 편성에서 배치 횟수를 다 쓰고 있으면 그 공명자가 든 파티(가장 약한 것)를 포기한다.
         단 서브 딜러는 새 조합의 메인 딜러와 시너지(궁합 + 반주 이득)가 지금 파티의 메인 딜러와의 시너지보다 클 때만 데려온다. 아니면 그 조합은 뺀다.
         새 조합은 포기한 파티 자리(없으면 첫 빈 파티, 없으면 맨 뒤)에 넣는다. 파워 서킷은 전·후 모두 파티마다 가장 좋은 것.
         총점 변화 = 바꾼 편성의 예상 총점 − 지금 편성의 예상 총점 (보스 진행 시뮬레이션)
       추천 등급 = 가장 좋은 조합의 총점 상승 비율(GRADES)
     보유(돌파) — 공명 체인 +1(전용 무기를 고르면 함께)일 때 그 공명자 강도만 본다: 딜러는 개인 피해, 서포터는 협주력.
     모든 수치는 추정치다. */
  const GRADES=[{min:6,id:"must",label:"강력 추천"},{min:2.5,id:"good",label:"추천"},{min:.8,id:"maybe",label:"고려"},{min:-Infinity,id:"skip",label:"보류"}];
  class PickupAdvisor{
    constructor({state,charMap,cycle,teams,characters,weapons,charDb,vigorOf,sameChar,cost}){
      this.state=state;this.charMap=charMap;this.cycle=cycle;this.teams=teams;this.characters=characters;this.weapons=weapons;this.db=charDb;
      this.vigorOf=vigorOf||(()=>1);this.same=sameChar||((a,b)=>a===b);this.cost=Object.assign({char:95,weapon:70},cost||{});this.grades=GRADES;this.memo=new Map();this.baseCache={};
    }
    /* 공명자 id를 잠깐 patch 상태로 바꾸고 fn을 실행한 뒤 되돌린다. patch: {owned, growth, fresh(이전 성장도 무시)} */
    withPatch(id,patch,fn){const s=this.state(),own=Object.prototype.hasOwnProperty.call(s.owned,id),oldOwned=s.owned[id],
        grown=Object.prototype.hasOwnProperty.call(s.growth,id),oldGrowth=s.growth[id];
      if(patch.owned)s.owned[id]=true;
      if(patch.growth)s.growth[id]=Object.assign({},patch.fresh?{}:(oldGrowth||{}),patch.growth);
      try{return fn()}finally{if(own)s.owned[id]=oldOwned;else delete s.owned[id];if(grown)s.growth[id]=oldGrowth;else delete s.growth[id]}}
    /* 무기 */
    // 함께 나오는 무기: 배너에 적은 무기 → 성능 1위 5성 무기
    signature(id,entry){const map=this.weapons.map,w=entry&&entry.weapon;if(w&&map[w])return w;
      const top=this.weapons.perfList(id).find(x=>map[x.id]&&map[x.id].q===5);return top?top.id:null}
    /* 기본 무기 {wid, ref, kind}: 상시 5성 무기(210X0015) R1. 서포터는 4성 공명 효율 무기 R5도 후보로 넣어 협주력이 높은 쪽.
       상시 5성이 없으면 4성(fourStar). 공명자마다 한 번 계산해 둔다 */
    baseWeapon(id){this.baseCache=this.baseCache||{};if(this.baseCache[id])return this.baseCache[id];
      const map=this.weapons.map,type=+this.weapons.charType(id),std=21000015+type*10000,list=[];
      if(type&&map[std])list.push({wid:std,ref:1,kind:"std"});
      if(type&&this.role(id)==="support")Object.values(map).filter(w=>+w.type===type&&w.q===4&&(this.weapons.stat(w.id)||[])[1]==="er").forEach(w=>list.push({wid:w.id,ref:5,kind:"er4"}));
      let best=list[0]||null;
      if(list.length>1)best=list.map(x=>Object.assign(x,{v:this.withPatch(id,{owned:true,fresh:true,growth:{chain:0,wid:x.wid,ref:x.ref}},()=>this.charPower(id).v)})).sort((a,b)=>b.v-a.v)[0];
      if(!best){const f=this.fourStar(id);best=f?{wid:f,ref:5,kind:"four"}:null}
      return this.baseCache[id]=best}
    // 4성 무기(상시 5성이 없을 때만): 성능표의 최고 4성 → 같은 종류의 아무 4성
    fourStar(id){const map=this.weapons.map,top=this.weapons.perfList(id).find(x=>map[x.id]&&map[x.id].q===4);if(top)return top.id;
      const type=+this.weapons.charType(id),any=Object.values(map).find(w=>+w.type===type&&w.q===4);return any?any.id:null}
    /* 계산 기본 */
    role(id){return (this.charMap()[id]||{}).role}
    owns(id){return !!this.state().owned[id]}
    link(a,b){return Math.max(this.db.pairW(a,b)||0,this.db.pairW(b,a)||0)}
    total(teams){return this.teams.simulate(teams).total||0}
    score(team){return this.teams.teamCalc(team).total}
    // 파티 team에 가장 좋은 파워 서킷을 붙인 파티와 그 강도
    bestBuff(team){let best={team:{...team,buff:null},score:this.score({...team,buff:null})};
      (this.cycle().buffs||[]).forEach(b=>{const t={...team,buff:b.id},v=this.score(t);if(v>best.score+1e-9)best={team:t,score:v}});return best}
    // 메인 딜러 2명은 정석 짝(궁합 1)일 때만, 3명은 안 됨. 서포터는 1명까지
    allowed(ids){const dps=ids.filter(x=>this.role(x)==="dps"),sup=ids.filter(x=>this.role(x)==="support");
      if(sup.length>1||dps.length>2)return false;return dps.length<2||this.link(dps[0],dps[1])>=1}
    // 칸 순서: 딜러(개인 피해 큰 순) → 서포터
    arrange(ids){const dealers=ids.filter(x=>this.role(x)!=="support").sort((a,b)=>this.characters.damage(b)-this.characters.damage(a)),sup=ids.filter(x=>this.role(x)==="support");return dealers.concat(sup).slice(0,3)}
    // 지금 편성: 파티마다 서킷 최적 파티·강도, 예상 총점·파티별 점수
    baseline(){const teams=this.state().teams,base=teams.map(t=>t.slots.some(Boolean)?this.bestBuff(t):null),list=base.map((b,i)=>b?b.team:teams[i]),sim=this.teams.simulate(list);
      return {base,list,total:sim.total||0,pts:sim.res.map(r=>r.pts||0)}}
    /* 조합 후보 — X를 보유한 상태(patch)에서 부른다 */
    candidates(id){const map=this.charMap(),known=x=>!!map[x],seen=new Set(),out=[],rk=x=>x.startsWith("rover_")?"rover":x;
      const add=(ids,preset)=>{ids=[...new Set(ids)];if(ids.length!==3||!ids.every(known)||!ids.includes(id))return;
        if(new Set(ids.map(rk)).size<3||!this.allowed(ids))return;const key=ids.slice().sort().join("/");if(seen.has(key))return;seen.add(key);out.push({ids,preset:!!preset})};
      this.db.presets().forEach(p=>{if(p.includes(id))add(p,true)});
      const ids=Object.keys(map),role=this.role(id),ownedSup=ids.filter(x=>this.owns(x)&&this.role(x)==="support"),ownedDeal=ids.filter(x=>this.owns(x)&&this.role(x)!=="support");
      // 메인 딜러: X가 메인이면 X, 아니면 X와 궁합이 있는 메인 딜러 + 개인 피해 상위 보유 메인 딜러 6명
      const mains=role==="dps"?[id]:[...new Set(ids.filter(m=>this.role(m)==="dps"&&this.link(m,id)>0)
        .concat(ids.filter(m=>this.role(m)==="dps"&&this.owns(m)).sort((a,b)=>this.characters.damage(b)-this.characters.damage(a)).slice(0,6)))];
      mains.forEach(m=>{const pairs=Object.keys(this.db.pairs(m)).filter(known);
        const subs=[...new Set(pairs.filter(x=>this.role(x)!=="support").concat(ownedDeal))].filter(x=>x!==m),sups=[...new Set(pairs.filter(x=>this.role(x)==="support").concat(ownedSup))];
        if(role==="support")subs.forEach(s=>add([m,s,id]));
        else if(m!==id)sups.forEach(p=>add([m,id,p]));
        else subs.forEach(s=>sups.forEach(p=>add([m,s,p])))});
      return out.map(c=>{const slots=this.arrange(c.ids),main=slots.find(x=>this.role(x)==="dps")||slots[0];
        const core=slots.filter(x=>x!==main&&this.role(x)!=="support");
        const standard=c.preset||(core.length>0&&core.every(x=>this.link(main,x)>=1)&&(this.role(id)!=="support"||this.link(main,id)>=1));
        return {slots,main,standard,missing:slots.filter(x=>x!==id&&!this.owns(x))}})}
    // 지금 편성에서 공명자 x를 쓴 파티 번호들과 배치 횟수
    usage(x){const teams=this.state().teams;return {using:teams.map((t,i)=>t.slots.some(y=>this.same(y,x))?i:-1).filter(i=>i>=0),left:x.startsWith("rover_")?1:this.vigorOf(x)}}
    /* 조합을 지금 편성에 넣는다: 배치 횟수를 다 쓴 공명자가 든 파티(가장 약한 것)를 포기하고, 그 자리(없으면 빈 파티·맨 뒤)에 넣는다.
       총점 변화는 「X 대신 다른 공명자」와 비교한다: 같은 자리에 X 대신 쓸 수 있는(배치 횟수가 남은) 보유 공명자 중 가장 센 대체 조합,
       그리고 지금 편성 중 큰 쪽이 기준이다. 빈 파티에 새 조합을 넣을 때 원래 놀던 두 명의 몫까지 뽑기 효과로 세지 않게 한다 */
    // 서브 딜러 x와 메인 딜러 main의 시너지: 궁합(pairs) + x가 main에게 주는 반주 이득
    synergy(main,x){return main&&x&&main!==x?this.link(main,x)+this.teams.outroGain(x,main,[main,x]):0}
    place(slots,id,shared,main){const teams=this.state().teams,give=new Map();let blocked=null;
      slots.filter(x=>x!==id).forEach(x=>{const u=this.usage(x);if(blocked||u.using.length<u.left)return;
        const hit=u.using.find(j=>give.has(j)),i=hit!=null?hit:u.using.slice().sort((a,b)=>(shared.base[a]?shared.base[a].score:0)-(shared.base[b]?shared.base[b].score:0))[0];
        // 서브 딜러를 빼 올 때: 새 메인 딜러와의 시너지가 지금 파티 메인 딜러와의 시너지보다 커야 한다
        let why=null;if(this.role(x)!=="support"&&x!==main){const m0=this.teams.mainDps(teams[i]);
          // 그 파티의 메인 딜러가 새 조합의 메인 딜러와 같으면 같은 파티를 다시 짜는 것이라 괜찮다
          if(!(m0&&main&&this.same(m0,main))){const sNew=this.synergy(main,x),sOld=m0===x?-Infinity:this.synergy(m0,x);
            if(!(sNew>sOld+1e-9)){blocked={id:x,from:m0,index:i};return}why={from:m0,sNew,sOld}}}
        if(!give.has(i))give.set(i,[]);give.get(i).push({id:x,why})});
      if(blocked)return {blocked};
      const list=shared.list.slice(),gave=[...give.keys()].sort((a,b)=>a-b);gave.forEach(i=>{list[i]={slots:[null,null,null],buff:null}});
      let at=gave.length?gave[0]:list.findIndex(t=>!t.slots.some(Boolean));if(at<0){at=list.length;list.push({slots:[null,null,null],buff:null})}
      const team=this.bestBuff({slots:slots.slice(),buff:null}),put=t=>{const next=list.slice();next[at]=t;return this.total(next)};
      const total=put(team.team);
      // X 대신: 포기한 파티를 뺀 편성에서 배치 횟수가 남은 보유 공명자
      const usedLeft=x=>{const u=this.usage(x);return u.using.filter(i=>!give.has(i)).length<u.left};
      // 대체 공명자는 X와 상관없어서(나머지 두 명·포기한 파티가 같으면 같은 답) shared에 캐시한다. 서킷 없이 강도 상위 3명만 서킷까지 계산
      const others=slots.filter(x=>x!==id),rk=x=>x.startsWith("rover_")?"rover":x,ck=others.slice().sort().join("/")+"|"+gave.join(",")+"|"+id;
      shared.subs=shared.subs||{};let cached=shared.subs[ck];
      if(!cached){const pool=[];Object.keys(this.charMap()).forEach(x=>{if(x===id||!this.owns(x)||others.some(o=>rk(o)===rk(x))||!usedLeft(x))return;const ids=others.concat(x);if(!this.allowed(ids))return;
          const slots2=this.arrange(ids);pool.push({id:x,slots:slots2,raw:this.score({slots:slots2,buff:null})})});
        const sub=pool.sort((a,b)=>b.raw-a.raw).slice(0,3).map(c=>Object.assign({id:c.id},this.bestBuff({slots:c.slots,buff:null}))).sort((a,b)=>b.score-a.score)[0]||null;
        cached=shared.subs[ck]={sub,total:sub?put(sub.team):-Infinity}}
      const sub=cached.sub,subTotal=cached.total,ref=Math.max(shared.total,subTotal);
      return {index:at,team:team.team,buff:team.team.buff,strength:team.score,giveUp:gave.map(i=>({index:i,slots:teams[i].slots.slice(),pts:shared.pts[i]||0,take:give.get(i)})),
        dRaw:total-shared.total,dTotal:total-ref,instead:sub&&subTotal>shared.total?{id:sub.id,slots:sub.team.slots.slice(),strength:sub.score}:null}}
    // 정석 조합 1개 + 서브 조합(총점이 가장 오르는 것, 그게 다른 파티를 깨면 깨지 않는 것도) — patch가 걸린 상태에서 부른다
    combos(id,shared){const all=this.candidates(id).map(c=>Object.assign(c,{strength:this.score({slots:c.slots,buff:null})})).sort((a,b)=>b.strength-a.strength); // 순위만 서킷 없이
      const ready=c=>!c.missing.length,out=[];
      // 정석: 보유로 만들 수 있는 정석 조합 중 강도 상위 8개를 넣어 보고 총점이 가장 오르는 것(서포터를 다른 파티에서 빼 오지 않아도 되는 쪽이 보통 이김)
      const put=(kind,c)=>{const r=this.place(c.slots,id,shared,c.main);return r.blocked?null:Object.assign({kind},c,r)};
      const std=all.filter(c=>c.standard),stdReady=std.filter(ready).slice(0,8).map(c=>put("standard",c)).filter(Boolean);
      const stdPick=stdReady.sort((a,b)=>b.dTotal-a.dTotal)[0]||(std[0]&&!ready(std[0])?Object.assign({kind:"standard"},std[0]):null);
      if(stdPick)out.push(stdPick);
      // 가장 센 정석 조합에 미보유 공명자가 필요하면 함께 보여 준다(그 공명자도 있어야 만드는 조합)
      if(std[0]&&!ready(std[0])&&stdPick&&std[0].slots.join()!==stdPick.slots.join())out.push(Object.assign({kind:"standard"},std[0]));
      const subs=all.filter(c=>ready(c)&&!c.standard).slice(0,14).map(c=>put("sub",c)).filter(Boolean).slice(0,10);
      const best=subs.slice().sort((a,b)=>b.dTotal-a.dTotal)[0];if(best)out.push(best);
      const free=subs.filter(c=>!c.giveUp.length&&c!==best).sort((a,b)=>b.dTotal-a.dTotal)[0];if(best&&best.giveUp.length&&free&&free.dTotal>0)out.push(free);
      return out}
    /* 보유(돌파) — 그 공명자 강도: 딜러는 개인 피해, 서포터는 협주력 */
    charPower(id){return this.role(id)==="support"?{kind:"support",v:this.characters.score(id)}:{kind:"damage",v:this.characters.damage(id)}}
    /* 뽑는 경우 하나: opt.weapon = 전용 무기도 뽑음. 미보유는 0체인 + 기본 무기(또는 전용 무기), 보유는 체인 +1(+ 전용 무기).
       더 뽑을 것이 없으면 null */
    option0(id,entry,opt){const c=this.charMap()[id];if(!c)return null;const s=this.state(),g=s.growth[id]||{},sig=this.signature(id,entry),want=!!(opt&&opt.weapon)&&!!sig;
      if(!s.owned[id]){const base=this.baseWeapon(id),w=want?{wid:sig,ref:1}:base?{wid:base.wid,ref:base.ref}:{};
        return {key:"char",weapon:want,patch:{owned:true,fresh:true,growth:Object.assign({chain:0},w)},cost:this.cost.char+(want?this.cost.weapon:0),wid:w.wid||null}}
      const ch=Math.max(0,Math.min(6,+g.chain||0)),cur=this.weapons.weaponOf(id),has=!!(sig&&cur.w&&cur.w.id===sig),addW=want&&!has,w=addW?{wid:sig,ref:1}:{};
      if(ch<6)return {key:"char",weapon:addW,from:ch,to:ch+1,patch:{growth:Object.assign({chain:ch+1},w)},cost:this.cost.char+(addW?this.cost.weapon:0),wid:addW?sig:null};
      if(addW)return {key:"weapon",weapon:true,from:ch,to:ch,patch:{growth:w},cost:this.cost.weapon,wid:sig};
      return null}
    options(id,entry,opt){const o=this.option0(id,entry,opt);return o?[o]:[]}
    /* 기준값: 지금 편성 — 여러 공명자를 볼 때 한 번만 계산한다 */
    shared(){return this.baseline()}
    // 강도 변화: from 상태(patch, 없으면 지금) → to 상태
    powerChange(id,from,to){const before=from?this.withPatch(id,from,()=>this.charPower(id)):this.charPower(id),after=this.withPatch(id,to,()=>this.charPower(id));
      return {kind:before.kind,before:before.v,after:after.v,pct:before.v>1e-9?(after.v/before.v-1)*100:0}}
    // 돌파는 그 공명자 강도 변화만, 새로 뽑기는 조합을 넣었을 때 총점 변화
    option(id,o,shared){
      if(this.owns(id))return Object.assign({},o,{power:this.powerChange(id,null,o.patch),gain:0,pct:0});
      return this.withPatch(id,o.patch,()=>{const combos=this.combos(id,shared);
        const gain=Math.max(0,...combos.filter(c=>c.dTotal!=null).map(c=>c.dTotal)),pct=shared.total>0?gain/shared.total*100:(gain>0?100:0);
        return Object.assign({},o,{combos,gain,pct})})}
    /* 전용 무기를 뽑으면 그 공명자 강도가 얼마나 오르는지(전용 무기 선택 옆에 보여 준다).
       미보유: 0체인 기본 무기 → 전용 무기, 보유: 지금 무기 → 전용 무기. 이미 전용 무기거나 없으면 null */
    weaponPower(id,entry){const sig=this.signature(id,entry);if(!sig||!this.charMap()[id])return null;
      if(this.owns(id)){const cur=this.weapons.weaponOf(id);if(cur.w&&cur.w.id===sig)return null;return this.powerChange(id,null,{growth:{wid:sig,ref:1}})}
      const base=this.baseWeapon(id);if(!base)return null;
      return this.powerChange(id,{owned:true,fresh:true,growth:{chain:0,wid:base.wid,ref:base.ref}},{owned:true,fresh:true,growth:{chain:0,wid:sig,ref:1}})}
    // 공명자 하나: opt.weapon = 전용 무기도 뽑음
    analyze(id,entry,shared,opt){if(!this.charMap()[id])return {id,missing:true};shared=shared||this.shared();
      const s=this.state(),owned=!!s.owned[id],growth=s.growth[id]||{},sig=this.signature(id,entry),cur=owned?this.weapons.weaponOf(id):null;
      const o=this.option0(id,entry,opt),main=o?this.option(id,o,shared):null,grade=main&&!owned?GRADES.find(x=>main.pct>=x.min):null;
      return {id,owned,chain:owned?Math.max(0,Math.min(6,+growth.chain||0)):null,signature:sig,hasSignature:!!(owned&&sig&&cur.w&&cur.w.id===sig),
        base:owned?null:this.baseWeapon(id),weaponOn:!!(opt&&opt.weapon),weaponPower:this.weaponPower(id,entry),done:!main,main,grade,
        per10:main&&main.cost?(owned?main.power.pct:main.gain)/main.cost*10:0}}
    // 배너 여러 개 → 공명자별 분석 (같은 공명자가 두 배너에 있으면 앞 배너만). 결과는 상태가 같으면 다시 쓴다
    key(){const s=this.state();return JSON.stringify([s.owned,s.growth,s.teams,s.skill,this.cycle().name])}
    // 상태가 바뀌면 기본 무기 판단(서포터 협주력 비교)도 다시 한다
    clear(){this.memo.clear();this.baseCache={}}
    entries(banners){const seen=new Set(),out=[];(banners||[]).forEach((b,bi)=>(b.chars||[]).forEach(e=>{if(seen.has(e.id))return;seen.add(e.id);out.push({entry:e,banner:b,bannerIndex:bi})}));return out}
    // weapons: {공명자 id: true} = 전용 무기도 뽑음
    analyzeAll(banners,weapons){weapons=weapons||{};const key=this.key()+JSON.stringify(banners)+JSON.stringify(weapons);if(this.memo.has(key))return this.memo.get(key);
      const shared=this.shared(),rows=this.entries(banners).map(x=>Object.assign({banner:x.banner,bannerIndex:x.bannerIndex,entry:x.entry},this.analyze(x.entry.id,x.entry,shared,{weapon:!!weapons[x.entry.id]})));
      const result={shared:{total:shared.total},rows:PickupAdvisor.sort(rows)};this.clear();this.memo.set(key,result);return result}
    // 정렬: 새로 뽑기(보류 제외, 등급 → 점수) → 돌파(강도 상승 순) → 보류 → 계산 중·데이터 없음·더 뽑을 것 없음(배너 순서 유지)
    static sort(rows){const band=r=>r.missing||r.done||!r.main?0:r.owned?2:!r.grade||r.grade.id==="skip"?1:3+GRADES.length-GRADES.findIndex(x=>x.id===r.grade.id);
      const val=r=>!r.main?0:r.owned?r.main.power.pct:r.main.gain;
      return rows.slice().sort((a,b)=>band(b)-band(a)||val(b)-val(a))}
  }
  PickupAdvisor.GRADES=GRADES;
  g.MP.PickupAdvisor=PickupAdvisor;
})(typeof window!=="undefined"?window:globalThis);
