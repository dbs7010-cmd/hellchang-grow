# 헬창키우기 (가칭)

운동한 내용을 나중에 입력하는 기록 앱이 아니다. **[운동 시작]을 누르는 순간 현실의 운동과 앱의
세션이 같이 시작되는 실시간 운동 연동 게임**이다. 기록은 플레이의 결과로 자동으로 생긴다.

Expo (SDK 57) + expo-router 기반의 React Native 앱이며, 모든 데이터는 기기 안에만 저장된다.

## 시작하기

```bash
npm install
npx expo start
```

Expo Go 또는 개발 빌드에서 열면 된다. 웹(`npx expo start --web`)에서도 대부분의 흐름을 확인할 수 있다.

## 이 저장소를 읽는 순서

작업을 시작하기 전에 다음을 순서대로 읽는다. 규칙의 원본은 각 문서이며, 여기에 복사하지 않는다.

1. [`AGENTS.md`](AGENTS.md) — Expo 버전 규칙
2. [`CLAUDE.md`](CLAUDE.md) — 제품 불변 규칙(NON-NEGOTIABLE)과 AI COMMAND CENTER 운영 규칙
3. [`PROJECT_STATE.md`](PROJECT_STATE.md) — 지금 무엇이 진행 중이고 무엇이 막혀 있는지
4. [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md)
5. 필요할 때 [`DECISION_LOG.md`](DECISION_LOG.md) · [`FAILURE_LOG.md`](FAILURE_LOG.md)

출시 준비 상태는 [`RELEASE_AUDIT.md`](RELEASE_AUDIT.md), 개인정보 관련 사실은
[`docs/PRIVACY.md`](docs/PRIVACY.md)에 정리돼 있다.

## 지켜야 하는 것

- **웨이트가 중심축이고, 루틴은 선택이며, [운동 시작]은 폼 없이 바로 세션으로 이어진다.**
- **실제 신체 수치와 게임 진행도는 다른 데이터다.** 운동 횟수나 XP가 실제 체중·체지방률을 만들지 않는다.
- `assets/characters/danbaek/canon/`은 시각 CANON이다. 코드와 어긋나면 임의로 맞추지 말고 멈추고 보고한다.
- 실제 LLM API / 광고 SDK / 인앱결제 / 추천 서버는 V1에서 연결하지 않는다 — 인터페이스와 대체 구현까지만 둔다.

자세한 내용과 이유는 `CLAUDE.md`에 있다.

## 검증

새 테스트 프레임워크를 쓰지 않는다. 순수 함수를 `scripts/verify-*.ts`가 직접 돌리고, 각 스크립트는
PASS/FAIL을 출력하며 실패하면 종료 코드 1로 끝난다.

```bash
npx tsc --noEmit
npm run lint
npm run verify:core-loop      # 운동 완료 파이프라인(재시도/중복 방지)
npm run verify:storage        # 저장값 손상과 부팅 복구
npm run verify:monetization   # 광고 보상 경계
npm run verify:release        # 출시 설정(식별자/권한/EAS 프로필)
```

전체 목록은 `package.json`의 `verify:*` 스크립트에 있다. 무엇을 언제 돌릴지는
`.agents/skills/helchang-verify`가 정한다.

## 폴더 구조

```
src/app/          expo-router 화면 (탭 / 온보딩 / 세션 / AI 채팅 …)
src/components/   화면이 공유하는 UI와 캐릭터 렌더러
src/config/       바뀔 수 있는 숫자와 표시 문자열 (app-config, exercises, growth-config …)
src/context/      AppDataProvider — 상태와 액션의 단일 진입점
src/data/         AsyncStorage repository 계층
src/services/     외부 연동 경계 (광고 / 구독 / 추천인 / AI PT / 성장 엔진)
src/types/        도메인 타입
src/utils/        순수 함수 — 규칙은 전부 여기에 있고 verify가 이것을 돌린다
scripts/          verify-*.ts 검증 스크립트
docs/             기획 · 구조 · 로드맵 · 에셋 · 개인정보
```

## 라이선스

[LICENSE](LICENSE) 참고.
