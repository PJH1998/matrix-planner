(function(g){
  const esc=value=>String(value??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  class UIIcon{
    static image(src,{className="",alt="",draggable=true,removeOnError=false}={}){
      return `<img${className?` class="${esc(className)}"`:""} src="${esc(src)}" alt="${esc(alt)}"${draggable?"":' draggable="false"'}${removeOnError?' onerror="this.remove()"':""}>`;
    }
    static element(element,options={}){return UIIcon.image(`icons/el-${element}.png`,options)}
    static weapon(src,options={}){return UIIcon.image(src,Object.assign({removeOnError:true},options))}
    static heart(active){return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="${active?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`}
  }
  g.MP.UIIcon=UIIcon;
})(typeof window!=="undefined"?window:globalThis);
