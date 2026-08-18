import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExerciseArtSlot } from '@/components/ui/exercise-art-slot';
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
 * 16 SCREEN 중 "14 EXERCISE DETAIL". 운동 이미지 영역 / 대상 부위 / 운동 방법 / 내 기록 /
 * 최고 기록을 구분된 섹션으로 보여준다. 운동 데이터·기록 조회 로직은 기존 Exercise DB와
 * findPreviousPerformance/findAllTimeBestWeight를 그대로 재사용한다.
 */
export default function ExerciseDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workoutRecords } = useAppData();

  const exercise = id ? getExerciseById(id) : undefined;
  const previous = exercise ? findPreviousPerformance(exercise.id, workoutRecords) : null;
  const bestWeight = exercise ? findAllTimeBestWeight(exercise.id, workoutRecords) : undefined;

  if (!exercise) {
    return (
      <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 닫기
          </ThemedText>
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary">
          운동을 찾을 수 없어요.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 닫기
          </ThemedText>
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <ExerciseArtSlot exerciseId={exercise.id} style={styles.hero} />

      <ThemedText type="heading">{exercise.name}</ThemedText>

      <View style={styles.chipsRow}>
        <View style={[styles.badge, { backgroundColor: theme.warmOrange }]}>
          <ThemedText type="small" style={styles.badgeText}>
            {MuscleGroupLabels[exercise.primaryMuscleGroup]}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {EQUIPMENT_LABELS[exercise.equipment]}
          {exercise.secondaryMuscleGroups && exercise.secondaryMuscleGroups.length > 0
            ? ` · 보조 ${exercise.secondaryMuscleGroups.map((g) => MuscleGroupLabels[g]).join(', ')}`
            : ''}
        </ThemedText>
      </View>

      {exercise.instructions && (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">운동 방법</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {exercise.instructions}
          </ThemedText>
        </ThemedView>
      )}

      {exercise.cautions && (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">주의</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {exercise.cautions}
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="smallBold">내 기록</ThemedText>
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
          <ThemedText type="smallBold" style={{ color: theme.gold }}>
            최고 기록 {bestWeight}KG
          </ThemedText>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
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
    fontWeight: '700',
  },
  section: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
