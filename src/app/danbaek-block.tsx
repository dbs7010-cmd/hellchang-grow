import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Section } from '@/components/ui/section';
import { SubScreen } from '@/components/ui/sub-screen';
import { StanleyPortraitImage } from '@/config/character-assets';
import { Exercises } from '@/config/exercises';
import { StanleyTrainer } from '@/config/trainers';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import {
  clearPendingDanbaekBlock,
  getPendingDanbaekBlock,
  subscribeToDanbaekBlock,
} from '@/services/world/block-handoff';
import { buildBlockPresentation, describeBlockCandidate } from '@/utils/danbaek-block-presentation';
import type { QuickStartExercise } from '@/utils/workout-start';

/**
 * 단백세상에서 막혔을 때 스탠리가 설명하는 화면.
 *
 * 이 화면은 **WORLD가 아니다.** 스테이지도 판정도 여기서 하지 않는다 — WORLD가 이미 내린
 * 판정(`StageBlock`)을 받아서 (1) 왜 막혔는지 설명하고 (2) 지금 할 수 있는 실제 운동으로
 * 되돌리는 것, 둘뿐이다. 되돌리는 계산은 기존 어댑터(`resolveBlockRoute`)가 하고, 세션
 * 생성은 기존 `startWorkoutSession()`이 한다 — 여기서 새로 만들지 않는다.
 *
 * 관계는 스탠리 → 플레이어 → 단백이다. 스탠리가 단백이를 훈련시키는 화면이 아니라,
 * 플레이어를 가르치는 화면이고 단백이는 그 옆에서 보고 배운다.
 */
export default function DanbaekBlockScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { workoutRecords, startWorkoutSession, activeSession } = useAppData();

  const block = useSyncExternalStore(
    subscribeToDanbaekBlock,
    getPendingDanbaekBlock,
    getPendingDanbaekBlock
  );

  const presentation = useMemo(
    () =>
      block
        ? buildBlockPresentation({ block, exerciseDb: Exercises, records: workoutRecords })
        : null,
    [block, workoutRecords]
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleClose = () => {
    clearPendingDanbaekBlock();
    goBack();
  };

  /**
   * 후보를 누르면 **기존 세션 시작 경로 하나**로 들어간다 (운동 시작 화면 / PT 상담과 같은
   * 액션이다). 여기서 세션을 따로 만들지 않고, WORLD에서 왔다는 이유로 기록에 무엇을
   * 덧붙이지도 않는다 — WorkoutRecord의 의미는 그대로다.
   */
  const handleStart = async (exercise: QuickStartExercise) => {
    if (activeSession && activeSession.status !== 'completed') {
      router.replace('/session');
      return;
    }
    await startWorkoutSession('strength', {
      primaryMuscleGroup: presentation?.muscleGroup,
      initialExercises: [exercise],
    });
    // 안내는 여기서 끝난다. 다시 막혀 있는지는 WORLD가 다음에 판정한다.
    clearPendingDanbaekBlock();
    router.replace('/session');
  };

  if (!block || !presentation) {
    return (
      <SubScreen title="단백이가 막힌 곳">
        <ThemedText type="small" themeColor="textSecondary">
          지금 설명할 막힘이 없어요. 단백세상에서 막히면 스탠리가 여기서 알려 줍니다.
        </ThemedText>
        <PrimaryButton label="닫기" variant="secondary" onPress={goBack} />
      </SubScreen>
    );
  }

  return (
    <SubScreen title="단백이가 막힌 곳" accent>
      {/* 스탠리가 말하는 자리. 트레이너 화면과 같은 portrait 슬롯을 쓴다. */}
      <View style={styles.stanleyRow}>
        <ThemedView
          type="backgroundSelected"
          style={[styles.portraitSlot, { borderColor: theme.border }]}>
          {StanleyPortraitImage ? (
            <Image source={StanleyPortraitImage} style={styles.portraitImage} contentFit="cover" />
          ) : (
            <ThemedText style={styles.portraitEmoji}>{StanleyTrainer.portraitPlaceholder}</ThemedText>
          )}
        </ThemedView>
        <View style={styles.stanleyText}>
          <ThemedText type="smallBold">{StanleyTrainer.displayName}</ThemedText>
          {presentation.stanleyLines.map((line) => (
            <ThemedText key={line} type="small" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
        </View>
      </View>

      {/* WORLD가 준 판정을 그대로 보여준다 — 화면이 다시 계산하거나 부풀리지 않는다. */}
      <Section title="막힌 이유">
        <ThemedView type="backgroundElement" style={[styles.factCard, { borderColor: theme.border }]}>
          <FactRow label="필요한 동작" value={presentation.familyLabel} />
          {presentation.requiredStageLabel && (
            <FactRow label="필요한 정도" value={presentation.requiredStageLabel} />
          )}
          {presentation.requiredExercise && (
            <FactRow label="요구 운동" value={presentation.requiredExercise.name} />
          )}
        </ThemedView>
      </Section>

      {presentation.exercises.length > 0 ? (
        <Section title="지금 할 수 있는 운동">
          {presentation.exercises.map((exercise, index) => (
            <Pressable
              key={exercise.exerciseId}
              onPress={() => handleStart(exercise)}
              accessibilityRole="button"
              accessibilityLabel={`${exercise.exerciseName}으로 운동 시작`}
              style={[styles.candidate, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.candidateText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {exercise.exerciseName}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {describeBlockCandidate(presentation, exercise)}
                </ThemedText>
              </View>
              <ThemedText type="captionBold" style={{ color: theme.gold }}>
                {index === 0 ? '이 운동으로 시작 ›' : '시작 ›'}
              </ThemedText>
            </Pressable>
          ))}
        </Section>
      ) : (
        /*
          후보가 없는 계열(아직 운동이 매핑되지 않은 carry / locomotion 등). 없는 운동을
          지어내지 않고, 대신 항상 열려 있는 기존 경로로 보낸다.
        */
        <Section title="지금 할 수 있는 운동">
          <ThemedView type="backgroundElement" style={[styles.factCard, { borderColor: theme.border }]}>
            <ThemedText type="small">{presentation.emptyLine}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              오늘 하고 싶은 운동으로 시작하셔도 됩니다.
            </ThemedText>
          </ThemedView>
          <PrimaryButton
            label="운동 고르러 가기"
            variant="secondary"
            onPress={() => {
              clearPendingDanbaekBlock();
              router.replace('/workout-start');
            }}
          />
        </Section>
      )}

      <PrimaryButton label="나중에 하기" variant="secondary" onPress={handleClose} />
    </SubScreen>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.factValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stanleyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  /** 트레이너 화면과 같은 3:4 슬롯을 조금 작게 쓴다. */
  portraitSlot: {
    width: 72,
    height: 96,
    borderRadius: Radius.large,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitEmoji: {
    fontSize: 28,
    opacity: 0.45,
  },
  stanleyText: {
    flex: 1,
    gap: Spacing.one,
  },
  factCard: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  factValue: {
    flexShrink: 1,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.large,
    padding: Spacing.three,
    minHeight: Layout.compactRowHeight,
    gap: Spacing.two,
  },
  candidateText: {
    flex: 1,
    gap: Spacing.half,
  },
});
