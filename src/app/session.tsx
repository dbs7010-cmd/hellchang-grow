import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { PlayerCharacter } from '@/components/character/player-character';
import { GoldsunReaction } from '@/components/goldsun/goldsun-reaction';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { CircularProgressRing } from '@/components/ui/circular-progress-ring';
import { ExerciseArtSlot } from '@/components/ui/exercise-art-slot';
import { MetricGrid, MetricTile } from '@/components/ui/metric-tile';
import { PRBadge } from '@/components/ui/pr-badge';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { searchExercises } from '@/config/exercises';
import { StanleyTrainer } from '@/config/trainers';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Layout, Motion, Radius, Spacing } from '@/constants/theme';
import { EndSessionSummary, useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import { SessionExerciseEntry, WorkoutSession } from '@/types/workout-session';
import { detectPRs, findPreviousPerformance, PrEvent } from '@/utils/exercise-history';
import { createId } from '@/utils/id';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { characterAppearanceFromProfile } from '@/utils/character-appearance';
import { formatVolumeKg } from '@/utils/workout-stats';
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

/**
 * 03 ACTIVE / 04 REST / 05 RESULT.
 *
 * 세션 도메인 로직(activeSince 기반 타이머, pause/resume, 세트 기록, 휴식, 종료 요약)은
 * WEIGHT CORE에서 확정된 것을 그대로 쓴다 — 이 파일에서 바뀐 건 화면 구성뿐이다.
 *
 * 구성 원칙:
 *  - ACTIVE는 스크롤 없이 "지금 이 세트"를 조작할 수 있어야 한다. 그래서 화면 전체를
 *    ScrollView로 감싸지 않고, 완료 세트 목록만 가운데에서 스크롤된다.
 *  - REST는 별도 상태다. 휴식 중에는 원형 타이머가 화면의 주인공이 된다.
 *  - RESULT는 통계 영수증이 아니라 보상 화면이다. [확인]은 항상 화면에 보인다.
 */
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
  const [confirmEnd, setConfirmEnd] = useState(false);

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
    setConfirmEnd(false);
    endingRef.current = true;
    const trainerLine = pickTrainerLine(StanleyTrainer.dialogueSet.sessionEnd).text;
    const result = await endWorkoutSession();
    if (result) {
      setSummary({ ...result, trainerLine });
    } else {
      endingRef.current = false;
    }
  };

  const reaction = (
    <GoldsunReaction
      visible={reactionVisible}
      portrait={StanleyTrainer.portraitPlaceholder}
      name={StanleyTrainer.displayName}
      text={stanleyLine}
      onDismiss={() => setReactionVisible(false)}
    />
  );

  if (isResting) {
    return (
      <RestScreen
        session={activeSession}
        secondsRemaining={restSecondsRemaining}
        elapsedSeconds={elapsedSeconds}
        currentExercise={currentExercise}
        reaction={reaction}
        onPauseToggle={handlePauseToggle}
        onSkip={skipSessionRest}
      />
    );
  }

  return (
    <SessionShell
      elapsedSeconds={elapsedSeconds}
      isPaused={isPaused}
      onPauseToggle={handlePauseToggle}
      statusLabel={
        currentExercise
          ? `${completedSets.length}세트 완료 · 운동 ${currentIndex + 1}/${activeSession.exercises.length}`
          : undefined
      }
      reaction={reaction}>
      {prCelebration && <PrCelebrationOverlay pr={prCelebration} />}

      {activeSession.exercises.length === 0 && (
        <Section title="운동 종류">
          <ChipRow>
            {WorkoutCategories.map((category) => (
              <Chip
                key={category}
                label={WorkoutCategoryLabels[category]}
                selected={activeSession.primaryCategory === category}
                onPress={() => changeSessionCategory(category)}
              />
            ))}
          </ChipRow>
        </Section>
      )}

      {currentExercise && (
        <>
          {/* 현재 운동명은 화면에서 가장 먼저 읽혀야 한다 — 운동 이미지는 옆의 작은 참고용 슬롯. */}
          <View style={styles.exerciseHeader}>
            <ExerciseArtSlot exerciseId={currentExercise.exerciseId} style={styles.exerciseThumb} />
            <View style={styles.exerciseHeaderText}>
              <ThemedText type="heading" numberOfLines={1}>
                {currentExercise.exerciseName}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                지금 {completedSets.length + 1}세트째
              </ThemedText>
            </View>
            <View style={styles.exerciseNav}>
              <NavArrow
                label="‹"
                disabled={!previousExercise}
                onPress={() => previousExercise && setCurrentSessionExercise(previousExercise.id)}
              />
              <NavArrow
                label="›"
                disabled={!nextExercise}
                onPress={() => nextExercise && setCurrentSessionExercise(nextExercise.id)}
              />
            </View>
          </View>

          {pendingSet ? (
            <SetHero
              set={pendingSet}
              onChange={(patch) => handleUpdateSet(pendingSet.id, patch)}
              onComplete={() => handleCompleteSet(pendingSet.id)}
            />
          ) : (
            <PrimaryButton label="+ 세트 시작" variant="gold" size="large" onPress={handleAddSet} />
          )}

          {/* 세트가 쌓여도 아래 조작 바를 밀어내지 않도록 이 영역만 스크롤된다. */}
          <ScrollView
            style={styles.logScroll}
            contentContainerStyle={styles.logContent}
            showsVerticalScrollIndicator={false}>
            <PreviousPerformanceLine exerciseId={currentExercise.exerciseId} records={workoutRecords} />
            {completedSets.map((set, index) => (
              <ThemedText key={set.id} type="caption" themeColor="textSecondary">
                {index + 1}. {set.weightKg ?? '-'}kg × {set.reps ?? '-'}회 ✓
              </ThemedText>
            ))}
          </ScrollView>

          {activeSession.exercises.length > 1 && (
            <ChipRow bleed>
              {activeSession.exercises.map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.exerciseName}
                  selected={exercise.id === currentExercise?.id}
                  onPress={() => setCurrentSessionExercise(exercise.id)}
                />
              ))}
            </ChipRow>
          )}
        </>
      )}

      {showAddExercise && (
        <Section title="운동 추가">
          <TextField
            value={addExerciseQuery}
            onChangeText={setAddExerciseQuery}
            placeholder="운동 검색 또는 직접 입력"
          />
          <ChipRow>
            {searchExercises(addExerciseQuery)
              .slice(0, 8)
              .map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.name}
                  onPress={() => handleAddExerciseByName(exercise.id, exercise.name)}
                />
              ))}
          </ChipRow>
          <View style={styles.inlineRow}>
            <PrimaryButton
              label="직접 추가"
              variant="secondary"
              style={styles.flexItem}
              onPress={handleAddCustomExercise}
            />
            <PrimaryButton
              label="닫기"
              variant="secondary"
              style={styles.flexItem}
              onPress={() => setShowAddExercise(false)}
            />
          </View>
        </Section>
      )}

      {!showAddExercise && (
        <View style={styles.restPicker}>
          <ThemedText type="caption" themeColor="textSecondary">
            휴식
          </ThemedText>
          <View style={styles.inlineRow}>
            <ChipRow>
              {AppConfig.restTimerPresetsSeconds.map((seconds) => (
                <Chip key={seconds} label={`${seconds}초`} onPress={() => handleStartRest(seconds)} />
              ))}
            </ChipRow>
            <TextField
              keyboardType="numeric"
              value={customRestSeconds}
              onChangeText={setCustomRestSeconds}
              placeholder="직접"
              containerStyle={styles.restInput}
              onSubmitEditing={handleStartCustomRest}
            />
          </View>
        </View>
      )}

      {/* 하단 조작 바: 운동 추가 / 운동 종료. 종료는 2단계 확인을 거친다 — 세트 완료 옆에서
          잘못 눌러 세션이 날아가는 사고를 막는다. Gold는 [세트 완료]에만 쓴다. */}
      {confirmEnd ? (
        <View style={styles.confirmBar}>
          <ThemedText type="small" style={styles.confirmText}>
            운동을 종료할까요?
          </ThemedText>
          <View style={styles.inlineRow}>
            <PrimaryButton
              label="계속 운동"
              variant="secondary"
              style={styles.flexItem}
              onPress={() => setConfirmEnd(false)}
            />
            <PrimaryButton
              label="종료하고 기록"
              variant="gold"
              haptic="medium"
              style={styles.flexItem}
              onPress={handleEnd}
            />
          </View>
        </View>
      ) : (
        <View style={styles.bottomBar}>
          <PrimaryButton
            label="+ 운동 추가"
            variant="secondary"
            style={styles.flexItem}
            onPress={() => setShowAddExercise(true)}
          />
          <PrimaryButton
            label="운동 종료"
            variant="secondary"
            style={styles.flexItem}
            onPress={() => setConfirmEnd(true)}
          />
        </View>
      )}
    </SessionShell>
  );
}

