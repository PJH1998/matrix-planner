# 매트릭스 플래너 — 작업 안내

명조: 워더링 웨이브 **종말 매트릭스**용 파티 배치 도구. 비영리 팬 사이트, 로그인 없음(브라우저 localStorage 저장).
- 사이트: https://pjh1998.github.io/matrix-planner/
- 저장소: PJH1998/matrix-planner (공개)
- 빌드 도구 없는 정적 사이트. `index.html`이 `<script>`로 파일을 순서대로 불러온다(번들러·npm 패키지 없음).

## 작업 규칙 (반드시 지킬 것)

- **main = 배포 브랜치.** main에 push하면 GitHub Actions(`.github/workflows/pages.yml`)가 바로 Pages에 배포한다.
  - 작업은 별도 브랜치에서 한다. 급한 수정은 main에서 `hotfix/<이름>` 브랜치를 빼서 고친다.
  - **main에 합치기·push는 사용자가 "올려줘" 등으로 명시적으로 승인한 뒤에만.** 승인은 그 변경에만 유효하다.
  - 배포 후에는 `gh run watch` 등으로 워크플로 성공을 확인한다.
  - force push, 원격 브랜치 삭제, 히스토리 재작성은 사용자에게 먼저 묻는다.
- **버전 규칙:** 큰 기능 추가는 1.x(1.0 첫 공개 · 1.1 리뉴얼 · 1.2 자동 추천 · 1.3 에코 세팅), 수정·보정은 1.x.y.
  - 버전을 올리면 `updates.js`(사이트의 업데이트 탭)와 `README.md`의 업데이트 노트를 함께 고친다.
- **업데이트 노트에는 실측 플레이 기록 수치(점수·진행도 등)를 적지 않는다.**
- 사용자에게 보이는 문구는 한국어, 짧고 쉬운 말로. 게임 용어는 한국 서버 공식 명칭을 쓴다(공명자, 반주, 공명 효율, 에코, 부옵 등).
- 커밋 메시지는 기존 스타일(한국어 요약 또는 `feat:`/`fix:`/`refactor:` 접두어)을 따른다.

## 사용자에게 설명할 때

- 주어와 목적어를 분명히 쓴다(누가 무엇을 무엇에 하는지). 모호한 표현 금지.
- 사용자의 코드나 작업에 대해 추측하지 말고, 실제 소스를 확인한 뒤 말한다.
- 결과 보고는 짧게. 무엇을 바꿨고, 무엇을 확인했는지.

## 콘텐츠 원칙

- **다른 사람(유튜버 등)의 딜 사이클·로테이션 연구를 옮겨 쓰지 않는다.** 딜 사이클 페이지는 폐기한 기능이다.
- 공개 영상의 플레이 결과를 예측 보정용으로 참고하는 것은 괜찮다(출처 표시 불필요).
- 외부 데이터는 README의 **출처** 표에 적는다. 이잘키(아카라이브 「이정도면 잘키웠다표」)는 CC BY-SA 4.0이라 출처 표기가 필요하다.
- 게임 이미지는 encore.moe 등에서 받고, 저작권은 KURO GAMES에 있음을 유지한다.

## 코드 구조

로드 순서(`index.html` 하단 `<script>` 순서 그대로):

```
core/hub.js                     등록소 MP (MP.addChar · MP.addBoss). 모든 모듈이 window.MP에 붙는다
src/store/                      LocalStorageRepository → state-schema(정규화·기본값) → AppStore
src/mediators/                  Character / Echo / Team / Boss Mediator, 이를 묶는 AppMediator
src/services/                   계산 로직 — WeaponCalculator, EchoCalculator, CharacterCalculator,
                                TeamCalculator(파티 강도·보스 진행), RecommendationService(자동 추천),
                                SpecUpManager(에코 스펙업, 1.4), EchoScoreCalculator(에코 점수·등급, 1.5)
src/components/                 Icon, FavoriteButton, CharacterCard (HTML 문자열 생성)
data/                           cycle, conds, weapons, echoes, teams, chars/_list.js(→ chars/<id>.js)
core/chardb.js, bossdb.js, echodb.js   데이터 중개자 (CharDB · BossDB · EchoDB)
updates.js                      업데이트 탭 내용 (window.UPDATES, window.UPCOMING)
src/app/core.js → views.js → interactions.js   앱 진입점: 상수·상태 / 화면 렌더 / 이벤트
assets/styles/*.css             base, planner, pages, theme(라이트 모드), roster, profile
```

