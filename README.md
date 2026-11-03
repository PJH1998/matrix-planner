# 매트릭스 플래너

명조: 워더링 웨이브 **종말 매트릭스**용 파티 배치 도구입니다.

- 보유 공명자만 골라 드래그 앤 드롭으로 3인 파티를 배치합니다. 우클릭하면 해제됩니다.
- 공명자별 배치 횟수(기본 1회, 서포터·긴급 공명자 2회)를 자동으로 계산합니다.
- 이번 주기의 보스 저항·특성, 파워 서킷 수치, 피해 증가 공명자를 함께 보여 줍니다.
- 레벨·공명 체인·무기로 파티 강도를 계산해 "약한 파티 앞, 강한 파티 뒤"로 정렬합니다.
- Google로 로그인하면 내 데이터가 내 계정에만 저장됩니다. 로그인하지 않으면 브라우저에 저장됩니다.

## 파일 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 사이트 전체 (화면, 공명자·주기 기본 데이터, 로직) |
| `firebase-config.js` | Firebase 웹 앱 설정. 비워 두면 로그인 없이 동작 |
| `firestore.rules` | Firestore 보안 규칙. 각자 `users/{uid}` 문서만 읽고 쓰기 |
| `portraits/` | 초상화 이미지 폴더 |
| `scripts/build-portrait-index.mjs` | `portraits/index.json` 생성 스크립트 (배포 때 자동 실행) |
| `.github/workflows/pages.yml` | `main`에 푸시하면 GitHub Pages로 배포 |

## 초상화 추가하기

`portraits/` 폴더에 이미지를 넣고 커밋하면 됩니다. 파일 이름은 공명자 **id** 또는 **한국어 이름**으로 맞춥니다.

```
portraits/suoming.webp
portraits/쇄명.png
portraits/방랑자(전도).png
```

정사각형, 160~256px, webp를 권장합니다. 배포할 때 목록(`index.json`)이 자동으로 만들어지니 직접 고칠 필요는 없습니다.
공명자 id 목록은 사이트의 **데이터** 탭 > 공명자 데이터에서 볼 수 있습니다.

## 처음 한 번 하는 설정

### 1. GitHub Pages 켜기

저장소 **Settings > Pages > Build and deployment > Source**를 **GitHub Actions**로 바꿉니다.
이후 `main`에 푸시할 때마다 `https://<계정>.github.io/matrix-planner/`로 배포됩니다.

### 2. Google 로그인 켜기 (선택)

Firebase 무료(Spark) 요금제만 사용합니다. 카드를 등록하지 않으므로 요금이 청구되지 않고, 한도를 넘으면 그날만 저장이 멈춥니다.

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 프로젝트를 만듭니다. Google 애널리틱스는 꺼도 됩니다.
2. **Build > Authentication > 시작하기 > Sign-in method**에서 **Google**을 사용 설정합니다.
3. **Authentication > 설정 > 승인된 도메인**에 `<계정>.github.io`를 추가합니다.
4. **Build > Firestore Database > 데이터베이스 만들기**를 누릅니다. 위치는 `asia-northeast3 (서울)`, 모드는 프로덕션 모드로 고릅니다.
5. Firestore의 **규칙** 탭에 이 저장소의 `firestore.rules` 내용을 붙여 넣고 게시합니다.
6. **프로젝트 설정 > 내 앱 > 웹 앱 추가(</>)**로 앱을 등록하고, 나오는 `firebaseConfig` 값을 `firebase-config.js`에 넣어 커밋합니다.

`apiKey` 같은 웹 설정 값은 공개되어도 되는 식별 정보입니다. 데이터 보호는 5번의 보안 규칙이 맡습니다.

> Cloud Storage는 쓰지 않습니다. 무료 요금제에서는 사용할 수 없어서, 초상화는 저장소 파일로 관리합니다.

## 주기가 바뀌면

`index.html`의 `DEFAULT_CYCLE`(보스, 파워 서킷, 배치 2회 공명자, 긴급 공명자, 피해 증가 공명자)을 고쳐 커밋합니다.
새 공명자는 `DEFAULT_CHARS` 배열에 한 줄을 추가합니다. 사이트의 **주기 설정**, **데이터** 탭에서 JSON으로 먼저 시험해 본 뒤 옮기면 편합니다.

## 저작권

게임 이름, 캐릭터 이름, 초상화 등 게임 관련 저작권은 KURO GAMES에 있습니다. 이 사이트는 비영리 팬 도구입니다.
