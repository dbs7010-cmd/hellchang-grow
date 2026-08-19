import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 시작 화면의 캐릭터 크기 — 홈보다 작게 두고 문구가 주인공이 되게 한다. */
const INTRO_CHARACTER_HEIGHT = 260;

/**
 * 온보딩 01 — 시작.
 *
 * 첫 화면은 설명이 아니라 정체성이다. 구독/광고/HELL PASS 이야기는 여기서 하지 않는다.
 * 홈과 같은 언어(검은 배경 / Gold accent / 큰 타이포 / 캐릭터 중심)를 쓴다.
 */
export default function OnboardingStartScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four }]}>
      <View style={styles.copy}>
        <ThemedText type="heading" themeColor="textSecondary">
          헬창키우기
        </ThemedText>
        <View style={styles.slogan}>
          <ThemedText type="subtitle">
            지방은 <ThemedText type="subtitle" style={{ color: theme.gold }}>CUT</ThemedText>.
          </ThemedText>
          <ThemedText type="subtitle">
            근력은 <ThemedText type="subtitle" style={{ color: theme.gold }}>UP</ThemedText>.
          </ThemedText>
          <ThemedText type="subtitle">내 몸을 키워봅시다.</ThemedText>
        </View>
      </View>

      <View style={styles.stage}>
        <CharacterSilhouette
          genderExpression="male"
          size={50}
          tone={45}
          scale={INTRO_CHARACTER_HEIGHT / CharacterIntrinsicHeight}
        />
      </View>

      <PrimaryButton
        label="시작하기"
        subLabel="1분이면 끝나요"
        variant="gold"
        size="large"
        onPress={() => router.push('/basics')}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    gap: Spacing.three,
  },
  copy: {
    gap: Spacing.two,
  },
  slogan: {
    gap: 0,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
