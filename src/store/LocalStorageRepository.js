(function(g){
  class LocalStorageRepository{
    constructor(key,storage){this.key=key;this.storage=storage||g.localStorage}
    load(){try{const raw=this.storage.getItem(this.key);return raw?JSON.parse(raw):null}catch(e){return null}}
    save(value){try{this.storage.setItem(this.key,JSON.stringify(value));return true}catch(e){return false}}
    remove(){try{this.storage.removeItem(this.key);return true}catch(e){return false}}
  }
  g.MP.LocalStorageRepository=LocalStorageRepository;
})(typeof window!=="undefined"?window:globalThis);
