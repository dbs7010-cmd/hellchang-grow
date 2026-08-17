import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BodyAvatarPreview } from '@/components/body-avatar-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { searchExercises } from '@/config/exercises';
import { StanleyTrainer } from '@/config/trainers';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Spacing } from '@/constants/theme';
import { EndSessionSummary, useAppData } from '@/context/app-data-context';
import { WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import { findPreviousPerformance } from '@/utils/exercise-history';
import { createId } from '@/utils/id';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import {
  computeElapsedSeconds,
  formatElapsedTime,
  getLastSetValues,
  getRestSecondsRemaining,
} from '@/utils/workout-session';

interface SessionSummaryWithLine extends EndSessionSummary {
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
    addExerciseToSession,
    setCurrentSessionExercise,
    addSetToExercise,
    updateSessionSet,
    completeSessionSet,
    startSessionRest,
    skipSessionRest,
    endWorkoutSession,
  } = useAppData();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [summary, setSummary] = useState<SessionSummaryWithLine | null>(null);
  const lastMilestoneRef = useRef(0);
  const endingRef = useRef(false);

  const hadEarlierSessionToday = getTodayRecordCount(workoutRecords) > 0;
  const [stanleyLine, setStanleyLine] = useState(() =>
    pickTrainerLine(
      hadEarlierSessionToday
        ? StanleyTrainer.dialogueSet.sessionSecondToday
        : StanleyTrainer.dialogueSet.sessionStart
    ).text
  );

  const [addExerciseQuery, setAddExerciseQuery] = useState('');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [customRestSeconds, setCustomRestSeconds] = useState('');

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
  useEffect(() => {
    if (!activeSession && !summary && !endingRef.current) {
      router.back();
    }
  }, [activeSession, summary, router]);

  if (!activeSession) {
    return summary ? renderSummary(summary, () => router.back()) : null;
  }

  const elapsedSeconds = computeElapsedSeconds(activeSession, nowMs);
  const isPaused = activeSession.status === 'paused';
  const restSecondsRemaining = getRestSecondsRemaining(activeSession, nowMs);
  const isResting = restSecondsRemaining > 0;

  const currentExercise =
    activeSession.exercises.find((e) => e.id === activeSession.currentExerciseId) ??
    activeSession.exercises[0];
  const currentIndex = currentExercise
    ? activeSession.exercises.findIndex((e) => e.id === currentExercise.id)
    : -1;
  const nextExercise = currentIndex >= 0 ? activeSession.exercises[currentIndex + 1] : undefined;
  const previousExercise = currentIndex > 0 ? activeSession.exercises[currentIndex - 1] : undefined;

  const handlePauseToggle = async () => {
    if (isPaused) {
      await resumeWorkoutSession();
      setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.sessionResumed).text);
    } else {
      await pauseWorkoutSession();
      setStanleyLine(pickTrainerLine(StanleyTrainer.dialogueSet.sessionPaused).text);
    }
  };

  const handleAddSet = async () => {
    if (!currentExercise) return;
    const defaults = getLastSetValues(activeSession, currentExercise.id);
    await addSetToExercise(currentExercise.id, defaults ?? undefined);
  };

  const handleCompleteSet = async (setId: string) => {
    if (!currentExercise) return;
    await completeSessionSet(currentExercise.id, setId);
  };

  const handleUpdateSet = async (setId: string, patch: { weightKg?: number; reps?: number }) => {
    if (!currentExercise) return;
    await updateSessionSet(currentExercise.id, setId, patch);
  };

  const handleAddExerciseByName = async (exerciseId: string, exerciseName: string) => {
    await addExerciseToSession({ exerciseId, exerciseName });
    setAddExerciseQuery('');
    setShowAddExercise(false);
  };

  const handleAddCustomExercise = async () => {
    const name = addExerciseQuery.trim();
    if (!name) return;
    await addExerciseToSession({ exerciseId: createId('custom-exercise'), exerciseName: name });
    setAddExerciseQuery('');
    setShowAddExercise(false);
  };

  const handleStartRest = async (seconds: number) => {
    await startSessionRest(seconds);
  };

  const handleStartCustomRest = async () => {
    const seconds = Number(customRestSeconds);
    if (seconds > 0) {
      await startSessionRest(seconds);
      setCustomRestSeconds('');
    }
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

      {activeSession.exercises.length === 0 && (
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
      )}

      {activeSession.exercises.length > 0 && (
        <SectionCard title="이번 세션 운동">
          <View style={styles.chipRow}>
            {activeSession.exercises.map((exercise) => (
              <Chip
                key={exercise.id}
                label={exercise.exerciseName}
                selected={exercise.id === currentExercise?.id}
                onPress={() => setCurrentSessionExercise(exercise.id)}
              />
            ))}
          </View>
        </SectionCard>
      )}

      {currentExercise && (
        <SectionCard title={currentExercise.exerciseName}>
          <PreviousPerformanceLine exerciseId={currentExercise.exerciseId} records={workoutRecords} />

          {currentExercise.sets.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              아직 기록한 세트가 없어요.
            </ThemedText>
          )}

          {currentExercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              index={index + 1}
              set={set}
              onChange={(patch) => handleUpdateSet(set.id, patch)}
              onComplete={() => handleCompleteSet(set.id)}
            />
          ))}

          <PrimaryButton label="+ 세트" variant="secondary" onPress={handleAddSet} />

          <View style={styles.navRow}>
            {previousExercise && (
              <PrimaryButton
                label={`이전: ${previousExercise.exerciseName}`}
                variant="secondary"
                style={styles.navButton}
                onPress={() => setCurrentSessionExercise(previousExercise.id)}
              />
            )}
            {nextExercise && (
              <PrimaryButton
                label={`다음: ${nextExercise.exerciseName}`}
                variant="secondary"
                style={styles.navButton}
                onPress={() => setCurrentSessionExercise(nextExercise.id)}
              />
            )}
          </View>
        </SectionCard>
      )}

      <SectionCard title="휴식">
        {isResting ? (
          <>
            <ThemedText type="title" style={styles.restTimer}>
              {restSecondsRemaining}초
            </ThemedText>
            <PrimaryButton label="건너뛰기" variant="secondary" onPress={skipSessionRest} />
          </>
        ) : (
          <>
            <View style={styles.chipRow}>
              {AppConfig.restTimerPresetsSeconds.map((seconds) => (
                <Chip key={seconds} label={`${seconds}초`} onPress={() => handleStartRest(seconds)} />
              ))}
            </View>
            <View style={styles.customRestRow}>
              <TextField
                keyboardType="numeric"
                value={customRestSeconds}
                onChangeText={setCustomRestSeconds}
                placeholder="직접 입력(초)"
                style={styles.customRestInput}
              />
              <PrimaryButton label="시작" variant="secondary" onPress={handleStartCustomRest} />
            </View>
          </>
        )}
      </SectionCard>

      <SectionCard title="+ 운동 추가">
        {showAddExercise ? (
          <>
            <TextField
              value={addExerciseQuery}
              onChangeText={setAddExerciseQuery}
              placeholder="운동 검색 또는 직접 입력"
            />
            <View style={styles.chipRow}>
              {searchExercises(addExerciseQuery)
                .slice(0, 8)
                .map((exercise) => (
                  <Chip
                    key={exercise.id}
                    label={exercise.name}
                    onPress={() => handleAddExerciseByName(exercise.id, exercise.name)}
                  />
                ))}
            </View>
            <PrimaryButton label="직접 추가" variant="secondary" onPress={handleAddCustomExercise} />
          </>
        ) : (
          <PrimaryButton label="운동 추가" variant="secondary" onPress={() => setShowAddExercise(true)} />
        )}
      </SectionCard>

      <PrimaryButton
        label={isPaused ? '운동 재개' : '일시정지'}
        variant="secondary"
        onPress={handlePauseToggle}
      />
      <PrimaryButton label="운동 종료" onPress={handleEnd} />
    </ScreenScroll>
  );
}

