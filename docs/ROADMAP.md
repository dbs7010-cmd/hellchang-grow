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

## M2 — 핵심 루프를 실제로 만져볼 수 있는 수준

- [x] 홈 화면 핵심 루프 강화 (오늘 상태 → 기록 → 트레이너 반응 → streak → 히스토리로 자연스럽게 이어지도록 재구성)
- [x] 운동 기록에 `sports` 카테고리 추가, 기록 직후 트레이너 반응 한 줄 표시
- [x] 트레이너 대사 확충 + streak 조건형 대사(`streakPraise`) 추가, 조건 분기 로직을 `utils/trainer-dialogue.ts`로 공통화
- [x] AI PT 진입 UX를 빠른 질문 버튼 + 자유 입력창이 있는 `AiPtPanel`로 교체 (`AITrainerService.sendMessage` 추가, 여전히 mock)
- [x] 구독/광고 보상 AI PT 접근 로직 공통화 (`consumeAiAccess`) — 응답 품질 차이 없음을 코드로도 보장
- [x] 사진 기반 시작 플로우를 실제 UI로 교체 (`expo-image-picker`, 권한 거부/취소/없음 처리, 하루 1회 제한 + DEV 우회)
- [x] 체형 미세 조절 값을 `BodyAvatarPreview`(도형 + Reanimated)로 실시간 시각화, 온보딩/홈에서 재사용
- [x] 히스토리를 신체 기록 + 운동 기록 통합 뷰로 재구성 (`buildHistoryDays`), 저장 구조는 그대로 유지
- [x] 히스토리에 전후 비교 UI 뼈대 추가 (두 날짜 선택 → 사진/체중 비교, 사진 없는 날짜는 명확한 placeholder)
- [x] streak 계산을 순수 함수로 분리(`utils/streak.ts`)하고 같은 날 중복/다음 날 연속/하루 건너뜀/월말/연말 경계를 `scripts/verify-streak.ts`로 검증
- [x] 오픈 이벤트 패스를 홈 화면에서도 자연스럽게 인지하도록 배너 추가, 추천인 중복 등록 방지 UI(설정 화면에서 등록된 코드 표시)

M2에서도 실제 LLM API, 광고 SDK, 인앱결제, 추천 서버는 연결하지 않는다 — 서비스 인터페이스와 mock 구조를 유지한다. 사진 선택 UI는 실제로 동작하지만 AI 이미지 변환은 여전히 없다.

## M3 — 다음 단계 (아직 착수하지 않음)

- 실제 캐릭터/트레이너 아트 자산 반영 (이모지 → 실제 이미지, `TrainerProfile.portraitPlaceholder` 대체)
- AI PT 대화 로그를 세션 간 유지할지 여부 결정 (현재는 화면을 벗어나면 사라지는 로컬 state)
- 히스토리 전후 비교에 실제 신체 변화 지표(체지방률 등) 추가 검토
- 알림/리마인더 검토
- 트레이너 대사에 더 다양한 조건(연속 기록 실패, 특정 카테고리 반복 등) 반영할지 검토
- 실제 서비스 연동 착수 여부는 별도 논의 후 결정 (LLM API, 광고 SDK, 결제 SDK, 실제 추천 서버 등)