/**
 * ACTIVE/REST가 공유하는 껍데기: 안전영역 + 상단 상태줄(운동중/일시정지 · 경과시간 · 일시정지 버튼)
 * + 골드썬 반응 앵커. 일시정지는 항상 같은 자리에 있어 어느 상태에서도 찾을 수 있다.
 */
function SessionShell({
  elapsedSeconds,
  isPaused,
  onPauseToggle,
  statusLabel,
  reaction,
  children,
}: {
  elapsedSeconds: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  statusLabel?: string;
  reaction: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.statusRow}>
        <View style={styles.statusText}>
          <ThemedText type="smallBold" style={{ color: isPaused ? theme.textSecondary : theme.gold }}>
            {isPaused ? '⏸ 일시정지' : '🟢 운동 중'}
          </ThemedText>
          {statusLabel && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {statusLabel}
            </ThemedText>
          )}
        </View>
        <ThemedText type="smallBold" style={styles.timerCompact}>
          {formatElapsedTime(elapsedSeconds)}
        </ThemedText>
        <Pressable
          onPress={onPauseToggle}
          hitSlop={10}
          style={[styles.pauseButton, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? '운동 재개' : '일시정지'}>
          <ThemedText type="smallBold">{isPaused ? '▶' : '❚❚'}</ThemedText>
        </Pressable>
      </View>

      <View
        style={[styles.reactionAnchor, { top: insets.top + REACTION_TOP_OFFSET }]}
        pointerEvents="box-none">
        {reaction}
      </View>

      {children}
    </ThemedView>
  );
}

