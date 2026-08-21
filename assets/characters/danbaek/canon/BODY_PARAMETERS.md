# BODY PARAMETER CONNECTION — LOCKED CONTRACT

Renderer는 기존 `DanbaekBodyParameters` 계약을 변경하지 않고 그대로 소비한다.

Expected existing fields:
- chestScale
- shoulderScale
- armScale
- backWidth
- backThickness
- waistScale
- abdomenDefinition
- gluteScale
- thighScale
- calfScale
- overallMass
- fatSoftness
- definition

Stage 0 검증에서는 위 값의 성장 효과를 과장하지 않는다. 우선 MASTER CANON의 기본 실루엣을 정확히 맞춘 뒤 이후 단계에서 부위별 성장 시각 연결을 진행한다.
