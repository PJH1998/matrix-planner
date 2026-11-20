/* =====================================================================
   공명자 데이터 — 공명자마다 파일 하나 (data/chars/<id>.js)
   새 공명자: 파일을 하나 만들고 아래 목록에 id를 추가한다. 목록 순서 = 기본 표시 순서(속성별).

   필드 (없는 값은 생략 — 역할·등급별 기본값을 쓴다)
     id, name, el, rar, role    기본 정보. role: dps 메인 딜러 / sub 서브 딜러 / support 서포터
     release                    출시 순서(클수록 최근)        eid   encore.moe 공명자 번호(이미지 받기용)
     syn   {o, ob, p, w, m}     반주·메커니즘 (출처: encore.moe 반주·고유 스킬 설명)
             o  반주 요약 / ob 반주 버프 대상(basic·heavy·skill·lib·echo·coord·el·all)
             p  1이면 파티 전체 버프 / w 주력 피해 유형 / m 메커니즘(frost·burn·erosion·flare·frazzle·bane·anom·tuneD·tuneW·hack·unison·shield·echo·coord)
     outro {v, cond, noSelf}    반주 버프 수치(%). cond: 파티에 메커니즘 m이 있으면 v 대신 cond.v
                                  (to:1 받는 쪽 본인이 m을 갖고 파티에 m 공명자 2명 이상 · rx:1 받는 쪽 본인이 m을 가짐)
                                v 키: all 전체 피해 · el 같은 속성 피해 · basic 등 피해 유형 · frost·burn 등 이상 효과 피해 부스트(그 이상 효과를 거는 공명자만)
                                noSelf:1 파티 전체 반주를 쓴 본인은 받지 않음 ("○○를 제외한 파티 내 캐릭터")
     modes [{id, name, icon, …}] 공명 모드(루실라·에이메스·데니아·여우의 별자리·린네). 0번 = 게임 기본 모드
                                name: 게임 공식 명칭("공명 모드 · 서리") · icon: encore.moe RoleLabel 아이콘 파일 이름
                                모드마다 다른 필드(syn·outro·sets·profile·dps·amp·supCond 등)를 여기 적으면 그 모드일 때 공통 값 대신 쓴다
                                파티 계산은 모드 조합을 모두 계산해 가장 좋은 조합을 고르고, 에코 세팅도 모드별로 따로 저장한다
     shieldUp                   (선택) 실드 유지율 0~1 — 실드 조건 효과(파워 서킷 등)의 유지율로 쓴다. 파티 중 가장 높은 값
     profile                    피해 비중(%) — Prydwen Calculations Damage Profile. other = 이상 효과·조화도 파괴 등
     dps, chain                 S0 기본 DPS, 0~6체인 DPS 배율 (Prydwen Calculations, 2026-11)
     rot, dpsTeam               Prydwen 한 바퀴 시간(초) · dps를 잴 때 함께 넣은 파티원 id 목록(빈 목록 = 혼자 잰 값). 같은 자료 시점
                                dps × rot = 한 바퀴 피해량. dpsTeam의 버프는 우리 계산식으로 빼서 버프 전 피해로 되돌린다
     chainStats                 체인으로 오르는 상시 스탯 [{chain: 단계, 스탯 키: 값}] — 파티에 넣고 필드에 꺼내면 스탯 화면에 보이는 값.
                                최종 스탯(공명력)에 더하고, 체인 배율에서는 그 몫을 나눠서 뺀다
     buffChain                  서포터 0~6체인 버프 배율(amp·supCond에 곱함). 없으면 공통표. supCond가 C.chain을 직접 쓰면 모두 1
     amp                        서포터(·일부 서브)의 파티 딜증(%) 추정치
     supCond(x, ids, main, C)   서포터 조건부 보정. 파티 ids의 공명자 x가 받는 추가 피해 {a, t}.
                                다른 공명자 정보는 C(중개자 컨텍스트)로만 읽는다: C.el(id) · C.has(id, 메커니즘[]) · C.share(id, 피해유형) · C.BONUS_BASE
     needs {m, mul, txt}        파티에 메커니즘 m을 가진 다른 공명자가 없으면 피해 × mul
     base                       90레벨 기본 [HP, 공격력, 방어력] (encore.moe)
     ijk                        '이 정도면 잘 키웠다' 기준 스탯 {main:[atk|hp, 값], cr, cd, el(3코 속성 개수), cfg, node}
                                출처: 아카라이브 명조 채널 위키 「이정도면 잘키웠다표」 (CC BY-SA 4.0), 2026-11-14 판
     guide, gb                  공식 공략 사이트(wuwaguide.kurogames.com, 「원스톱 육성 가이드」) 추천 스탯 · 게임 내 공명자 번호
                                {cr, cd, er, atk, hp, def, heal, el, skill} Lv.90 스탯 화면 기준. gt: '초과'(>) 조건인 항목, src: 공략 id
     er, erNote, erAdj          공명 효율 최소치(%) — 못 채우면 사이클이 밀린다. 출처: 위 위키 표(없으면 공식 추천 guide.er → 역할별 기본값)
                                erNote: 돌파·조합에 따른 차이(표시용), erAdj: 자동 보정 [{set, n, d}] — 해당 세트를 n개 이상 끼면 최소치 + d
     statScale                  주 스탯(atk|hp|def). 딜러 피해 배율과 서포터 유효 옵션·요약 표시에 사용
     supportTargets             서포터의 비전투 최종 스탯 지원 기준 {atk|hp|def|er: 값}. 개인 피해용 크리티컬은 제외
     supportTargetAdjust       체인·세트 조건에 따른 공효 기준 수정 [{chain, set?, er}]
     nodes, sets                고유 스탯 노드 합계, 주력 에코 세트 (sets 출처: 위 위키)
     wtype, weapons             무기 종류, 무기별 성능 [무기 id, 기준 재련, 성능 %] (Prydwen Build 탭)
     defaultWeaponId            기본 장착 추천 무기 id. 서포터는 전용 무기 또는 지원 운용 추천 무기
     supportWeapons             수치 근거가 있는 지원 무기 효율만 기재. 개인 피해용 weapons와 분리
     teamWeaponBuff             무기가 파티 전원(장착자 포함)에게 주는 명시된 버프 {무기 id: [{atk|cd|echo: %, has?: [메커니즘]}]}
                                atk 공격력 · cd 크리티컬 피해 · echo 에코 피해 보너스. has가 있으면 그 메커니즘을 가진 공명자만 받는다
     pairs                      자동 추천 궁합 {상대 id: 가중치} (1 = 정석 파트너, 0.5~0.8 = 무난한 대체)
   ===================================================================== */
