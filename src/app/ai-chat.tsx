import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiPtPanel } from '@/components/trainer/ai-pt-panel';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StanleyTrainer } from '@/config/trainers';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { pickTrainerLine } from '@/utils/trainer-dialogue';

/**
 * 16 SCREEN 중 "10 AI CHAT". 일반 SectionCard 설정 화면이 아니라 messenger 계층 구조를
 * 쓴다 — 실제 대화 UI는 기존 AiPtPanel(트레이너 portrait+bubble+quick action+input)을
 * 그대로 재사용한다. 광고/구독 안내는 여기(=실제 이용하려는 순간)에서만 보여준다 —
 * PT 허브 메인 화면을 더 이상 점유하지 않는다.
 */
export default function AiChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    hasSubscriptionAccess,
    hasAiPtAccess,
    trainerUsage,
    watchRewardedAd,
    subscribeMock,
    sendAiQuickAction,
    sendAiMessage,
  } = useAppData();

  const [aiPanelOpened, setAiPanelOpened] = useState(hasAiPtAccess);

  const handleWatchAd = async () => {
    await watchRewardedAd();
    setAiPanelOpened(true);
  };

  const handleSubscribe = async () => {
    await subscribeMock('pro');
    setAiPanelOpened(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 닫기
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={{ color: theme.gold }}>
          AI 상담
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {aiPanelOpened ? (
          <AiPtPanel
            accessLabel={
              hasSubscriptionAccess
                ? '구독 중이라 광고 없이 이용할 수 있어요.'
                : `남은 이용 횟수: ${trainerUsage.rewardedPtUsesRemaining}회`
            }
            onQuickAction={sendAiQuickAction}
            onSendMessage={sendAiMessage}
          />
        ) : (
          <View style={styles.paywall}>
            <ThemedText type="small" themeColor="textSecondary">
              {StanleyTrainer.portraitPlaceholder} {pickTrainerLine(StanleyTrainer.dialogueSet.adPitch).text}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              광고를 보거나 구독하면 AI PT를 이용할 수 있어요. 어느 쪽이든 AI 기능은 똑같아요 — 접근
              방식만 다를 뿐이에요.
            </ThemedText>
            <PrimaryButton label="광고 보고 이용하기" variant="gold" onPress={handleWatchAd} />
            <PrimaryButton label="구독하기 (테스트)" variant="secondary" onPress={handleSubscribe} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: Spacing.six,
  },
  paywall: {
    gap: Spacing.three,
  },
});
