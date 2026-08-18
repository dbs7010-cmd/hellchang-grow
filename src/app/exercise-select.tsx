import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { ExerciseArtSlot } from '@/components/ui/exercise-art-slot';
import { TextField } from '@/components/ui/text-field';
import { Exercises, searchExercises } from '@/config/exercises';
import { MuscleGroupLabels, MuscleGroups } from '@/config/muscle-groups';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MuscleGroup } from '@/types/exercise';

/**
 * 16 SCREEN 중 "13 EXERCISE SELECT". 운동 DB 전체를 회색 pill로 늘어놓던 것을
 * 검색+부위 필터+thumbnail+이름+대상 부위가 있는 compact row/card로 바꿨다.
 * 운동 데이터 자체는 기존 Exercise DB를 그대로 재사용한다.
 */
export default function ExerciseSelectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [search, setSearch] = useState('');

  const exercises = useMemo(() => {
    const inGroup = muscleGroup ? Exercises.filter((e) => e.primaryMuscleGroup === muscleGroup) : Exercises;
    if (!search.trim()) return inGroup;
    const matched = new Set(searchExercises(search).map((e) => e.id));
    return inGroup.filter((e) => matched.has(e.id));
  }, [muscleGroup, search]);

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 닫기
          </ThemedText>
        </Pressable>
        <ThemedText type="heading">운동 찾기</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filters}>
        <TextField placeholder="운동 검색" value={search} onChangeText={setSearch} />
        <View style={styles.chipRow}>
          <Chip label="전체" selected={!muscleGroup} onPress={() => setMuscleGroup(null)} />
          {MuscleGroups.map((group) => (
            <Chip
              key={group}
              label={MuscleGroupLabels[group]}
              selected={muscleGroup === group}
              onPress={() => setMuscleGroup(muscleGroup === group ? null : group)}
            />
          ))}
        </View>
      </View>

      <View style={styles.list}>
        {exercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            onPress={() => router.push(`/exercise-detail?id=${exercise.id}`)}
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <ExerciseArtSlot exerciseId={exercise.id} style={styles.thumb} />
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{exercise.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {MuscleGroupLabels[exercise.primaryMuscleGroup]}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ›
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </ThemedView>
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
  filters: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
  },
  thumb: {
    width: 56,
    aspectRatio: 1,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
