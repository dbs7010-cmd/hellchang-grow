import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DanbaekVoiceBubble } from '@/components/character/danbaek-voice-bubble';
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
import { markWorldWorkoutHandoff } from '@/services/world/world-visit';
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
    /*
      막힌 곳에서 운동하러 나왔다는 사실만 메모리에 남긴다 — 결과 화면이 이걸 보고 곧장
      그 자리로 돌려보낸다. 운동 기록에는 아무것도 덧붙이지 않는다: WorkoutRecord는
      단백세상에서 왔든 아니든 같은 의미여야 한다.
    */
    if (presentation) {
      markWorldWorkoutHandoff({
        stageId: presentation.stageId,
        movementFamily: presentation.movementFamily,
      });
    }
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

  const primaryAction = presentation.primaryAction;

  return (
    <SubScreen title="단백이가 막힌 곳" accent>
      {/*
        사용자가 알아야 할 것은 셋뿐이다: 단백이가 왜 못 지나가는지 / 무엇을 배우면 되는지 /
        지금 뭘 하면 되는지. movement family나 계약 용어를 이해할 필요는 없다.
      */}
      <DanbaekVoiceBubble line={presentation.danbaekLine} status={presentation.whatToLearnLine} />

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

      {/*
        지금 할 행동은 **하나**로 세운다. 후보를 전부 같은 무게로 늘어놓으면 고르는 일이
        일이 된다 — 나머지는 아래에 작게 둔다. 순서는 라우팅 어댑터가 정한 그대로다.
      */}
      {primaryAction ? (
        <>
          <PrimaryButton
            label={primaryAction.label}
            subLabel={primaryAction.note}
            variant="gold"
            size="large"
            onPress={() => handleStart(primaryAction.exercise)}
          />

          {presentation.otherExercises.length > 0 && (
            <Section title="다른 운동으로 해도 돼요">
              {presentation.otherExercises.map((exercise) => (
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
                    시작 ›
                  </ThemedText>
                </Pressable>
              ))}
            </Section>
          )}
        </>
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
