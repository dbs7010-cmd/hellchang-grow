import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';

export default function PhotoStartScreen() {
  const router = useRouter();

  return (
    <ScreenScroll>
      <SectionCard>
        <ThemedText style={styles.emoji}>📷</ThemedText>
        <ThemedText type="subtitle" style={styles.centerText}>
          내 사진으로 시작하기
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          내 사진을 기반으로 시작하는 기능은 아직 준비 중이에요. 지금은 무료 체형 선택으로
          시작하고, 나중에 사진 기반 방식으로 업그레이드할 수 있어요.
        </ThemedText>
      </SectionCard>

      <PrimaryButton
        label="무료 체형 선택으로 시작하기"
        onPress={() => router.replace('/gender')}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  emoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
