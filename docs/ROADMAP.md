# 헬창키우기 (가칭) — 로드맵

기획: [[product-spec]] · 구조: [[architecture]]

## M0 — 기반 구축

- [x] 저장소/`package.json` 분석, 기존 SDK 57 expo-router 템플릿 파악
- [x] 기획 문서 고정 (`docs/PRODUCT_SPEC.md`)
- [x] 아키텍처 문서 고정 (`docs/ARCHITECTURE.md`)
- [x] 로컬 저장 라이브러리 도입 (`@react-native-async-storage/async-storage`, SDK 호환 버전)
- [x] 폴더 구조 정리 (`config` / `types` / `services` / `data` / `context`)
- [x] 도메인 타입 정의
- [x] 중앙 config (`app-config.ts`, `body-presets.ts`, `trainers.ts`)
- [x] 서비스 인터페이스 + mock 구현 (광고 / 구독 / 추천인 / AI 트레이너)
- [x] repository 기반 로컬 저장 계층
- [x] `AppDataProvider` + 기본 navigation shell (`Stack.Protected`: 온보딩 vs 탭)

## M1 — 최소 실행 가능한 뼈대

- [x] 온보딩 진입 화면 (무료 체형 선택 / 내 사진으로 시작)
- [x] 내 사진으로 시작 placeholder 화면 (V1 미구현 안내, 무료 체형 선택으로 유도)
- [x] 성별 표현 선택
- [x] 체형 프리셋 선택
- [x] 체형 조절 placeholder (수동 보정 슬라이더, 시각적 반영은 다음 단계)
- [x] 홈 화면 (오늘 상태 / 트레이너 / 연속 기록 / 최근 변화, 카드 최소화)
- [x] 운동 기록 추가 + 오늘 기록 표시
- [x] 기본 스탠리 NPC 카드 (선택형 상호작용, 광고 시청 mock으로 AI PT 잠금 해제 데모)
- [x] 히스토리 기본 목록 (신체 히스토리 + 운동 기록)
- [x] 설정 화면 (mock 구독/추천인/오픈 이벤트 상태, 데이터 초기화)

M1에서는 사진 AI 생성, 실제 AI PT, 결제, 광고 SDK를 구현하지 않는다 — 모두 인터페이스/placeholder까지만.

## M2 — 다음 단계 (아직 착수하지 않음)

- 체형 미세 조절 값을 실제 시각적 표현(placeholder 아트 이상)에 반영
- 사진 기반 시작 플로우의 실제 업로드 UI (AI 변환은 여전히 미연결)
- 트레이너 대사 콘텐츠 확충, 놀림/격려 로직 다양화
- 연속 기록 로직 고도화 (시간대/타임존 엣지 케이스)
- 히스토리 화면에 전후 비교 UI 뼈대
- 알림/리마인더 검토
- 실제 서비스 연동 착수 여부는 별도 논의 후 결정 (LLM API, 광고 SDK, 결제 SDK 등)
