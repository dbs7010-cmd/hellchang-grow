import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { Exercises, getExerciseById, searchExercises } from '@/config/exercises';
import { MuscleGroupLabels, MuscleGroups } from '@/config/muscle-groups';
import { WeekdayLabels } from '@/config/weekdays';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import { WorkoutRecord } from '@/types/workout';
import { findPreviousPerformance } from '@/utils/exercise-history';

export default function WorkoutScreen() {
  const { workoutRecords, routines, saveRoutine, removeRoutine } = useAppData();

  const [routineFormOpen, setRoutineFormOpen] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineDays, setRoutineDays] = useState<Set<number>>(new Set());
  const [routineExerciseIds, setRoutineExerciseIds] = useState<Set<string>>(new Set());
  const [routineSearch, setRoutineSearch] = useState('');

  const [browseMuscleGroup, setBrowseMuscleGroup] = useState<MuscleGroup | null>(null);
  const [browseSearch, setBrowseSearch] = useState('');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  const routineFormExercises = useMemo(
    () => (routineSearch.trim() ? searchExercises(routineSearch) : Exercises),
    [routineSearch]
  );

  const browseExercises = useMemo(() => {
    const inGroup = browseMuscleGroup
      ? Exercises.filter((exercise) => exercise.primaryMuscleGroup === browseMuscleGroup)
      : Exercises;
    if (!browseSearch.trim()) return inGroup;
    const searched = new Set(searchExercises(browseSearch).map((e) => e.id));
    return inGroup.filter((exercise) => searched.has(exercise.id));
  }, [browseMuscleGroup, browseSearch]);

  const toggleRoutineDay = (day: number) => {
    setRoutineDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleRoutineExercise = (exerciseId: string) => {
    setRoutineExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const handleSaveRoutine = async () => {
    const name = routineName.trim();
    if (!name || routineExerciseIds.size === 0) return;
    await saveRoutine({
      name,
      exerciseIds: Array.from(routineExerciseIds),
      scheduledDays: routineDays.size > 0 ? Array.from(routineDays) : undefined,
    });
    setRoutineName('');
    setRoutineDays(new Set());
    setRoutineExerciseIds(new Set());
    setRoutineSearch('');
    setRoutineFormOpen(false);
  };

  return (
    <ScreenScroll>
      <ThemedText type="subtitle">운동</ThemedText>

      <SectionCard title="내 루틴">
        {routines.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아직 만든 루틴이 없어요. 루틴은 선택 사항이에요 — 없어도 홈에서 바로 운동을 시작할 수
            있어요.
          </ThemedText>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={styles.routineRow}>
              <View style={styles.routineInfo}>
                <ThemedText type="smallBold">{routine.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {routine.exerciseIds.map((id) => getExerciseById(id)?.name ?? id).join(', ')}
                </ThemedText>
                {routine.scheduledDays && routine.scheduledDays.length > 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {routine.scheduledDays.map((d) => WeekdayLabels[d]).join('/')}요일
                  </ThemedText>
                )}
              </View>
              <PrimaryButton
                label="삭제"
                variant="secondary"
                style={styles.deleteButton}
                onPress={() => removeRoutine(routine.id)}
              />
            </View>
          ))
        )}

        {routineFormOpen ? (
          <View style={styles.routineForm}>
            <TextField label="루틴 이름" value={routineName} onChangeText={setRoutineName} placeholder="예: 가슴 A" />

            <ThemedText type="small">요일 (선택)</ThemedText>
            <View style={styles.chipRow}>
              {WeekdayLabels.map((label, day) => (
                <Chip
                  key={day}
                  label={label}
                  selected={routineDays.has(day)}
                  onPress={() => toggleRoutineDay(day)}
                />
              ))}
            </View>

            <TextField
              label="운동 선택"
              value={routineSearch}
              onChangeText={setRoutineSearch}
              placeholder="운동 검색"
            />
            <View style={styles.chipRow}>
              {routineFormExercises.map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.name}
                  selected={routineExerciseIds.has(exercise.id)}
                  onPress={() => toggleRoutineExercise(exercise.id)}
                />
              ))}
            </View>

            <PrimaryButton label="루틴 저장" onPress={handleSaveRoutine} />
            <PrimaryButton
              label="취소"
              variant="secondary"
              onPress={() => setRoutineFormOpen(false)}
            />
          </View>
        ) : (
          <PrimaryButton label="루틴 만들기" variant="secondary" onPress={() => setRoutineFormOpen(true)} />
        )}
      </SectionCard>

      <SectionCard title="운동 DB 탐색">
        <View style={styles.chipRow}>
          {MuscleGroups.map((group) => (
            <Chip
              key={group}
              label={MuscleGroupLabels[group]}
              selected={browseMuscleGroup === group}
              onPress={() => setBrowseMuscleGroup(browseMuscleGroup === group ? null : group)}
            />
          ))}
        </View>
        <TextField placeholder="운동 검색" value={browseSearch} onChangeText={setBrowseSearch} />

        <View style={styles.exerciseList}>
          {browseExercises.map((exercise) => (
            <ExerciseListItem
              key={exercise.id}
              exercise={exercise}
              expanded={expandedExerciseId === exercise.id}
              onToggle={() =>
                setExpandedExerciseId(expandedExerciseId === exercise.id ? null : exercise.id)
              }
              workoutRecords={workoutRecords}
            />
          ))}
        </View>
      </SectionCard>
    </ScreenScroll>
  );
}

