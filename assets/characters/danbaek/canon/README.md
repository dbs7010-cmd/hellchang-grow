# Danbaek CANON — LOCKED

이 폴더는 사용자가 확정한 `단백이 성장 시스템 기본 이미지`를 최우선 시각 CANON으로 보존한다.

## 절대 규칙
- 새 캐릭터 디자인으로 재해석하지 않는다.
- 얼굴, 머리/몸 비율, 어깨/팔/다리 실루엣, 검은 외곽선, 흰색 몸, 약간 엉성한 손그림 느낌을 임의 변경하지 않는다.
- 3D/반실사/깔끔한 벡터 마스코트로 바꾸지 않는다.
- 성장 시스템은 기존 WORKOUT CORE / GROWTH ENGINE / BODY STATE ENGINE 계약을 변경하지 않는다.
- Stage 0 및 이후 성장 시각 구현은 `danbaek_growth_system_canon.png`를 기준으로 맞춘다.

## 현재 자료
- `danbaek_growth_system_canon.png`: 사용자 확정 MASTER CANON 원본.
- `stages/danbaek_stage_01.svg` ~ `danbaek_stage_10.svg`: 전체 성장 방향/상한 검증용 전신 CANON.
- `layered/danbaek_stage0_layered_master.svg`: Stage 0를 안정적인 body id로 분리한 구현용 마스터.
- `layered/layer_contract.json`: DanbaekBodyParameters와 허용 부위/변형 방식의 기계 판독 계약.
- `layered/PART_PATH_SPEC.md`: 각 부위의 승인 좌표, seam anchor, path 분리 허용 범위. Codex는 이 범위 안에서 Stage 0 path를 국소 분리/변형할 수 있다.
- `manifest.json`: CANON 상태와 구현 규칙.

## 구현 원칙
CANON은 참고해서 새 캐릭터를 디자인하는 자료가 아니다. `layered/`는 기존 CANON을 실제 부위별 Renderer로 연결하기 위해 추가된 LOCKED DERIVATIVE 명세다.

단일 부위 변화에 full-body stage SVG를 통째로 교체하지 않는다. `PART_PATH_SPEC.md`의 approved region과 seam anchor를 사용해 해당 부위만 변형하며, 이 명세 범위의 path 분리는 명시적으로 승인된 구현 작업으로 취급한다.

CANON과 코드가 충돌하거나 approved region 밖의 새 실루엣이 필요해지면 임의 변경하지 말고 중단 후 보고한다.
