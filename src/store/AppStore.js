(function(g){
  class AppStore{
    constructor(schema,repository){this.schema=schema;this.repository=repository;this.state=null}
    fresh(){return this.schema.fresh()}
    normalize(value){return this.schema.normalize(value)}
    load(){this.state=this.normalize(this.repository.load()||this.fresh());return this.state}
    replace(value){this.state=this.normalize(value);return this.state}
    save(value){this.state=value||this.state;return this.repository.save(this.state)}
  }
  g.MP.AppStore=AppStore;
})(typeof window!=="undefined"?window:globalThis);