/** 상태줄(약 40px) 바로 아래에 골드썬 반응이 겹치도록 하는 오프셋. */
const REACTION_TOP_OFFSET = 52;

function NavArrow({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8}>
      <View
        style={[
          styles.navArrow,
          { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          disabled && styles.navArrowDisabled,
        ]}>
        <ThemedText type="smallBold" themeColor={disabled ? 'textSecondary' : 'text'}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function getTodayRecordCount(records: WorkoutRecord[]): number {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  return records.filter((r) => r.date === todayStr).length;
}

/**
 * 05 RESULT — 통계 영수증이 아니라 보상의 순간.
 * 계층: HERO(완료 + 캐릭터 자리 + 골드썬 한마디) → 오늘의 성과(실제 수치) → 성장 보상(XP/연속).
 * 값이 없는 항목은 지어내지 않고 숨긴다. [확인]은 스크롤 밖 고정이라 항상 보인다.
 *
 * FAT CUT / STRENGTH UP / Body Growth는 아직 도메인이 없어 표시하지 않는다 —
 * "성장 보상" 블록 아래에 그대로 이어 붙일 수 있게 구조만 비워뒀다.
 */
function ResultScreen({ summary, onConfirm }: { summary: SessionSummaryWithLine; onConfirm: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAppData();

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.resultContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.resultHero}>
          {/* 홈과 같은 캐릭터. 승리/회복 포즈가 생기면 registry의 result 슬롯만 채우면 된다. */}
          <View style={styles.resultCharacter}>
            <PlayerCharacter
              appearance={characterAppearanceFromProfile(profile)}
              slot="result"
              height={RESULT_CHARACTER_HEIGHT}
            />
          </View>
          <ThemedText type="subtitle" style={[styles.centered, { color: theme.gold }]}>
            🏆 WORKOUT COMPLETE
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {StanleyTrainer.portraitPlaceholder} {summary.trainerLine}
          </ThemedText>
        </View>

        <Section title="오늘의 성과">
          <MetricGrid>
            <MetricTile index={0} label="총 세트" value={`${summary.completedSets}세트`} />
            {summary.totalVolumeKg > 0 && (
              <MetricTile index={1} label="총 볼륨" value={formatVolumeKg(summary.totalVolumeKg)} />
            )}
            <MetricTile index={2} label="운동 시간" value={formatDurationMinutes(summary.durationMinutes)} />
            {summary.prs.length > 0 && (
              <MetricTile index={3} label="PR" value={`${summary.prs.length}개 NEW`} accent />
            )}
          </MetricGrid>

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
        </Section>

        <Section title="성장 보상">
          <ThemedView type="backgroundElement" style={[styles.rewardCard, { borderColor: theme.gold }]}>
            <View style={styles.rewardRow}>
              <ThemedText type="captionBold" style={{ color: theme.gold }}>
                HELL PASS
              </ThemedText>
              <ThemedText type="metric" style={{ color: theme.gold }}>
                +{summary.xpAwarded} XP
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Lv.{summary.passLevel} · 연속 {summary.streak}일째
              {summary.routineCompleted ? ' · 루틴 완료!' : ''}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              이번 주 {summary.weeklyCount}번째 운동 · {WorkoutCategoryLabels[summary.category]} · 운동{' '}
              {summary.exerciseCount}개
            </ThemedText>
          </ThemedView>
        </Section>
      </ScrollView>

      <View style={styles.resultFooter}>
        <PrimaryButton label="확인" variant="gold" size="large" onPress={onConfirm} />
      </View>
    </ThemedView>
  );
}

const RESULT_CHARACTER_HEIGHT = 150;

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
      <ThemedText type="caption" themeColor="textSecondary">
        이 운동 기록은 이번이 처음이에요.
      </ThemedText>
    );
  }
  const lastSet = previous.sets[previous.sets.length - 1];
  const bestSet = previous.sets.find((set) => set.weightKg === previous.maxWeightKg);

  return (
    <View style={styles.previousBlock}>
      {lastSet && (
        <ThemedText type="caption" themeColor="textSecondary">
          이전: {lastSet.weightKg ?? '-'}kg × {lastSet.reps ?? '-'}회
        </ThemedText>
      )}
      {bestSet && previous.maxWeightKg !== undefined && (
        <ThemedText type="caption" themeColor="textSecondary">
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
          <ThemedText type="caption" themeColor="textSecondary">
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
          <ThemedText type="caption" themeColor="textSecondary">
            회
          </ThemedText>
        </View>
        <StepperButton label="+" onPress={() => stepReps(AppConfig.setRepsStep)} />
      </View>
      <PrimaryButton
        label="✓ 세트 완료"
        variant="gold"
        size="large"
        haptic="medium"
        style={styles.fullWidth}
        onPress={onComplete}
      />
    </View>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <ThemedView type="backgroundSelected" style={styles.stepperButton}>
        <ThemedText type="subtitle">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

/**
 * 04 REST — 휴식은 별도 상태다. 원형 타이머 하나가 화면의 주인공이고,
 * 그 아래에 다음 세트/건너뛰기만 둔다. 링 안쪽에는 실제 휴식 모션(숨 고르기/물 마시기)
 * 아트가 들어올 자리를 남겨뒀다 — 이번 패스에서는 애니메이션을 만들지 않는다.
 */
function RestScreen({
  session,
  secondsRemaining,
  elapsedSeconds,
  currentExercise,
  reaction,
  onPauseToggle,
  onSkip,
}: {
  session: WorkoutSession;
  secondsRemaining: number;
  elapsedSeconds: number;
  currentExercise?: SessionExerciseEntry;
  reaction: React.ReactNode;
  onPauseToggle: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const urgent = secondsRemaining <= AppConfig.restUrgentThresholdSeconds;
  const preset = Math.max(secondsRemaining, AppConfig.defaultRestSeconds);
  const ringColor = urgent ? theme.goldBright : theme.gold;
  const nextSetPreview = currentExercise ? getLastSetValues(session, currentExercise.id) : null;

  return (
    <SessionShell
      elapsedSeconds={elapsedSeconds}
      isPaused={session.status === 'paused'}
      onPauseToggle={onPauseToggle}
      statusLabel="휴식 중"
      reaction={reaction}>
      <View style={styles.restBlock}>
        <CircularProgressRing
          progress={secondsRemaining / preset}
          size={220}
          thickness={14}
          color={ringColor}
          trackColor={theme.backgroundSelected}
          holeColor={theme.background}>
          <ThemedText type="caption" themeColor="textSecondary">
            남은 시간
          </ThemedText>
          <ThemedText type="title" style={[styles.restTimer, { color: ringColor }]}>
            {formatElapsedTime(secondsRemaining)}
          </ThemedText>
        </CircularProgressRing>

        {currentExercise && nextSetPreview && (
          <View style={styles.nextSetPreview}>
            <ThemedText type="caption" themeColor="textSecondary">
              다음 세트
            </ThemedText>
            <ThemedText type="smallBold">
              {currentExercise.exerciseName} · {nextSetPreview.weightKg ?? '-'}KG ×{' '}
              {nextSetPreview.reps ?? '-'}회
            </ThemedText>
          </View>
        )}
      </View>

      <PrimaryButton label="휴식 건너뛰기" variant="gold" size="large" onPress={onSkip} />
    </SessionShell>
  );
}

function PrCelebrationOverlay({ pr }: { pr: PrEvent }) {
  const theme = useTheme();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: Motion.prCelebrationMs - 400 }),
      withTiming(0, { duration: 200 })
    );
    scale.value = withTiming(1, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.prOverlay,
        { backgroundColor: theme.backgroundElement, borderColor: theme.gold },
        animatedStyle,
      ]}>
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
  root: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusText: {
    flex: 1,
  },
  timerCompact: {
    fontVariant: ['tabular-nums'],
  },
  pauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * 골드썬 반응은 잠깐 나타났다 사라지므로 흐름(flow)에 두면 그때마다 세트 조작 UI가
   * 위아래로 튄다. 상태줄 아래에 겹쳐 띄우고, 아래 UI는 건드리지 않는다.
   */
  reactionAnchor: {
    position: 'absolute',
    left: Layout.screenPaddingX,
    right: Layout.screenPaddingX,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  exerciseThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.medium,
  },
  exerciseHeaderText: {
    flex: 1,
  },
  exerciseNav: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    opacity: 0.35,
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  previousBlock: {
    gap: Spacing.half,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
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
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 44,
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
  restPicker: {
    gap: Spacing.one,
  },
  restInput: {
    width: 72,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  flexItem: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmBar: {
    gap: Spacing.two,
  },
  confirmText: {
    textAlign: 'center',
  },
  restBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  restTimer: {
    fontVariant: ['tabular-nums'],
  },
  nextSetPreview: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  centered: {
    textAlign: 'center',
  },
  resultContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  resultHero: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  resultCharacter: {
    height: RESULT_CHARACTER_HEIGHT,
    width: '100%',
    justifyContent: 'center',
  },
  resultFooter: {
    paddingTop: Spacing.two,
  },
  rewardCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Layout.cardPadding,
    gap: Spacing.one,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  prBox: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  /**
   * PR 축하는 1.8초 뒤 사라지는 연출이다. 흐름에 두면 나타났다 사라질 때마다 세트 조작 UI가
   * 통째로 밀렸다 돌아온다 — 겹쳐 띄운다.
   */
  prOverlay: {
    position: 'absolute',
    left: Layout.screenPaddingX,
    right: Layout.screenPaddingX,
    top: '32%',
    borderRadius: Radius.large,
    borderWidth: 2,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
    zIndex: 20,
  },
});