function ExerciseListItem({
  exercise,
  expanded,
  onToggle,
  workoutRecords,
}: {
  exercise: ExerciseDefinition;
  expanded: boolean;
  onToggle: () => void;
  workoutRecords: WorkoutRecord[];
}) {
  const theme = useTheme();
  const previous = expanded ? findPreviousPerformance(exercise.id, workoutRecords) : null;

  return (
    <ThemedView type="backgroundSelected" style={styles.exerciseItem}>
      <Pressable onPress={onToggle}>
        <ThemedText type="smallBold">{exercise.name}</ThemedText>
      </Pressable>
      {expanded && (
        <View style={styles.exerciseDetail}>
          <ThemedText type="small" themeColor="textSecondary">
            주요 부위:{' '}
            <ThemedText type="small" style={{ color: theme.warmOrange }}>
              {MuscleGroupLabels[exercise.primaryMuscleGroup]}
            </ThemedText>
            {exercise.secondaryMuscleGroups && exercise.secondaryMuscleGroups.length > 0
              ? ` · 보조: ${exercise.secondaryMuscleGroups.map((g) => MuscleGroupLabels[g]).join(', ')}`
              : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            장비: {equipmentLabel(exercise.equipment)}
          </ThemedText>
          {exercise.instructions && (
            <ThemedText type="small" themeColor="textSecondary">
              방법: {exercise.instructions}
            </ThemedText>
          )}
          {exercise.cautions && (
            <ThemedText type="small" themeColor="textSecondary">
              주의: {exercise.cautions}
            </ThemedText>
          )}
          {previous ? (
            <ThemedText type="small" themeColor="textSecondary">
              최근 기록({previous.date}): {previous.sets.map((s) => `${s.weightKg ?? '-'}kg×${s.reps ?? '-'}`).join(' / ')}
              {previous.maxWeightKg ? ` · 최고 ${previous.maxWeightKg}kg` : ''}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              아직 이 운동을 기록한 적이 없어요.
            </ThemedText>
          )}
        </View>
      )}
    </ThemedView>
  );
}

function equipmentLabel(equipment: ExerciseDefinition['equipment']): string {
  const labels: Record<ExerciseDefinition['equipment'], string> = {
    barbell: '바벨',
    dumbbell: '덤벨',
    machine: '머신',
    cable: '케이블',
    bodyweight: '맨몸',
    smith: '스미스머신',
    other: '기타',
  };
  return labels[equipment];
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  routineInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  deleteButton: {
    width: 72,
  },
  routineForm: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  exerciseList: {
    gap: Spacing.two,
  },
  exerciseItem: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  exerciseDetail: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
});
