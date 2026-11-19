/* =====================================================================
   파워 서킷·보스 효과 조건 표
   data/cycle.js의 buffs[].effects[].cond 와 bosses[].effects[].tags 가 이 키를 쓴다.
   scope "char": 조건을 만족하는 공명자에게만 적용 / "team": 파티원 중 한 명이라도 만족하면 파티 전원에게 적용
   판정: w(주력 피해 유형) · el(속성) · m(메커니즘) 중 하나라도 겹치면 만족. 새 조건은 여기에 한 줄 추가한다.
   ids: 이 공명자가 있으면 만족 (고유 패시브 조건)
   dealer: 서포터는 제외 (이상 효과 "피해" 증가는 이상 효과 딜러만 받는다.
           "이상 효과에 걸린 적이 받는 피해" 증가는 대상 디버프라 negative(파티 전원)를 쓴다)
   mReq: 이 메커니즘을 가진 공명자만 (예: 서리 효과 "피해"는 서리 효과를 거는 공명자의 이상 효과 피해(other)에만 붙는다)
   ===================================================================== */
(function(g){
const ANOM=["frost","burn","erosion","flare","frazzle","bane"];
g.MP.ANOM=ANOM;
g.MP.CONDS={
  basic:{label:"일반 공격",scope:"char",w:["basic"]},
  heavy:{label:"강공격",scope:"char",w:["heavy"]},
  skill:{label:"공명 스킬",scope:"char",w:["skill"]},
  lib:{label:"공명 해방",scope:"char",w:["lib"]},
  echo:{label:"에코 어빌리티",scope:"char",w:["echo"],m:["echo"]},
  coord:{label:"협동 공격",scope:"char",w:["coord"]},
  glacio:{label:"응결",scope:"char",el:["glacio"]}, fusion:{label:"용융",scope:"char",el:["fusion"]},
  electro:{label:"전도",scope:"char",el:["electro"]}, aero:{label:"기류",scope:"char",el:["aero"]},
  spectro:{label:"회절",scope:"char",el:["spectro"]}, havoc:{label:"인멸",scope:"char",el:["havoc"]},
  negative:{label:"이상 효과",scope:"team",m:ANOM.concat("anom")},
  frost:{label:"서리 효과",scope:"team",m:["frost"]},
  frostKnot:{label:"서리의 매듭(히유키)",scope:"team",ids:["hiyuki"]},
  frostDmg:{label:"서리 효과 피해",scope:"char",dealer:1,mReq:["frost"],m:["frost"],w:["other"]},
  anomDmg:{label:"이상 효과 피해",scope:"char",dealer:1,mReq:ANOM.concat("anom"),m:ANOM.concat("anom"),w:["other"]}, burn:{label:"불꽃 효과",scope:"team",m:["burn"]},
  erosion:{label:"풍식 효과",scope:"team",m:["erosion"]}, flare:{label:"전자 효과",scope:"team",m:["flare"]},
  frazzle:{label:"광학 효과",scope:"team",m:["frazzle"]}, bane:{label:"암흑 효과",scope:"team",m:["bane"]},
  tunability:{label:"조화도 이탈",scope:"team",m:["tuneD","tuneW"]},
  tuneD:{label:"조화 밀집",scope:"team",m:["tuneD"]}, tuneW:{label:"조화 파동",scope:"team",m:["tuneW"]},
  hack:{label:"해킹",scope:"char",m:["hack"]},
  unison:{label:"합일",scope:"char",m:["unison"],min:2}, // 합일 대응: 합일 공명자 본인만, 파티에 합일 공명자가 2명 이상일 때
  shield:{label:"실드",scope:"team",m:["shield"]}
};
})(typeof window!=="undefined"?window:globalThis);
