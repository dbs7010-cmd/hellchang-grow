# DANBAEK CANON — LOCKED

이 폴더는 사용자가 확정한 `단백이 성장 시스템 기본 이미지`를 실제 게임 제작 기준으로 보존하는 CANON 에셋 묶음이다.

## 절대 규칙
- 캐릭터 외형, 얼굴, 비율, 선화 스타일, Lv.1~Lv.10 성장 방향을 임의로 재설계하지 않는다.
- WORKOUT CORE / GROWTH ENGINE / Muscle SP / DanbaekBodyState / DanbaekBodyParameters는 이 아트를 변경하는 근거가 아니다.
- 새 시스템은 이 CANON에 맞춰 연결한다.
- `waist`, `glute`, `thigh`, `calf`, `fatSoftness`, `definition`처럼 별도 원본 프레임이 없는 값은 기존 실루엣/근육선을 보정하는 렌더링 값으로만 사용하고 새 캐릭터 디자인을 만들지 않는다.

## 파일
- `danbaek_growth_canon.svg` — Lv.1~Lv.10 전체 성장 기준
- `danbaek_part_growth_canon.svg` — 부위별 성장 적용 기준
- `danbaek_animation_canon.svg` — IDLE/WALK/운동/기타/성장 애니메이션 기준
- `danbaek_renderer_map_canon.svg` — BodyParameters 연결 기준
- `stages/danbaek_stage_01.svg` ~ `10.svg` — 게임용 단계별 벡터 원본
- `manifest.json` — 렌더러가 읽을 수 있는 단계/파라미터 매핑

이 폴더를 수정할 때는 CANON을 '개선'하지 말고 정밀화/분리/렌더링 연결만 한다.