(function(g){
const LIST=[
 "hiyuki","lucilla","suisui","carlotta","zhezhi","lingyang","sanhua","baizhi","youhu",
 "mornye","aemeath","denia","jingran","lupa","galbrena","encore","changli","brant","mortefi","chixia",
 "hsin","suoming","augusta","rebecca","rover_e","calcharo","xiangliyao","yinlin","buling","yuanwu","lumi",
 "sigrika","ciaccona","cartethyia","iuno","qiuyuan","qingxiao","jiyan","rover_a","jianxin","aalto","yangyang",
 "shorekeeper","lynae","verina","luuk","jinhsi","phoebe","zani","lucy","rover_s","lily",
 "chisa","xuanling","phrolova","cantarella","camellya","roccia","rover_h","danjin","taoqi"
];
g.MP.CHAR_LIST=LIST;
// 브라우저: 목록 순서대로 공명자 파일을 이어서 읽는다(파싱 중 동기 로드 → 본문 스크립트보다 먼저 등록됨)
if(typeof document!=="undefined"&&document.readyState==="loading"){
  const base=(document.currentScript&&document.currentScript.src||"").replace(/[^/]*$/,"");
  document.write(LIST.map(id=>`<script src="${base}${id}.js"><\/script>`).join(""));
}
})(typeof window!=="undefined"?window:globalThis);
