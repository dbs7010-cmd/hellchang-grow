import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface PhotoSlotProps {
  label: string;
  photoUri?: string;
}

/** 사진이 없는 날짜를 깨진 이미지가 아니라 명확한 placeholder로 보여준다. */
export function PhotoSlot({ label, photoUri }: PhotoSlotProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.image} contentFit="cover" />
      ) : (
        <ThemedView type="backgroundSelected" style={styles.empty}>
          <ThemedText style={styles.emptyEmoji}>🖼️</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            사진 없음
          </ThemedText>
        </ThemedView>
      )}
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Spacing.two,
  },
  empty: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  label: {
    textAlign: 'center',
  },
});
