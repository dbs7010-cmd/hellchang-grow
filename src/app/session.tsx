import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { GoldsunReaction } from '@/components/goldsun/goldsun-reaction';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { PRBadge } from '@/components/ui/pr-badge';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ResultStat, ResultStatList } from '@/components/ui/result-stat';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { searchExercises } from '@/config/exercises';
import { StanleyTrainer } from '@/config/trainers';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { EndSessionSummary, useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import { detectPRs, findPreviousPerformance, PrEvent } from '@/utils/exercise-history';
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

function prKey(pr: PrEvent) {
  return `${pr.exerciseId}-${pr.weightKg}`;
}

export default function SessionScreen() {
  const router = useRouter();
  const {
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
  const seenPrKeysRef = useRef<Set<string>>(new Set());
  const restHapticFiredRef = useRef(false);

  const hadEarlierSessionToday = getTodayRecordCount(workoutRecords) > 0;
  const [stanleyLine, setStanleyLine] = useState(() =>
    pickTrainerLine(
      hadEarlierSessionToday
        ? StanleyTrainer.dialogueSet.sessionSecondToday
        : StanleyTrainer.dialogueSet.sessionStart
    ).text
  );
  const [reactionVisible, setReactionVisible] = useState(true);
  const [prCelebration, setPrCelebration] = useState<PrEvent | null>(null);

  const showReaction = (text: string) => {
    setStanleyLine(text);
    setReactionVisible(true);
  };

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
          showReaction(pickTrainerLine(StanleyTrainer.dialogueSet.sessionLong).text);
        } else if (minutes >= 20 && lastMilestoneRef.current < 20) {
          lastMilestoneRef.current = 20;
          showReaction(pickTrainerLine(StanleyTrainer.dialogueSet.sessionExtended).text);
        } else if (minutes >= 10 && lastMilestoneRef.current < 10) {
          lastMilestoneRef.current = 10;
          showReaction(pickTrainerLine(StanleyTrainer.dialogueSet.sessionMidway).text);
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

  // 실시간 PR 감지: 세트를 완료할 때마다 activeSession이 바뀌므로, 기존 detectPRs를
  // 세션 종료를 기다리지 않고 그대로 재사용해 "새로 나타난" PR만 축하 연출로 보여준다.
  useEffect(() => {
    if (!activeSession) return;
    const prs = detectPRs(activeSession, workoutRecords);
    const freshPr = prs.find((pr) => !seenPrKeysRef.current.has(prKey(pr)));
    if (freshPr) {
      seenPrKeysRef.current.add(prKey(freshPr));
      setPrCelebration(freshPr);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      const timer = setTimeout(() => setPrCelebration(null), Motion.prCelebrationMs);
      return () => clearTimeout(timer);
    }
  }, [activeSession, workoutRecords]);

  // 휴식이 새로 시작될 때마다(최대 한 번) 골드썬이 가끔 등장한다 — "가끔"이므로 확률적으로.
  // setState를 effect 본문에서 동기 호출하지 않도록 콜백(setTimeout)으로 감싼다.
  useEffect(() => {
    if (!activeSession?.restUntilMs) return;
    restHapticFiredRef.current = false;
    const timer = setTimeout(() => {
      if (Math.random() < 0.5) {
        showReaction(pickTrainerLine(StanleyTrainer.dialogueSet.restReaction).text);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeSession?.restUntilMs]);

  // 휴식이 0에 도달하는 순간 딱 한 번 haptic을 울린다.
  useEffect(() => {
    if (!activeSession?.restUntilMs) return;
    const remaining = getRestSecondsRemaining(activeSession, nowMs);
    if (remaining <= 0 && !restHapticFiredRef.current) {
      restHapticFiredRef.current = true;
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    }
  }, [activeSession, nowMs]);

  if (!activeSession) {
    return summary ? <ResultScreen summary={summary} onConfirm={() => router.back()} /> : null;
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
  const pendingSet = currentExercise?.sets.find((set) => !set.completed);
  const completedSets = currentExercise?.sets.filter((set) => set.completed) ?? [];

  const handlePauseToggle = async () => {
    if (isPaused) {
      await resumeWorkoutSession();
      showReaction(pickTrainerLine(StanleyTrainer.dialogueSet.sessionResumed).text);
    } else {
      await pauseWorkoutSession();
      showReaction(pickTrainerLine(StanleyTrainer.dialogueSet.sessionPaused).text);
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
      {/* ACTIVE 화면의 HERO는 캐릭터가 아니라 지금 이 세트다 — 운동시간은 보조 정보로
          같은 줄에 작게만 둔다. 사용자가 첫 화면에서 바로 세트를 조작할 수 있어야 한다. */}
      <View style={styles.statusRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {isPaused ? '⏸ 일시정지' : '🟢 운동 중'}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.timerCompact}>
          {formatElapsedTime(elapsedSeconds)}
        </ThemedText>
      </View>

      <View style={styles.reactionAnchor}>
        <GoldsunReaction
          visible={reactionVisible}
          portrait={StanleyTrainer.portraitPlaceholder}
          name={StanleyTrainer.displayName}
          text={stanleyLine}
          onDismiss={() => setReactionVisible(false)}
        />
      </View>

      {prCelebration && <PrCelebrationOverlay pr={prCelebration} />}

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

      {currentExercise && (
        <SectionCard title={currentExercise.exerciseName}>
          <PreviousPerformanceLine exerciseId={currentExercise.exerciseId} records={workoutRecords} />

          {pendingSet ? (
            <SetHero
              set={pendingSet}
              onChange={(patch) => handleUpdateSet(pendingSet.id, patch)}
              onComplete={() => handleCompleteSet(pendingSet.id)}
            />
          ) : (
            <PrimaryButton label="+ 세트 시작" variant="secondary" onPress={handleAddSet} />
          )}

          {completedSets.length > 0 && (
            <View style={styles.completedList}>
              {completedSets.map((set, index) => (
                <ThemedText key={set.id} type="small" themeColor="textSecondary">
                  {index + 1}. {set.weightKg ?? '-'}kg × {set.reps ?? '-'}회 ✓
                </ThemedText>
              ))}
            </View>
          )}

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

      {activeSession.exercises.length > 1 && (
        <View style={styles.exerciseSwitcher}>
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
        </View>
      )}

      <SectionCard title="휴식">
        {isResting ? (
          <RestTimer
            secondsRemaining={restSecondsRemaining}
            onSkip={skipSessionRest}
          />
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
      <PrimaryButton label="운동 종료" variant="gold" haptic="medium" onPress={handleEnd} />
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

function ResultScreen({ summary, onConfirm }: { summary: SessionSummaryWithLine; onConfirm: () => void }) {
  const theme = useTheme();
  return (
    <ScreenScroll>
      <SectionCard>
        <ThemedText type="subtitle" style={{ color: theme.gold }}>
          WORKOUT COMPLETE
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {StanleyTrainer.portraitPlaceholder} {summary.trainerLine}
        </ThemedText>

        <ResultStatList>
          <ResultStat index={0} label="운동 시간" value={`${summary.durationMinutes}분`} emphasize />
          <ResultStat index={1} label="종류" value={WorkoutCategoryLabels[summary.category]} />
          <ResultStat index={2} label="운동 수" value={`${summary.exerciseCount}개`} />
          <ResultStat index={3} label="총 세트" value={`${summary.completedSets}세트`} />
          {summary.totalVolumeKg > 0 && (
            <ResultStat index={4} label="총 볼륨" value={`${Math.round(summary.totalVolumeKg)}kg`} />
          )}
          {summary.prs.length > 0 && (
            <ResultStat index={5} label="PR" value={`${summary.prs.length}개`} emphasize />
          )}
          <ResultStat
            index={6}
            label="HELL PASS"
            value={`+${summary.xpAwarded} XP · Lv.${summary.passLevel}`}
            emphasize
          />
        </ResultStatList>

        {summary.prs.length > 0 && (
          <ThemedView type="backgroundSelected" style={styles.prBox}>
            <PRBadge />
            {summary.prs.map((pr) => (
              <ThemedText key={pr.exerciseId} type="small">
                {pr.exerciseName} {pr.weightKg}kg
                {pr.previousBestWeightKg ? ` (이전 ${pr.previousBestWeightKg}kg)` : ' (첫 기록)'}
              </ThemedText>
            ))}
          </ThemedView>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          이번 주 {summary.weeklyCount}회 · 연속 {summary.streak}일째
          {summary.routineCompleted ? ' · 루틴 완료!' : ''}
        </ThemedText>

        <PrimaryButton label="확인" variant="gold" onPress={onConfirm} />
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
  const lastSet = previous.sets[previous.sets.length - 1];
  const bestSet = previous.sets.find((set) => set.weightKg === previous.maxWeightKg);

  return (
    <View style={styles.previousBlock}>
      {lastSet && (
        <ThemedText type="small" themeColor="textSecondary">
          이전: {lastSet.weightKg ?? '-'}kg × {lastSet.reps ?? '-'}회
        </ThemedText>
      )}
      {bestSet && previous.maxWeightKg !== undefined && (
        <ThemedText type="small" themeColor="textSecondary">
          최근 최고: {previous.maxWeightKg}kg × {bestSet.reps ?? '-'}회
        </ThemedText>
      )}
    </View>
  );
}

/** 다음에 완료할 세트 하나를 크게 보여주는 stepper. 완료된 세트는 아래 목록에서 압축 표시한다. */
function SetHero({
  set,
  onChange,
  onComplete,
}: {
  set: WorkoutSetEntry;
  onChange: (patch: { weightKg?: number; reps?: number }) => void;
  onComplete: () => void;
}) {
  const theme = useTheme();
  const weight = set.weightKg ?? 0;
  const reps = set.reps ?? 0;

  const stepWeight = (delta: number) => onChange({ weightKg: Math.max(0, weight + delta) });
  const stepReps = (delta: number) => onChange({ reps: Math.max(0, reps + delta) });

  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <StepperButton label="−" onPress={() => stepWeight(-AppConfig.setWeightStepKg)} />
        <View style={styles.heroValue}>
          <TextField
            keyboardType="numeric"
            value={String(weight)}
            onChangeText={(text) => onChange({ weightKg: text ? Math.max(0, Number(text)) : 0 })}
            style={[styles.heroInput, { color: theme.gold }]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            kg
          </ThemedText>
        </View>
        <StepperButton label="+" onPress={() => stepWeight(AppConfig.setWeightStepKg)} />
      </View>
      <View style={styles.heroRow}>
        <StepperButton label="−" onPress={() => stepReps(-AppConfig.setRepsStep)} />
        <View style={styles.heroValue}>
          <TextField
            keyboardType="numeric"
            value={String(reps)}
            onChangeText={(text) => onChange({ reps: text ? Math.max(0, Number(text)) : 0 })}
            style={styles.heroInput}
          />
          <ThemedText type="small" themeColor="textSecondary">
            회
          </ThemedText>
        </View>
        <StepperButton label="+" onPress={() => stepReps(AppConfig.setRepsStep)} />
      </View>
      <PrimaryButton label="✓ 세트 완료" variant="gold" size="large" haptic="medium" onPress={onComplete} />
    </View>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <ThemedView type="backgroundSelected" style={styles.stepperButton}>
        <ThemedText type="title">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function RestTimer({ secondsRemaining, onSkip }: { secondsRemaining: number; onSkip: () => void }) {
  const theme = useTheme();
  const urgent = secondsRemaining <= AppConfig.restUrgentThresholdSeconds;
  const preset = Math.max(secondsRemaining, AppConfig.defaultRestSeconds);

  return (
    <View style={styles.restBlock}>
      <ThemedText type="title" style={[styles.restTimer, { color: urgent ? theme.goldBright : theme.gold }]}>
        {secondsRemaining}초
      </ThemedText>
      <ProgressBar
        progress={secondsRemaining / preset}
        height={8}
        color={urgent ? theme.goldBright : theme.gold}
        trackColor={theme.backgroundSelected}
      />
      <PrimaryButton label="건너뛰기" variant="secondary" onPress={onSkip} />
    </View>
  );
}

function PrCelebrationOverlay({ pr }: { pr: PrEvent }) {
  const theme = useTheme();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withSequence(withTiming(1, { duration: 200 }), withTiming(1, { duration: Motion.prCelebrationMs - 400 }), withTiming(0, { duration: 200 }));
    scale.value = withTiming(1, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.prOverlay, { backgroundColor: theme.backgroundElement, borderColor: theme.gold }, animatedStyle]}>
      <ThemedText type="subtitle" style={{ color: theme.gold }}>
        🏆 NEW PR
      </ThemedText>
      <ThemedText type="smallBold">
        {pr.exerciseName} {pr.weightKg}kg
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  timerCompact: {
    fontVariant: ['tabular-nums'],
  },
  exerciseSwitcher: {
    opacity: 0.9,
  },
  reactionAnchor: {
    alignItems: 'flex-end',
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
  previousBlock: {
    gap: Spacing.half,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  heroValue: {
    alignItems: 'center',
    minWidth: 96,
  },
  heroInput: {
    backgroundColor: 'transparent',
    width: 96,
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 48,
    paddingHorizontal: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedList: {
    gap: Spacing.half,
  },
  restBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  restTimer: {
    fontVariant: ['tabular-nums'],
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
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  prOverlay: {
    borderRadius: Radius.large,
    borderWidth: 2,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
});
