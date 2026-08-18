import { Image } from 'expo-image';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ExerciseImages } from '@/config/exercise-assets';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ExerciseArtSlotProps {
  exerciseId?: string;
  style?: ViewStyle;
}

/**
 * 운동 이미지 영역. 실제 사진/일러스트가 없는 동안에도 CANON과 동일한 비율의 자리를
 * 확보해둔다 — ExerciseImages에 에셋이 채워지면 레이아웃 변경 없이 그대로 교체된다.
 */
export function ExerciseArtSlot({ exerciseId, style }: ExerciseArtSlotProps) {
  const theme = useTheme();
  const image = exerciseId ? ExerciseImages[exerciseId] : undefined;

  return (
    <View style={[styles.slot, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }, style]}>
      {image ? (
        <Image source={image} style={styles.image} contentFit="cover" />
      ) : (
        <ThemedText style={styles.icon}>🏋️</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  icon: {
    fontSize: 32,
    opacity: 0.5,
  },
});
