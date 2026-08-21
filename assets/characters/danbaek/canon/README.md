# Danbaek CANON — LOCKED

이 폴더는 사용자가 확정한 `단백이 성장 시스템 기본 이미지`를 최우선 시각 CANON으로 보존한다.

## 절대 규칙
- 새 캐릭터 디자인으로 재해석하지 않는다.
- 얼굴, 머리/몸 비율, 어깨/팔/다리 실루엣, 검은 외곽선, 흰색 몸, 약간 엉성한 손그림 느낌을 임의 변경하지 않는다.
- 3D/반실사/깔끔한 벡터 마스코트로 바꾸지 않는다.
- 성장 시스템은 기존 WORKOUT CORE / GROWTH ENGINE / BODY STATE ENGINE 계약을 변경하지 않는다.
- Stage 0 및 이후 성장 시각 구현은 `danbaek_growth_system_canon.png`를 기준으로 맞춘다.

## 현재 자료
- `danbaek_growth_system_canon.png`: 사용자가 직접 확정한 MASTER CANON 원본.
- `manifest.json`: CANON 상태와 구현 규칙.

## 구현 원칙
이번 커밋은 CANON 원본을 저장소에 영구 보존하기 위한 투입이다. Codex는 이 이미지를 참고해 새 캐릭터를 디자인하는 것이 아니라, 기존 Renderer의 parametric Stage 0가 원본 실루엣을 최대한 재현하도록 맞춰야 한다. CANON과 코드가 충돌하면 임의 변경하지 말고 중단 후 보고한다.
