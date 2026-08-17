import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BodyAvatarPreview } from '@/components/body-avatar-preview';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { StanleyTrainer } from '@/config/trainers';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getTodayRecords } from '@/data/workout-repository';
import { WorkoutCategory } from '@/types/workout';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { createId } from '@/utils/id';
import { computeElapsedSeconds, formatElapsedTime } from '@/utils/workout-session';

interface SessionSummary {
  durationMinutes: number;
  category: WorkoutCategory;
  weeklyCount: number;
  streak: number;
  trainerLine: string;
}

export default function SessionScreen() {
  const router = useRouter();
  const {
    profile,
    activeSession,
    workoutRecords,
    pauseWorkoutSession,
    resumeWorkoutSession,
    changeSessionCategory,
    addSessionActivity,
    endWorkoutSession,
  } = useAppData();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const lastMilestoneRef = useRef(0);

  const [stanleyLine, setStanleyLine] = useState(() => {
    const hadEarlierSessionToday = getTodayRecords(workoutRecords).length > 0;
    return pickTrainerLine(
      hadEarlierSessionToday
        ? StanleyTrainer.dialogueSet.sessionSecondToday
        : StanleyTrainer.dialogueSet.sessionStart
    ).text;
  });

  const [exerciseName, setExerciseName] = useState('');
  const [exerciseWeight, setExerciseWeight] = useState('');
  const [exerciseReps, setExerciseReps] = useState('');
  const [exerciseSets, setExerciseSets] = useState('');

  useEffect(() => {
    if (!activeSession || activeSession.status === 'completed') return;
    const interval = setInterval(() => {
      const now = Date.now();
      setNowMs(now);

      if (activeSession.status === 'active') {
        const minutes = Math.floor(computeElapsedSeconds(activeSession, now) / 60);
        if (minutes >= 45 && lastMilestoneRef.current < 45) {
          lastMilestoneRef.current = 45;
          setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.sessionLong).text);
        } else if (minutes >= 20 && lastMilestoneRef.current < 20) {
          lastMilestoneRef.current = 20;
          setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.sessionExtended).text);
        } else if (minutes >= 10 && lastMilestoneRef.current < 10) {
          lastMilestoneRef.current = 10;
          setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.sessionMidway).text);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // handleEnd이 activeSession을 지우는 시점과 setSummary가 반영되는 시점 사이에
  // 이 effect가 끼어들어 홈으로 리다이렉트해버리지 않도록, "종료 처리 중" 여부를 별도로 추적한다.
  const endingRef = useRef(false);

  useEffect(() => {
    if (!activeSession && !summary && !endingRef.current) {
      router.back();
    }
  }, [activeSession, summary, router]);

  if (!activeSession) {
    return summary ? renderSummary() : null;
  }

  const elapsedSeconds = computeElapsedSeconds(activeSession, nowMs);
  const isPaused = activeSession.status === 'paused';

  const handlePauseToggle = async () => {
    if (isPaused) {
      await resumeWorkoutSession();
      setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.sessionResumed).text);
    } else {
      await pauseWorkoutSession();
      setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.sessionPaused).text);
    }
  };

  const handleAddExercise = async () => {
    if (!exerciseName.trim()) return;
    await addSessionActivity({
      id: createId('exercise'),
      name: exerciseName.trim(),
      weightKg: exerciseWeight ? Number(exerciseWeight) : undefined,
      reps: exerciseReps ? Number(exerciseReps) : undefined,
      sets: exerciseSets ? Number(exerciseSets) : undefined,
    });
    setExerciseName('');
    setExerciseWeight('');
    setExerciseReps('');
    setExerciseSets('');
  };

  const handleEnd = async () => {
    endingRef.current = true;
    const trainerLine = pickTrainerLine(StanleyTrainer.dialogueSet.sessionEnd).text;
    const result = await endWorkoutSession();
    if (result) {
      setSummary({ ...result, trainerLine });
    } else {
      endingRef.current = false;
    }
  };

  function renderSummary() {
    if (!summary) return null;
    return (
      <ScreenScroll>
        <SectionCard title="운동 종료">
          <ThemedText type="small" themeColor="textSecondary">
            {StanleyTrainer.portraitPlaceholder} {summary.trainerLine}
          </ThemedText>
          <View style={styles.summaryStats}>
            <ThemedText type="smallBold">운동 시간: {summary.durationMinutes}분</ThemedText>
            <ThemedText type="smallBold">
              종류: {WorkoutCategoryLabels[summary.category]}
            </ThemedText>
            <ThemedText type="smallBold">이번 주 {summary.weeklyCount}회</ThemedText>
            <ThemedText type="smallBold">연속 {summary.streak}일째</ThemedText>
          </View>
          <PrimaryButton label="확인" onPress={() => router.back()} />
        </SectionCard>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <View style={styles.statusRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {isPaused ? '⏸ 일시정지' : '🟢 운동 중'}
        </ThemedText>
      </View>

      {profile && (
        <BodyAvatarPreview
          genderExpression={profile.genderExpression}
          size={profile.bodyParameters.size}
          tone={profile.bodyParameters.tone}
        />
      )}

      <ThemedText type="title" style={styles.timer}>
        {formatElapsedTime(elapsedSeconds)}
      </ThemedText>

      <SectionCard title={`${StanleyTrainer.displayName} ${StanleyTrainer.portraitPlaceholder}`}>
        <ThemedText type="small" themeColor="textSecondary">
          {stanleyLine}
        </ThemedText>
      </SectionCard>

      <SectionCard title="운동 종류">
        <View style={styles.chipRow}>
          {WorkoutCategories.map((category) => (
            <Chip
              key={category}
              label={WorkoutCategoryLabels[category]}
              selected={activeSession.primaryCategory === category}
              onPress={() => changeSessionCategory(category)}
            />
          ))}
        </View>
      </SectionCard>

      {activeSession.primaryCategory === 'strength' && (
        <SectionCard title="상세 기록 (선택)">
          <TextField label="운동명" value={exerciseName} onChangeText={setExerciseName} placeholder="예: 벤치프레스" />
          <View style={styles.exerciseInputRow}>
            <TextField
              label="중량(kg)"
              keyboardType="numeric"
              value={exerciseWeight}
              onChangeText={setExerciseWeight}
              style={styles.exerciseInput}
            />
            <TextField
              label="횟수"
              keyboardType="numeric"
              value={exerciseReps}
              onChangeText={setExerciseReps}
              style={styles.exerciseInput}
            />
            <TextField
              label="세트"
              keyboardType="numeric"
              value={exerciseSets}
              onChangeText={setExerciseSets}
              style={styles.exerciseInput}
            />
          </View>
          <PrimaryButton label="추가" variant="secondary" onPress={handleAddExercise} />

          {activeSession.activities && activeSession.activities.length > 0 && (
            <View style={styles.exerciseList}>
              {activeSession.activities.map((activity) => (
                <ThemedText key={activity.id} type="small" themeColor="textSecondary">
                  · {activity.name}
                  {activity.weightKg ? ` ${activity.weightKg}kg` : ''}
                  {activity.reps ? ` x${activity.reps}` : ''}
                  {activity.sets ? ` (${activity.sets}세트)` : ''}
                </ThemedText>
              ))}
            </View>
          )}
        </SectionCard>
      )}

      <PrimaryButton
        label={isPaused ? '운동 재개' : '일시정지'}
        variant="secondary"
        onPress={handlePauseToggle}
      />
      <PrimaryButton label="운동 종료" onPress={handleEnd} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  timer: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  exerciseInputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  exerciseInput: {
    flex: 1,
  },
  exerciseList: {
    gap: Spacing.half,
  },
  summaryStats: {
    gap: Spacing.one,
  },
});
