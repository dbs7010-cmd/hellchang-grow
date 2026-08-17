import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';
import { GenderExpression } from '@/types/user';

const options: { id: GenderExpression; label: string }[] = [
  { id: 'male', label: '남' },
  { id: 'female', label: '여' },
];

export default function GenderScreen() {
  const router = useRouter();
  const { draft, setGenderExpression } = useOnboardingDraft();

  return (
    <ScreenScroll>
      <ThemedText type="subtitle">성별 표현을 골라주세요</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        캐릭터 표현에 사용돼요. 나중에 설정에서 바꿀 수 있어요.
      </ThemedText>

      <View style={styles.options}>
        {options.map((option) => (
          <PrimaryButton
            key={option.id}
            label={option.label}
            variant={draft.genderExpression === option.id ? 'primary' : 'secondary'}
            onPress={() => setGenderExpression(option.id)}
            style={styles.optionButton}
          />
        ))}
      </View>

      <PrimaryButton label="다음" onPress={() => router.push('/body-preset')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  options: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  optionButton: {
    flex: 1,
  },
});