### 설계 원칙: 중개자 패턴

- **데이터 파일은 `MP`에 등록만 하고 서로를 직접 참조하지 않는다.**
- 앱·서비스 코드는 데이터를 **중개자(CharDB / BossDB / EchoDB, src/mediators)를 통해서만** 읽는다. 데이터 파일의 전역을 직접 읽지 않는다.
- 공명자 데이터는 **공명자별 파일**(`data/chars/<id>.js`)로 관리한다. 한 공명자의 정보(기본·반주·피해 비중·DPS·체인·딜증·조건부 보정·스탯·노드·에코 세트·무기·궁합)는 그 파일 하나에 모은다.
  - 새 공명자: `data/chars/<id>.js`를 만들고 `data/chars/_list.js` 목록에 id 추가. 필드 설명은 `_list.js` 상단 주석에 있다.
  - 서포터 조건부 보정(`supCond`)은 다른 공명자 정보를 컨텍스트 `C`(`C.el` · `C.has` · `C.share`)로만 읽는다.
- 여러 공명자에 걸친 조합은 `data/teams.js`, 주기(보스·파워 서킷·배치 횟수·종료 시각)는 `data/cycle.js`만 고친다.
- 새 기능이 새 데이터 영역을 만들면 그 영역의 중개자도 함께 만든다(예: 보스 정보 → `data/bosses/*.js` + BossDB).

### 계산 핵심

- **최종 스탯** = 기본 스탯 + 무기(공격력·부옵) + 고유 노드 + 에코 주옵·부옵 + 세트 2세트 효과 + 세트 조건부 효과(`MP.SET_FX`, 유지율 반영).
  - 비교 기준은 게임의 **비전투 캐릭터 정보창** 수치(무기 부옵·비전투 상시 패시브 포함).
- **스탯 배율(statFactor)** = 내 스탯 피해 기대값 ÷ 이잘키 기준 스탯 피해 기대값.
- **파티 세트 효과:** 세트가 파티원에게 주는 효과는 그 공명자의 주력 세트 대비 **차이만큼만** 반영한다.
- **공명 효율 최소치(`CharDB.erMin`) 우선순위: 이잘키 `er` → 공식 가이드 `guide.er` → 역할별 기준치(메인 120 / 서브 125 / 서포터 200).**
  - `erAdj`로 세트 보정(예: 떠오르는 구름 2세트 이상이면 −10). `erNote`는 돌파·조합 차이 안내용.
  - 공명 효율이 모자라면 **경고만** 하고 강도에는 반영하지 않는다. 사이클이 꼬이는 문제이므로 "에코를 갈아라"로 읽히지 않게 표기한다.
- **목표 스탯(크리·크피·공격력 눈금):** 공식 가이드 `guide` → 이잘키 `ijk` 순.
- **파티 강도/보스 진행:** `TeamCalculator` 주석 참고. 보스 HP 배율·점수 배율은 예측치이며 README에 그렇게 표기돼 있다.
- **에코 캡처 OCR:** tesseract.js(kor+eng, psm 6), 여러 전처리 패스 후 다수결(`EchoDB.merge`). 부옵 수치는 게임 수치 단계로 스냅, 주옵은 코스트별 최대값으로 제한. 코스트는 고정 스탯으로 추정(공격력 150 → 4코, 100 → 3코, HP 2280 → 1코). 이미지는 브라우저 밖으로 보내지 않는다.

## 테스트

```
node --test tests/*.test.mjs
```

- `tests/calculation-characterization.test.mjs`는 대표 계산 결과를 고정한 특성 테스트다. **리팩터링 중 이 값이 바뀌면 버그다.** 계산식을 의도적으로 바꾼 경우에만 기대값을 갱신하고, 왜 바뀌었는지 커밋 메시지에 적는다.
- UI를 바꾼 뒤에는 로컬 서버(예: `python -m http.server`)로 띄워 다크·라이트 모드 둘 다, 데스크톱·휴대폰 폭에서 확인한다. `file://`로 열면 이미지가 안 나올 수 있다.
- 디버그 훅: 브라우저 콘솔의 `mpDebug`(teamCalc, charScore, recommend, syn, sim, order 등).