function getTodayRecordCount(records: WorkoutRecord[]): number {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  return records.filter((r) => r.date === todayStr).length;
}

function renderSummary(summary: SessionSummaryWithLine, onConfirm: () => void) {
  return (
    <ScreenScroll>
      <SectionCard title="운동 종료">
        <ThemedText type="small" themeColor="textSecondary">
          {StanleyTrainer.portraitPlaceholder} {summary.trainerLine}
        </ThemedText>
        <View style={styles.summaryStats}>
          <ThemedText type="smallBold">운동 시간: {summary.durationMinutes}분</ThemedText>
          <ThemedText type="smallBold">종류: {WorkoutCategoryLabels[summary.category]}</ThemedText>
          <ThemedText type="smallBold">운동 수: {summary.exerciseCount}개</ThemedText>
          <ThemedText type="smallBold">총 세트: {summary.completedSets}세트</ThemedText>
          {summary.totalVolumeKg > 0 && (
            <ThemedText type="smallBold">총 볼륨: {Math.round(summary.totalVolumeKg)}kg</ThemedText>
          )}
          <ThemedText type="smallBold">이번 주 {summary.weeklyCount}회</ThemedText>
          <ThemedText type="smallBold">연속 {summary.streak}일째</ThemedText>
        </View>

        {summary.prs.length > 0 && (
          <ThemedView type="backgroundSelected" style={styles.prBox}>
            <ThemedText type="smallBold">🏆 NEW PR</ThemedText>
            {summary.prs.map((pr) => (
              <ThemedText key={pr.exerciseId} type="small">
                {pr.exerciseName} {pr.weightKg}kg
                {pr.previousBestWeightKg ? ` (이전 ${pr.previousBestWeightKg}kg)` : ' (첫 기록)'}
              </ThemedText>
            ))}
          </ThemedView>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          +{summary.xpAwarded} XP · HELL PASS Lv.{summary.passLevel}
          {summary.routineCompleted ? ' · 루틴 완료!' : ''}
        </ThemedText>

        <PrimaryButton label="확인" onPress={onConfirm} />
      </SectionCard>
    </ScreenScroll>
  );
}

function PreviousPerformanceLine({
  exerciseId,
  records,
}: {
  exerciseId: string;
  records: WorkoutRecord[];
}) {
  const previous = findPreviousPerformance(exerciseId, records);
  if (!previous) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        이 운동 기록은 이번이 처음이에요.
      </ThemedText>
    );
  }
  return (
    <ThemedText type="small" themeColor="textSecondary">
      지난번({previous.date}):{' '}
      {previous.sets.map((s) => `${s.weightKg ?? '-'}kg×${s.reps ?? '-'}`).join(' / ')}
    </ThemedText>
  );
}

