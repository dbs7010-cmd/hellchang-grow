import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { AiPtPanel } from '@/components/trainer/ai-pt-panel';
import { StanleyTrainer } from '@/config/trainers';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getTodayRecords } from '@/data/workout-repository';
import { getGreetingLine, pickTrainerLine } from '@/utils/trainer-dialogue';

export default function TrainerScreen() {
  const {
    workoutRecords,
    streak,
    hasSubscriptionAccess,
    hasAiPtAccess,
    trainerUsage,
    watchRewardedAd,
    subscribeMock,
    sendAiQuickAction,
    sendAiMessage,
  } = useAppData();
  const hasRecordedToday = getTodayRecords(workoutRecords).length > 0;

  const [stanleyLine, setStanleyLine] = useState(
    () =>
      getGreetingLine(StanleyTrainer.dialogueSet, {
        hasRecordedToday,
        currentStreakDays: streak.currentStreakDays,
      }).text
  );

  // AI PT 대화 도중 마지막 이용권을 써버려도 패널이 갑자기 잠금 화면으로 바뀌며
  // 대화가 사라지지 않도록, 한 번 열리면 이 화면을 벗어나기 전까지는 계속 열어둔다.
  // hasAiPtAccess를 effect로 지켜보는 대신, 접근권을 얻는 두 액션(광고 시청/구독) 핸들러에서
  // 직접 열어준다 — 초기 마운트 시 이미 접근권이 있으면 lazy initializer가 처리한다.
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
    <ScreenScroll>
      <SectionCard title={`${StanleyTrainer.displayName} ${StanleyTrainer.portraitPlaceholder}`}>
        <ThemedText type="small" themeColor="textSecondary">
          {stanleyLine}
        </ThemedText>

        <View style={styles.chipRow}>
          <Chip
            label="오늘 기록 확인"
            onPress={() =>
              setStanleyLine(
                getGreetingLine(StanleyTrainer.dialogueSet, {
                  hasRecordedToday,
                  currentStreakDays: streak.currentStreakDays,
                }).text
              )
            }
          />
          <Chip
            label="루틴 확인 (준비중)"
            onPress={() => setStanleyLine('루틴 짜주는 기능은 곧 붙일게. 조금만 기다려.')}
          />
          <Chip
            label="격려 받기"
            onPress={() => setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.encouragement).text)}
          />
          <Chip
            label="놀림 받기"
            onPress={() => setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.tease).text)}
          />
        </View>
      </SectionCard>

      <SectionCard title="AI PT">
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
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {pickTrainerLine(StanleyTrainer.dialogueSet.adPitch).text}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              광고를 보거나 구독하면 AI PT를 이용할 수 있어요. 어느 쪽이든 AI 기능은 똑같아요 —
              접근 방식만 다를 뿐이에요.
            </ThemedText>
            <PrimaryButton label="광고 보고 이용하기" onPress={handleWatchAd} />
            <PrimaryButton label="구독하기 (테스트)" variant="secondary" onPress={handleSubscribe} />
          </>
        )}
      </SectionCard>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
