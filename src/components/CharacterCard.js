(function(root){
  class CharacterCard{
    static token({character,bonus,pictureUrl,hasPicture,squarePicture,elementName,extra="",escape}){
      const c=character;
      return `<div class="face${hasPicture?" pic":""}${squarePicture?" sq":""}" style="--ec:var(--${c.el})${hasPicture?`;--pic:url('${pictureUrl}')`:""}"><span class="elb" title="${elementName} 속성">${root.MP.UIIcon.element(c.el,{draggable:false})}<b>${elementName}</b></span><span class="r${c.rar===4?" r4":""}">${c.rar}★</span><span class="g">${escape(c.name.replace(/^방랑자\((.).*/,"방$1").slice(0,2))}</span></div><div class="nm${c.rar===4?" r4":""}">${escape(c.name)}</div>${bonus?`<span class="bonus" title="이번 주기 피해 +${bonus}%">+${bonus}%</span>`:""}${extra}`;
    }
    static profile({character,growth,owned,weapon,pictureUrl,elementName,favoriteHtml,weaponIconUrl,statsHtml="",escape}){
      const c=character,g=growth,wp=weapon;
      return `<div class="rcard pcard ${owned?"":"off"}${c.rar===4?" r4":""}${statsHtml?" has-stat":""}" data-id="${c.id}" role="button" tabindex="0" aria-label="${escape(c.name)} 설정${owned?"":" (미보유)"}" style="--ec:var(--${c.el})">
    ${pictureUrl?`<div class="pimg" style="background-image:url('${pictureUrl}')"></div>`:""}<div class="pgrad"></div>
    ${root.MP.UIIcon.element(c.el,{className:"pel",alt:elementName})}<span class="pstar">${"★".repeat(c.rar)}</span>
    ${owned?"":`<span class="poff">미보유</span>`}
    <div class="pinfo"><div class="ptxt"><b><span class="pnm">${escape(c.name)}</span>${favoriteHtml}</b><span>${g.trial?"체험 세팅":`Lv.${g.lv??90}`} · <em>${+g.chain||0}돌파</em></span></div>
      ${wp.w?`<span class="pwep q${wp.w.q}" title="${escape(wp.w.name)} R${wp.ref}">${root.MP.UIIcon.weapon(weaponIconUrl)}<b>R${wp.ref}</b></span>`:""}</div>${statsHtml}</div>`;
    }
  }
  root.MP.CharacterCard=CharacterCard;
})(typeof window!=="undefined"?window:globalThis);
