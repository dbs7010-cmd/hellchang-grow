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
import { AppConfig } from '@/config/app-config';
import { Exercises, getResolvedExerciseById, searchExercises } from '@/config/exercises';
import { MuscleGroupLabels, MuscleGroups } from '@/config/muscle-groups';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { MuscleGroup } from '@/types/exercise';
import { WorkoutCategory } from '@/types/workout';
import { createId } from '@/utils/id';
import { buildQuickStartPlan, ContinueOption, QuickStartExercise } from '@/utils/workout-start';

const CARDIO_CATEGORIES: WorkoutCategory[] = WorkoutCategories.filter((c) => c !== 'strength');

/** 후보가 어디서 왔는지에 따른 화면 문구. 문구는 화면에, 판단은 utils/workout-start.ts에 둔다. */
const CONTINUE_TITLES: Record<ContinueOption['source'], string> = {
  scheduledRoutine: '오늘 루틴 시작하기',
  lastRoutine: '지난 루틴 계속하기',
  lastRecord: '지난 운동 그대로',
};

/**
 * 02 WORKOUT START. START WORKOUT FIRST — 여기서 긴 입력 폼을 요구하지 않는다.
 *
 * 세 경로의 우선순위가 화면 순서 그대로다:
 *   1) 지난 루틴 계속하기 (한 번 터치로 세션 진입)
 *   2) 오늘 추천        (부위 + 운동까지 담아서 한 번 터치)
 *   3) 직접 선택        (부위 → 운동 고르기. 루틴이 없는 사용자의 기본 경로)
 * 유산소는 웨이트와 동급이 아니라 맨 아래 보조 경로로만 둔다 (WEIGHT FIRST).
 */
export default function WorkoutStartScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeSession, workoutRecords, routines, startWorkoutSession } = useAppData();

  const [showPicker, setShowPicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [customExercises, setCustomExercises] = useState<{ id: string; name: string }[]>([]);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [showCustomExerciseField, setShowCustomExerciseField] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 이미 진행 중인 세션이 있는 상태로 이 화면에 들어오면 (뒤로가기 등) 바로 세션으로 보낸다.
  // 끝난 세션(status: completed)이 정리되지 못하고 남아 있으면 보내지 않는다 — 그러면
  // 끝낼 수도 없는 세션 화면과 이 화면 사이에 갇힌다. 그때는 새로 시작하는 것이 탈출구다.
  useEffect(() => {
    if (activeSession && activeSession.status !== 'completed') {
      router.replace('/session');
    }
  }, [activeSession, router]);

  const plan = useMemo(
    () =>
      buildQuickStartPlan({
        routines,
        records: workoutRecords,
        exerciseDb: Exercises,
        muscleGroups: MuscleGroups,
        dayOfWeek: new Date().getDay(),
        recommendedLimit: AppConfig.recommendedExerciseCount,
      }),
    [routines, workoutRecords]
  );

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

  /** 모든 경로가 여기로 수렴한다 — 시작 방식이 달라도 세션은 하나의 규칙으로 만들어진다. */
  const startSession = async (
    exercises: QuickStartExercise[],
    options?: { muscleGroup?: MuscleGroup; routineId?: string; routineName?: string }
  ) => {
    await startWorkoutSession('strength', {
      primaryMuscleGroup: options?.muscleGroup,
      routineId: options?.routineId,
      routineName: options?.routineName,
      initialExercises: exercises,
    });
    router.replace('/session');
  };

  const handleContinue = async () => {
    const option = plan.continueOption;
    if (!option) return;
    await startSession(option.exercises, {
      routineId: option.routineId,
      routineName: option.routineId ? option.name : undefined,
    });
  };

  const handleRecommended = async () => {
    await startSession(plan.recommended.exercises, { muscleGroup: plan.recommended.muscleGroup });
  };

  const handleStartWithSelection = async () => {
    if (!selectedMuscleGroup) return;
    const exercises: QuickStartExercise[] = [
      ...Array.from(selectedExerciseIds).map((id) => {
        const resolved = getResolvedExerciseById(id)!;
        return {
          exerciseId: resolved.id,
          exerciseName: resolved.name,
          targetSets: resolved.defaultSets,
          defaultRestSeconds: resolved.defaultRestSeconds,
        };
      }),
      ...customExercises.map((exercise) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      })),
    ];
    await startSession(exercises, { muscleGroup: selectedMuscleGroup });
  };

  const handleStartCardio = async (category: WorkoutCategory) => {
    await startWorkoutSession(category);
    router.replace('/session');
  };

  /**
   * 뒤로가기. 알림/딥링크로 이 화면에 바로 들어오면 되돌아갈 스택이 없어서 router.back()이
   * 아무 일도 하지 않는다 — 그때는 홈으로 빠져나갈 안전 경로를 준다.
   */
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const continueOption = plan.continueOption;
  const recommendedNames = plan.recommended.exercises.map((exercise) => exercise.exerciseName);

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

      {continueOption && (
        <QuickStartRow
          accent
          title={CONTINUE_TITLES[continueOption.source]}
          subtitle={
            continueOption.name +
            ' · 운동 ' +
            continueOption.exercises.length +
            '개' +
            (continueOption.date ? ' · ' + continueOption.date : '')
          }
          onPress={handleContinue}
        />
      )}

      {plan.recommended.exercises.length > 0 && (
        <QuickStartRow
          accent={!continueOption}
          title="오늘 추천"
          subtitle={
            MuscleGroupLabels[plan.recommended.muscleGroup] + ' · ' + recommendedNames.join(', ')
          }
          onPress={handleRecommended}
        />
      )}

      {!showPicker && (
        <QuickStartRow
          title="직접 선택"
          subtitle="부위를 고르고 오늘 할 운동만 담아요"
          onPress={() => setShowPicker(true)}
        />
      )}

      {showPicker && (
        <Section title="부위 고르기">
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
        </Section>
      )}

      {showPicker && selectedMuscleGroup && (
        <Section title={MuscleGroupLabels[selectedMuscleGroup] + ' 운동 고르기'}>
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
            label={selectedCount > 0 ? selectedCount + '개로 시작' : '고르지 않고 바로 시작'}
            variant="gold"
            size="large"
            onPress={handleStartWithSelection}
          />
        </Section>
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

/**
 * "누르면 바로 운동이 시작되는" 한 줄. 세 경로가 같은 모양이라 무엇을 눌러야 하는지
 * 고민할 필요가 없고, 가장 우선인 경로만 Gold 테두리로 구분한다.
 */
function QuickStartRow({
  title,
  subtitle,
  accent,
  onPress,
}: {
  title: string;
  subtitle: string;
  accent?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title + '. ' + subtitle}
      style={[
        styles.quickRow,
        { backgroundColor: theme.backgroundElement, borderColor: accent ? theme.gold : theme.border },
      ]}>
      <View style={styles.quickRowText}>
        <ThemedText type="smallBold" style={accent ? { color: theme.gold } : undefined}>
          {title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
          {subtitle}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: accent ? theme.gold : theme.textSecondary }}>
        ›
      </ThemedText>
    </Pressable>
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
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.three,
    minHeight: Layout.listRowHeight,
  },
  quickRowText: {
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
