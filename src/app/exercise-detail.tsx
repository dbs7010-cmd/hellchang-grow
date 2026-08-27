import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExerciseArtSlot } from '@/components/ui/exercise-art-slot';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Section } from '@/components/ui/section';
import { SubScreen } from '@/components/ui/sub-screen';
import { getExerciseById, getResolvedExerciseById } from '@/config/exercises';
import { MuscleGroupLabels } from '@/config/muscle-groups';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { ExerciseDefinition } from '@/types/exercise';
import { findAllTimeBestWeight, findPreviousPerformance } from '@/utils/exercise-history';

const EQUIPMENT_LABELS: Record<ExerciseDefinition['equipment'], string> = {
  barbell: '바벨',
  dumbbell: '덤벨',
  machine: '머신',
  cable: '케이블',
  bodyweight: '맨몸',
  smith: '스미스머신',
  other: '기타',
};

/**
 * 14 EXERCISE DETAIL. 운동 이미지 / 대상 부위 / 운동 방법 / 내 기록 / 최고 기록.
 * 운동 데이터·기록 조회는 기존 Exercise DB와 findPreviousPerformance/findAllTimeBestWeight를
 * 그대로 재사용한다. 설명이 긴 운동에서도 아래가 잘리지 않도록 SubScreen(스크롤)을 쓴다.
 *
 * **여기는 막다른 길이 아니다.** 운동을 찾아 들어와 설명까지 읽고 나면 다음 행동은 하나뿐이다 —
 * 그 운동을 하는 것. 세션이 이미 돌고 있으면 그 세션에 담고, 없으면 이 운동 하나로 시작한다
 * (START WORKOUT FIRST — 여기서 부위/루틴을 다시 묻지 않는다).
 */
export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    workoutRecords,
    activeSession,
    startWorkoutSession,
    addExerciseToSession,
    setCurrentSessionExercise,
  } = useAppData();
  /** 연타로 세션이 두 번 만들어지거나 같은 운동이 두 번 담기지 않게 한다. */
  const [starting, setStarting] = useState(false);

  const exercise = id ? getExerciseById(id) : undefined;
  const previous = exercise ? findPreviousPerformance(exercise.id, workoutRecords) : null;
  const bestWeight = exercise ? findAllTimeBestWeight(exercise.id, workoutRecords) : undefined;

  const sessionInProgress = Boolean(activeSession && activeSession.status !== 'completed');
  /** 이미 이번 세션에 담겨 있는 운동인가. 있으면 똑같은 것을 하나 더 담지 않고 그리로 옮긴다. */
  const existingEntry =
    sessionInProgress && exercise
      ? activeSession?.exercises.find((entry) => entry.exerciseId === exercise.id)
      : undefined;

  const handleStart = async () => {
    if (!exercise || starting) return;
    setStarting(true);
    try {
      if (sessionInProgress) {
        if (existingEntry) {
          await setCurrentSessionExercise(existingEntry.id);
        } else {
          const resolved = getResolvedExerciseById(exercise.id);
          const entryId = await addExerciseToSession({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            targetSets: resolved?.defaultSets,
            defaultRestSeconds: resolved?.defaultRestSeconds,
          });
          await setCurrentSessionExercise(entryId);
        }
      } else {
        const resolved = getResolvedExerciseById(exercise.id);
        await startWorkoutSession('strength', {
          primaryMuscleGroup: exercise.primaryMuscleGroup,
          initialExercises: [
            {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              targetSets: resolved?.defaultSets,
              defaultRestSeconds: resolved?.defaultRestSeconds,
            },
          ],
        });
      }
      // 운동 찾기/상세를 스택에 남기지 않는다 — 세션에서 나갈 때 검색 화면으로 되돌아가면
      // 방금 운동을 끝낸 사람이 다시 운동 목록 앞에 서게 된다.
      if (router.canDismiss()) router.dismissAll();
      router.push('/session');
    } finally {
      setStarting(false);
    }
  };

  if (!exercise) {
    return (
      <SubScreen title="운동">
        <ThemedText type="small" themeColor="textSecondary">
          운동을 찾을 수 없어요.
        </ThemedText>
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title={exercise.name}
      footer={
        <PrimaryButton
          label={
            !sessionInProgress
              ? '이 운동으로 시작'
              : existingEntry
                ? '세션에서 이어서 하기'
                : '이 운동 세션에 추가'
          }
          subLabel={sessionInProgress ? '진행 중인 운동에 이어져요' : undefined}
          variant="gold"
          size="large"
          disabled={starting}
          onPress={handleStart}
        />
      }>
      <ExerciseArtSlot exerciseId={exercise.id} style={styles.hero} />

      <View style={styles.chipsRow}>
        <View style={[styles.badge, { backgroundColor: theme.warmOrange }]}>
          <ThemedText type="captionBold" style={styles.badgeText}>
            {MuscleGroupLabels[exercise.primaryMuscleGroup]}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.metaLine}>
          {EQUIPMENT_LABELS[exercise.equipment]}
          {exercise.secondaryMuscleGroups && exercise.secondaryMuscleGroups.length > 0
            ? ` · 보조 ${exercise.secondaryMuscleGroups.map((g) => MuscleGroupLabels[g]).join(', ')}`
            : ''}
        </ThemedText>
      </View>

      {exercise.instructions && (
        <Section title="운동 방법">
          <ThemedText type="small" themeColor="textSecondary">
            {exercise.instructions}
          </ThemedText>
        </Section>
      )}

      {exercise.cautions && (
        <Section title="주의">
          <ThemedText type="small" themeColor="textSecondary">
            {exercise.cautions}
          </ThemedText>
        </Section>
      )}

      <Section title="내 기록">
        {previous ? (
          <ThemedText type="small" themeColor="textSecondary">
            {previous.date}: {previous.sets.map((s) => `${s.weightKg ?? '-'}kg×${s.reps ?? '-'}`).join(' / ')}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            아직 이 운동을 기록한 적이 없어요.
          </ThemedText>
        )}
        {bestWeight !== undefined && (
          <ThemedView type="backgroundElement" style={styles.bestRow}>
            <ThemedText type="caption" themeColor="textSecondary">
              최고 기록
            </ThemedText>
            <ThemedText type="metric" style={{ color: theme.gold }}>
              {bestWeight}
              <ThemedText type="smallBold" style={{ color: theme.gold }}>
                {' '}
                KG
              </ThemedText>
            </ThemedText>
          </ThemedView>
        )}
      </Section>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    aspectRatio: 16 / 9,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  badgeText: {
    color: '#1B1D20',
  },
  metaLine: {
    flexShrink: 1,
  },
  bestRow: {
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
    alignSelf: 'flex-start',
  },
});
