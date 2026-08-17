import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { AiQuickActionIds, AiQuickActionLabels } from '@/config/ai-quick-actions';
import { StanleyTrainer } from '@/config/trainers';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getTodayRecords } from '@/data/workout-repository';
import { TrainerDialogueLine } from '@/types/trainer';

function pickLine(lines: TrainerDialogueLine[]): string {
  return lines[Math.floor(Math.random() * lines.length)].text;
}

export default function TrainerScreen() {
  const { workoutRecords, hasSubscriptionAccess, trainerUsage, watchRewardedAd, subscribeMock, sendAiQuickAction } =
    useAppData();
  const hasRecordedToday = getTodayRecords(workoutRecords).length > 0;

  const [stanleyLine, setStanleyLine] = useState(
    hasRecordedToday
      ? StanleyTrainer.dialogueSet.greetingRecordedToday[0].text
      : StanleyTrainer.dialogueSet.greetingNoRecordToday[0].text
  );
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const hasAiAccess = hasSubscriptionAccess || trainerUsage.rewardedPtUsesRemaining > 0;

  const handleQuickAction = async (actionId: (typeof AiQuickActionIds)[number]) => {
    setAiLoading(true);
    try {
      const message = await sendAiQuickAction(actionId);
      setAiReply(message?.text ?? null);
    } finally {
      setAiLoading(false);
    }
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
                hasRecordedToday
                  ? pickLine(StanleyTrainer.dialogueSet.greetingRecordedToday)
                  : pickLine(StanleyTrainer.dialogueSet.greetingNoRecordToday)
              )
            }
          />
          <Chip
            label="루틴 확인 (준비중)"
            onPress={() => setStanleyLine('루틴 짜주는 기능은 곧 붙일게. 조금만 기다려.')}
          />
          <Chip
            label="격려 받기"
            onPress={() => setStanleyLine(pickLine(StanleyTrainer.dialogueSet.encouragement))}
          />
          <Chip
            label="놀림 받기"
            onPress={() => setStanleyLine(pickLine(StanleyTrainer.dialogueSet.tease))}
          />
        </View>
      </SectionCard>

      <SectionCard title="AI PT">
        {hasAiAccess ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {hasSubscriptionAccess
                ? '구독 중이라 광고 없이 이용할 수 있어요.'
                : `남은 이용 횟수: ${trainerUsage.rewardedPtUsesRemaining}회`}
            </ThemedText>
            <View style={styles.chipRow}>
              {AiQuickActionIds.map((actionId) => (
                <Chip
                  key={actionId}
                  label={AiQuickActionLabels[actionId]}
                  onPress={() => handleQuickAction(actionId)}
                />
              ))}
            </View>
            {aiLoading && (
              <ThemedText type="small" themeColor="textSecondary">
                생각 중...
              </ThemedText>
            )}
            {aiReply && !aiLoading && <ThemedText type="small">{aiReply}</ThemedText>}
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {pickLine(StanleyTrainer.dialogueSet.adPitch)}
            </ThemedText>
            <PrimaryButton label="광고 보고 이용하기" onPress={watchRewardedAd} />
            <PrimaryButton
              label="구독하기 (테스트)"
              variant="secondary"
              onPress={() => subscribeMock('pro')}
            />
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
