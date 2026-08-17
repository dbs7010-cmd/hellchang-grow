import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { Spacing } from '@/constants/theme';

export default function OnboardingStartScreen() {
  const router = useRouter();

  return (
    <ScreenScroll>
      <ThemedText type="title" style={styles.title}>
        헬창키우기
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        현실에서 운동한 만큼 진행되는 운동 기록 게임이에요. 시작 방법을 골라주세요.
      </ThemedText>

      <SectionCard title="무료 체형 선택">
        <ThemedText type="small" themeColor="textSecondary">
          성별 표현과 체형을 직접 골라서 바로 시작해요.
        </ThemedText>
        <PrimaryButton label="체형 고르고 시작하기" onPress={() => router.push('/gender')} />
      </SectionCard>

      <SectionCard title="내 사진으로 시작">
        <ThemedText type="small" themeColor="textSecondary">
          내 사진 기반으로 시작하는 기능은 준비 중이에요.
        </ThemedText>
        <PrimaryButton
          label="내 사진으로 시작하기"
          variant="secondary"
          onPress={() => router.push('/photo-start')}
        />
      </SectionCard>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: Spacing.six,
  },
});
