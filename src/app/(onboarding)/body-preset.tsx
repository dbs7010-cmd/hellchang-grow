import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import {
  BodyPresetDescriptions,
  BodyPresetIds,
  BodyPresetLabels,
} from '@/config/body-presets';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';

export default function BodyPresetScreen() {
  const router = useRouter();
  const { draft, setBodyPreset } = useOnboardingDraft();

  return (
    <ScreenScroll>
      <ThemedText type="subtitle">체형 프리셋을 골라주세요</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        참고용 시작점이에요. 다음 화면에서 직접 조절할 수 있어요.
      </ThemedText>

      {BodyPresetIds.map((presetId) => {
        const selected = draft.bodyPresetId === presetId;
        return (
          <Pressable key={presetId} onPress={() => setBodyPreset(presetId)}>
            <ThemedView
              type={selected ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.presetCard}>
              <ThemedText type="smallBold">{BodyPresetLabels[presetId]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {BodyPresetDescriptions[presetId]}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}

      <PrimaryButton label="다음" onPress={() => router.push('/body-adjust')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  presetCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
  },
});
