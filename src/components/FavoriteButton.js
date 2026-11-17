(function(g){
  class FavoriteButton{
    static render({character,className,active,escape}){
      const name=escape(character.name);
      return `<button type="button" class="${className}${active?" on":""}" data-fav="${character.id}" aria-pressed="${active}" aria-label="${name} 즐겨찾기" title="즐겨찾기 — 어떤 정렬이든 맨 앞에 보여요">${g.MP.UIIcon.heart(active)}</button>`;
    }
  }
  g.MP.FavoriteButton=FavoriteButton;
})(typeof window!=="undefined"?window:globalThis);
