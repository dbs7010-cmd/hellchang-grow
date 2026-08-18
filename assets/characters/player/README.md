# 플레이어 캐릭터 이미지 위치

최종 캐릭터 아트(정면/정측면/측면/후측면/후면)가 준비되면 이 폴더에 넣고
`src/config/character-assets.ts`의 `PlayerCharacterImages`에 경로를 연결한다.

아직 이 폴더가 비어 있는 동안은 `CharacterSilhouette` 컴포넌트가 도형 기반
placeholder를 대신 그린다. UI 코드는 이 폴더의 실제 파일 유무와 무관하게
동작한다 — 이미지가 추가되면 코드 수정 없이 자동으로 교체된다.