function SetRow({
  index,
  set,
  onChange,
  onComplete,
}: {
  index: number;
  set: WorkoutSetEntry;
  onChange: (patch: { weightKg?: number; reps?: number }) => void;
  onComplete: () => void;
}) {
  return (
    <View style={styles.setRow}>
      <ThemedText type="smallBold" style={styles.setIndex}>
        {index}
      </ThemedText>
      {set.completed ? (
        <ThemedText type="small" style={styles.setSummary}>
          {set.weightKg ?? '-'}kg × {set.reps ?? '-'}회 ✓
        </ThemedText>
      ) : (
        <>
          <TextField
            keyboardType="numeric"
            value={set.weightKg !== undefined ? String(set.weightKg) : ''}
            onChangeText={(text) => onChange({ weightKg: text ? Number(text) : undefined })}
            placeholder="kg"
            style={styles.setInput}
          />
          <TextField
            keyboardType="numeric"
            value={set.reps !== undefined ? String(set.reps) : ''}
            onChangeText={(text) => onChange({ reps: text ? Number(text) : undefined })}
            placeholder="회"
            style={styles.setInput}
          />
          <PrimaryButton label="✓" onPress={onComplete} style={styles.setCheckButton} />
        </>
      )}
    </View>
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
  navRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  navButton: {
    flex: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  setIndex: {
    width: 20,
  },
  setSummary: {
    flex: 1,
  },
  setInput: {
    flex: 1,
  },
  setCheckButton: {
    width: 52,
  },
  restTimer: {
    textAlign: 'center',
  },
  customRestRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  customRestInput: {
    flex: 1,
  },
  prBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryStats: {
    gap: Spacing.one,
  },
});
