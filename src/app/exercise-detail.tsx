import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExerciseArtSlot } from '@/components/ui/exercise-art-slot';
import { Section } from '@/components/ui/section';
import { SubScreen } from '@/components/ui/sub-screen';
import { getExerciseById } from '@/config/exercises';
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
 */
export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workoutRecords } = useAppData();

  const exercise = id ? getExerciseById(id) : undefined;
  const previous = exercise ? findPreviousPerformance(exercise.id, workoutRecords) : null;
  const bestWeight = exercise ? findAllTimeBestWeight(exercise.id, workoutRecords) : undefined;

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
    <SubScreen title={exercise.name}>
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
