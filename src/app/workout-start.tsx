import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { Exercises, getExerciseById, searchExercises } from '@/config/exercises';
import { MuscleGroupLabels, MuscleGroups } from '@/config/muscle-groups';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { MuscleGroup } from '@/types/exercise';
import { WorkoutCategory } from '@/types/workout';
import { createId } from '@/utils/id';
import { findMostRecentRecordForMuscleGroup } from '@/utils/exercise-history';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';

const CARDIO_CATEGORIES: WorkoutCategory[] = WorkoutCategories.filter((c) => c !== 'strength');

/**
 * 02 WORKOUT START. START WORKOUT FIRST — 여기서 긴 입력 폼을 요구하지 않는다.
 * 루틴이 있으면 한 번, 없으면 부위 하나만 고르면 바로 세션으로 넘어간다.
 * 유산소는 웨이트와 동급이 아니라 아래쪽 보조 경로로만 둔다 (WEIGHT FIRST).
 */
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

  const selectedCount = selectedExerciseIds.size + customExercises.length;

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

  /**
   * 뒤로가기. 알림/딥링크로 이 화면에 바로 들어오면 되돌아갈 스택이 없어서 router.back()이
   * 아무 일도 하지 않는다 — 그때는 홈으로 빠져나갈 안전 경로를 준다.
   */
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleStartCardio = async (category: WorkoutCategory) => {
    await startWorkoutSession(category);
    await goToSession();
  };

  return (
    <ScreenScroll>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기">
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 뒤로
          </ThemedText>
        </Pressable>
        <ThemedText type="heading">오늘의 운동</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {scheduledRoutine && !showBodyPartPicker && (
        <Section title="오늘 루틴">
          <Pressable
            onPress={handleStartRoutine}
            style={[styles.routineRow, { backgroundColor: theme.backgroundElement, borderColor: theme.gold }]}>
            <View style={styles.routineText}>
              <ThemedText type="smallBold">{scheduledRoutine.name}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {scheduledRoutine.exerciseIds.length}개 운동 · 바로 시작
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
        </Section>
      )}

      {(!scheduledRoutine || showBodyPartPicker) && (
        <Section title="부위별 시작">
          <ChipRow bleed>
            {MuscleGroups.map((group) => (
              <Chip
                key={group}
                label={MuscleGroupLabels[group]}
                selected={selectedMuscleGroup === group}
                onPress={() => setSelectedMuscleGroup(group)}
              />
            ))}
          </ChipRow>
          <PrimaryButton label="오늘 뭐 하지?" variant="secondary" onPress={handleRecommend} />
        </Section>
      )}

      {selectedMuscleGroup && (
        <>
          {previousExercises.length > 0 && (
            <Pressable
              onPress={handleStartSameAsLastTime}
              style={[styles.routineRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.routineText}>
                <ThemedText type="smallBold">지난 운동 그대로</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {MuscleGroupLabels[selectedMuscleGroup]} · {previousExercises.length}개 운동 ·{' '}
                  {previousRecord?.date}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: theme.gold }}>
                ›
              </ThemedText>
            </Pressable>
          )}

          <Section title={`${MuscleGroupLabels[selectedMuscleGroup]} 운동 고르기`}>
            <TextField placeholder="운동 검색" value={searchQuery} onChangeText={setSearchQuery} />
            <ChipRow wrap>
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
                  onPress={() => setCustomExercises((prev) => prev.filter((e) => e.id !== exercise.id))}
                />
              ))}
            </ChipRow>

            {showCustomExerciseField ? (
              <View style={styles.inlineRow}>
                <TextField
                  value={customExerciseName}
                  onChangeText={setCustomExerciseName}
                  placeholder="DB에 없는 운동 이름"
                  containerStyle={styles.flexItem}
                  onSubmitEditing={handleAddCustomExercise}
                />
                <PrimaryButton label="추가" variant="secondary" onPress={handleAddCustomExercise} />
              </View>
            ) : (
              <Pressable onPress={() => setShowCustomExerciseField(true)} hitSlop={8}>
                <ThemedText type="captionBold" style={{ color: theme.gold }}>
                  + 목록에 없는 운동 직접 추가
                </ThemedText>
              </Pressable>
            )}

            <PrimaryButton
              label={selectedCount > 0 ? `${selectedCount}개로 시작` : '고르지 않고 바로 시작'}
              variant="gold"
              onPress={handleStartWithSelection}
            />
          </Section>
        </>
      )}

      <Section title="+ 유산소 추가">
        <ThemedText type="caption" themeColor="textSecondary">
          웨이트가 아니어도 괜찮아요. 오늘 한 걸 바로 시작해서 기록해요.
        </ThemedText>
        <ChipRow bleed>
          {CARDIO_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={WorkoutCategoryLabels[category]}
              onPress={() => handleStartCardio(category)}
            />
          ))}
        </ChipRow>
      </Section>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.three,
    minHeight: Layout.compactRowHeight,
  },
  routineText: {
    flex: 1,
    gap: Spacing.half,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  flexItem: {
    flex: 1,
  },
});