## 버전 기록 (주소)

버전마다 패치 내역과 그때 고려·결정한 점을 따로 적어 둔다. 해당 버전 코드를 고치거나 예전 결정을 확인할 때만 그 파일을 읽는다.
새 버전을 내면 `docs/versions/v1.x.md`를 만들고 이 목록에 한 줄 추가한다(1.x.y 수정은 해당 1.x 파일에 덧붙인다).

| 버전 | 날짜 | 내용 | 파일 |
|---|---|---|---|
| 1.0 | 2026-11-04 | 첫 공개 — 파티 배치·시너지·강도·순서 정렬 | [docs/versions/v1.0.md](docs/versions/v1.0.md) |
| 1.1 | 2026-11-16 | 명조 스타일 리뉴얼·보유 캐릭터·육성 투자 효율·주기별 기록, 반주 수치화 | [docs/versions/v1.1.md](docs/versions/v1.1.md) |
| 1.2 | 2026-11-16 | 파티 자동 추천·체험 세팅, 서포터 조건부 효과, 드래그·우클릭 편성 | [docs/versions/v1.2.md](docs/versions/v1.2.md) |
| 1.3 | 2026-11-17~19 | 에코 세팅(OCR)·세트 효과, 비전투 최종 스탯, 공명력·협주력 개편, 효과 범위 규칙 | [docs/versions/v1.3.md](docs/versions/v1.3.md) |
| 1.4 | 2026-11-20~21 | 공명 모드 분리·에코 스펙업 효율, 1.4.1 에코 비교 창 | [docs/versions/v1.4.md](docs/versions/v1.4.md) |
| 1.5 | 2026-11-22 | 에코 점수·6등급(지역별 등급 아이콘), 공명자 지역, 프로필 카드 점수 표시 | [docs/versions/v1.5.md](docs/versions/v1.5.md) |

강도 계산 개편 설계(1.3.3): [docs/strength-v2.md](docs/strength-v2.md)

## 로드맵 (사용자가 정한 순서)

- ~~1.4 — 공명 모드 분리 · 에코 스펙업 효율~~ **완료 (2026-11-20)**
1. **보스 정보 페이지** — 이번 주기 보스 배너 + 패턴 토글(매트릭스 미믹 제외), 패턴별 유튜브 링크(시작 시간) 또는 스크린샷. `data/bosses/` + BossDB 구조로.
2. **에코 등급별 프로필 카드 테두리** (1.4에서 넘어옴, 2026-11-22 기획 변경) — 단계 = 에코 점수 6등급(경파 → 거랑 → 노도 → 해일 → 명식 → 어자, `MP.ECHO_GRADES`). 카드 배경 이미지는 사용자가 직접 구한다.
   - 등급 아이콘은 지역별 4종(`icons/grade/<등급>/<1~4>.webp`, 번호 = `MP.REGIONS` 순서), 어자는 공통 1개(`eoja.webp`). 공명자 지역(`region`)은 출시 버전으로 정한다: 1.x 금주 · 2.x 리나시타 · 3.0~3.4 라하이로이 · 3.5~3.8 몽주. 새 공명자 파일에도 `region`을 넣는다.
3. 보관(쓸 곳 미정): **명조 지역 컨셉 10단계** — 금주 → 검은 해안 → 리나시타 → 일곱 언덕 → 호나미 → 라하이로이 → 로야 빙원 → 라하이로이 지하 → 몽주 → 신연방. 원래 프로필 카드 테두리 단계안이었으나 2026-11-22에 에코 6등급으로 바뀜. 다른 기능에 쓸 수 있어 남겨 둔다.
4. 나중에: 픽업 추천(보유 캐릭터와 대조해 다음 픽업을 뽑을지), 간단한 업적.

### 열린 문제

- 듀얼 모니터에서 PrtSc로 화면 전체를 캡처해 붙여넣으면 OCR이 실패한다. 후보: tesseract 단어 박스로 에코 영역을 자동 감지해 잘라서 다시 읽기, 수동 자르기 폴백, Win+Shift+S 안내.
