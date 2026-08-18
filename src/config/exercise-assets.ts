import { ImageSourcePropType } from 'react-native';

/**
 * 실제 운동 사진/일러스트가 준비되면 Exercise DB의 id를 key로 여기에 연결한다.
 * 값이 없는 운동은 ExerciseArtSlot이 이모지 placeholder를 대신 그린다 — 코드 수정 없이
 * 에셋만 채우면 화면에 자동으로 반영된다.
 */
export const ExerciseImages: Partial<Record<string, ImageSourcePropType>> = {};
