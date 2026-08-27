import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { EmptyState } from '@/components/ui/empty-state';
import { ExerciseArtSlot } from '@/components/ui/exercise-art-slot';
import { SubScreen } from '@/components/ui/sub-screen';
import { TextField } from '@/components/ui/text-field';
import { Exercises, searchExercises } from '@/config/exercises';
import { MuscleGroupLabels, MuscleGroups } from '@/config/muscle-groups';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MuscleGroup } from '@/types/exercise';

/**
 * 13 EXERCISE SELECT.
 *
 * 이전에는 목록이 그냥 <View>에 쌓여 있어서 화면 밖으로 넘어간 운동에 아예 도달할 수 없었다
 * (Exercise DB 45개 중 화면에 들어가는 몇 개만 볼 수 있었다). SubScreen이 스크롤을 보장한다.
 * row는 thumbnail 44 + 2줄 텍스트로 압축해 412x915에서 6개 이상이 자연스럽게 들어온다.
 */
export default function ExerciseSelectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [search, setSearch] = useState('');

  const exercises = useMemo(() => {
    const inGroup = muscleGroup ? Exercises.filter((e) => e.primaryMuscleGroup === muscleGroup) : Exercises;
    if (!search.trim()) return inGroup;
    const matched = new Set(searchExercises(search).map((e) => e.id));
    return inGroup.filter((e) => matched.has(e.id));
  }, [muscleGroup, search]);

  return (
    <SubScreen title="운동 찾기" contentGap={Spacing.two}>
      <TextField placeholder="운동 검색" value={search} onChangeText={setSearch} />

      {/* 부위 필터는 두 줄로 wrapping하지 않고 가로 1줄 스크롤 — 선택된 chip만 Gold. */}
      <ChipRow bleed>
        <Chip label="전체" selected={!muscleGroup} onPress={() => setMuscleGroup(null)} />
        {MuscleGroups.map((group) => (
          <Chip
            key={group}
            label={MuscleGroupLabels[group]}
            selected={muscleGroup === group}
            onPress={() => setMuscleGroup(muscleGroup === group ? null : group)}
          />
        ))}
      </ChipRow>

      {exercises.length === 0 ? (
        // 앱의 다른 빈 상태와 같은 블록을 쓴다 — 여기만 회색 문장 한 줄이면 검색이 고장난 것처럼 보인다.
        <EmptyState
          icon="🔍"
          line="조건에 맞는 운동이 없어요."
          hint="검색어를 줄이거나 부위 필터를 바꿔보세요."
        />
      ) : (
        <View style={styles.list}>
          {exercises.map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => router.push(`/exercise-detail?id=${exercise.id}`)}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <ExerciseArtSlot exerciseId={exercise.id} style={styles.thumb} />
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {exercise.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {MuscleGroupLabels[exercise.primaryMuscleGroup]}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.chevron}>
                ›
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.medium,
    minHeight: Layout.listRowHeight,
  },
  // width/height를 둘 다 주면 ExerciseArtSlot 기본 aspectRatio는 무시된다 (Yoga 규칙).
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.small,
  },
  rowText: {
    flex: 1,
    gap: 0,
  },
  /** chevron은 모든 row에서 같은 위치·같은 색으로 정렬한다. */
  chevron: {
    width: 10,
    textAlign: 'right',
  },

});
