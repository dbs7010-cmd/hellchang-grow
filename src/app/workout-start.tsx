import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { Exercises, getExerciseById, searchExercises } from '@/config/exercises';
import { MuscleGroupLabels, MuscleGroups } from '@/config/muscle-groups';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { MuscleGroup } from '@/types/exercise';
import { WorkoutCategory } from '@/types/workout';
import { createId } from '@/utils/id';
import { findMostRecentRecordForMuscleGroup } from '@/utils/exercise-history';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';

const CARDIO_CATEGORIES: WorkoutCategory[] = WorkoutCategories.filter((c) => c !== 'strength');

export default function WorkoutStartScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeSession, workoutRecords, routines, startWorkoutSession } = useAppData();

  const [showBodyPartPicker, setShowBodyPartPicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [customExercises, setCustomExercises] = useState<{ id: string; name: string }[]>([]);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [showCustomExerciseField, setShowCustomExerciseField] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 이미 진행 중인 세션이 있는 상태로 이 화면에 들어오면 (뒤로가기 등) 바로 세션으로 보낸다.
  useEffect(() => {
    if (activeSession) {
      router.replace('/session');
    }
  }, [activeSession, router]);

  const scheduledRoutine = useMemo(
    () => getTodaysScheduledRoutine(routines, new Date().getDay()),
    [routines]
  );

  const previousRecord = selectedMuscleGroup
    ? findMostRecentRecordForMuscleGroup(selectedMuscleGroup, workoutRecords, Exercises)
    : null;
  const previousExercises =
    previousRecord?.exercises?.filter(
      (exercise) =>
        exercise.exerciseId && getExerciseById(exercise.exerciseId)?.primaryMuscleGroup === selectedMuscleGroup
    ) ?? [];

  const exerciseChoices = useMemo(() => {
    const inGroup = selectedMuscleGroup
      ? Exercises.filter((exercise) => exercise.primaryMuscleGroup === selectedMuscleGroup)
      : [];
    if (!searchQuery.trim()) return inGroup;
    const searched = new Set(searchExercises(searchQuery).map((e) => e.id));
    return inGroup.filter((exercise) => searched.has(exercise.id));
  }, [selectedMuscleGroup, searchQuery]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const handleAddCustomExercise = () => {
    const name = customExerciseName.trim();
    if (!name) return;
    setCustomExercises((prev) => [...prev, { id: createId('custom-exercise'), name }]);
    setCustomExerciseName('');
  };

  const goToSession = async () => {
    router.replace('/session');
  };

  const handleStartRoutine = async () => {
    if (!scheduledRoutine) return;
    const initialExercises = scheduledRoutine.exerciseIds
      .map((id) => getExerciseById(id))
      .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise))
      .map((exercise) => ({ exerciseId: exercise.id, exerciseName: exercise.name }));
    await startWorkoutSession('strength', { routineId: scheduledRoutine.id, initialExercises });
    await goToSession();
  };

  const handleStartSameAsLastTime = async () => {
    if (!selectedMuscleGroup) return;
    const initialExercises = previousExercises.map((exercise) => ({
      exerciseId: exercise.exerciseId as string,
      exerciseName: exercise.name,
    }));
    await startWorkoutSession('strength', { primaryMuscleGroup: selectedMuscleGroup, initialExercises });
    await goToSession();
  };

  const handleStartWithSelection = async () => {
    if (!selectedMuscleGroup) return;
    const initialExercises = [
      ...Array.from(selectedExerciseIds).map((id) => {
        const exercise = getExerciseById(id)!;
        return { exerciseId: exercise.id, exerciseName: exercise.name };
      }),
      ...customExercises.map((exercise) => ({ exerciseId: exercise.id, exerciseName: exercise.name })),
    ];
    await startWorkoutSession('strength', { primaryMuscleGroup: selectedMuscleGroup, initialExercises });
    await goToSession();
  };

  const handleRecommend = () => {
    const group = recommendMuscleGroup(workoutRecords, Exercises, MuscleGroups);
    setShowBodyPartPicker(true);
    setSelectedMuscleGroup(group);
  };

  const handleStartCardio = async (category: WorkoutCategory) => {
    await startWorkoutSession(category);
    await goToSession();
  };

  return (
    <ScreenScroll>
      <ThemedText type="heading">오늘의 운동</ThemedText>

      {scheduledRoutine && !showBodyPartPicker && (
        <SectionCard>
          <Pressable onPress={handleStartRoutine} style={styles.compactRow}>
            <View style={styles.compactRowText}>
              <ThemedText type="small" themeColor="textSecondary">
                루틴 불러오기
              </ThemedText>
              <ThemedText type="smallBold">{scheduledRoutine.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {scheduledRoutine.exerciseIds.length}개 운동
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ color: theme.gold }}>
              ›
            </ThemedText>
          </Pressable>
          <PrimaryButton
            label="오늘은 다르게"
            variant="secondary"
            onPress={() => setShowBodyPartPicker(true)}
          />
        </SectionCard>
      )}

      {(!scheduledRoutine || showBodyPartPicker) && (
        <SectionCard title="부위별 시작">
          <View style={styles.chipRow}>
            {MuscleGroups.map((group) => (
              <Chip
                key={group}
                label={MuscleGroupLabels[group]}
                selected={selectedMuscleGroup === group}
                onPress={() => setSelectedMuscleGroup(group)}
              />
            ))}
          </View>
          <PrimaryButton label="오늘 뭐 하지?" variant="secondary" onPress={handleRecommend} />
        </SectionCard>
      )}

      {selectedMuscleGroup && (
        <>
          {previousExercises.length > 0 && (
            <SectionCard>
              <Pressable onPress={handleStartSameAsLastTime} style={styles.compactRow}>
                <View style={styles.compactRowText}>
                  <ThemedText type="small" themeColor="textSecondary">
                    지난 운동 그대로
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {MuscleGroupLabels[selectedMuscleGroup]} · {previousExercises.length}개 운동
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {previousRecord?.date}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: theme.gold }}>
                  ›
                </ThemedText>
              </Pressable>
            </SectionCard>
          )}

          <SectionCard title={`${MuscleGroupLabels[selectedMuscleGroup]} 운동 고르기`}>
            <TextField
              placeholder="운동 검색"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.chipRow}>
              {exerciseChoices.map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.name}
                  selected={selectedExerciseIds.has(exercise.id)}
                  onPress={() => toggleExercise(exercise.id)}
                />
              ))}
              {customExercises.map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.name}
                  selected
                  onPress={() =>
                    setCustomExercises((prev) => prev.filter((e) => e.id !== exercise.id))
                  }
                />
              ))}
            </View>

            {showCustomExerciseField ? (
              <View style={styles.customExerciseRow}>
                <TextField
                  value={customExerciseName}
                  onChangeText={setCustomExerciseName}
                  placeholder="DB에 없는 운동 이름"
                  style={styles.customExerciseInput}
                />
                <PrimaryButton label="추가" variant="secondary" onPress={handleAddCustomExercise} />
              </View>
            ) : (
              <Pressable onPress={() => setShowCustomExerciseField(true)} hitSlop={8}>
                <ThemedText type="small" style={{ color: theme.gold }}>
                  + 목록에 없는 운동 직접 추가
                </ThemedText>
              </Pressable>
            )}

            <PrimaryButton label="다음" variant="gold" onPress={handleStartWithSelection} />
          </SectionCard>
        </>
      )}

      <SectionCard title="유산소 등 다른 운동">
        <ThemedText type="small" themeColor="textSecondary">
          웨이트가 아니어도 괜찮다. 오늘 한 걸 바로 시작해서 기록하자.
        </ThemedText>
        <View style={styles.chipRow}>
          {CARDIO_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={WorkoutCategoryLabels[category]}
              onPress={() => handleStartCardio(category)}
            />
          ))}
        </View>
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
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactRowText: {
    gap: Spacing.half,
  },
  customExerciseRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  customExerciseInput: {
    flex: 1,
  },
});
