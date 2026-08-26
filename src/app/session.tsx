import { useNavigation, useRootNavigationState, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { CharacterMotionStage } from '@/components/character/character-motion-stage';
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
import { getResolvedExerciseById, searchExercises } from '@/config/exercises';
import { inferMotionFamily } from '@/config/motion-families';
import { StanleyTrainer } from '@/config/trainers';
import { WorkoutCategories, WorkoutCategoryLabels } from '@/config/workout-labels';
import { Layout, Motion, Radius, Spacing } from '@/constants/theme';
import { EndSessionSummary, useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { WorkoutRecord, WorkoutSetEntry } from '@/types/workout';
import { SessionExerciseEntry, WorkoutSession } from '@/types/workout-session';
import {
  describePrAchievement,
  describePrPrevious,
  detectPRs,
  findPreviousPerformance,
  PrEvent,
} from '@/utils/exercise-history';
import { createId } from '@/utils/id';
import { withObjectParticle } from '@/utils/korean';
import {
  buildDanbaekGainVoice,
  buildDanbaekSetVoice,
  describeLearningGain,
} from '@/utils/danbaek-learning-presence';
import {
  buildGrowthRevealMuscles,
  buildGrowthHighlight,
  buildGrowthRevealSequence,
  hasPermanentBodyChange,
  resolveGrowthComparisonCamera,
  revealBodyParameters,
  type GrowthComparisonCamera,
  type GrowthRevealPhase,
} from '@/utils/growth-reveal';
import {
  resolveSessionConfirm,
  shouldClearEndConfirm,
  shouldConfirmSessionExit,
} from '@/utils/session-exit';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { formatVolumeKg } from '@/utils/workout-stats';
import {
  deriveWorkoutCharacterState,
  getExerciseReactionCopy,
  isSetCompletePresenting,
  SetCompletePresentationMs,
  willCountAsEffectiveSet,
} from '@/utils/workout-character-motion';
import {
  computeCompletedSetsCount,
  computeElapsedSeconds,
  isEffectiveSet,
  formatElapsedTime,
  getAutoRestSeconds,
  getCurrentExercise,
  getLastSetValues,
  getNextExercise,
  getRestProgress,
  getRestSecondsRemaining,
  getSetProgress,
} from '@/utils/workout-session';

interface SessionSummaryWithLine extends EndSessionSummary {
  trainerLine: string;
}

function prKey(pr: PrEvent) {
  // 같은 운동의 같은 중량이라도 종류가 다르면 다른 사건이다. 반대로 같은 중량에서 횟수를
  // 한 번 더 늘릴 때마다 축하가 다시 뜨지는 않게, 횟수는 키에 넣지 않는다.
  return `${pr.exerciseId}-${pr.kind}-${pr.weightKg}`;
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
    loading,
    workoutRecords,
    characterAppearance,
    bodyParameters,
    pauseWorkoutSession,
    resumeWorkoutSession,
    changeSessionCategory,
    addExerciseToSession,
    setCurrentSessionExercise,
    addSetToExercise,
    updateSessionSet,
    adjustSessionSet,
    completeSessionSet,
    ensureSessionPendingSet,
    startSessionRest,
    skipSessionRest,
    discardWorkoutSession,
    endWorkoutSession,
  } = useAppData();

  /**
   * 세션 화면에서 나가는 단 하나의 경로 — 목적지는 언제나 홈이다.
   *
   * 두 단계인 이유:
   *  - 보통은 홈/운동 탭에서 들어오므로 back()이 정확히 홈으로 되돌린다.
   *  - 세션이 앱의 첫 화면이면(알림/딥링크/재실행) 되돌아갈 화면이 없다. 이때는 탭
   *    그룹을 직접 지정해 교체한다 — 그냥 "/"로 replace하면 스택 밖의 그룹이라
   *    아무 일도 일어나지 않고 빈 화면에 갇힌다(실제로 그렇게 갇혔다).
   */
  const exitToHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);


  /**
   * 루트 네비게이터가 마운트됐는지. key가 생기기 전에 부른 router.replace()는 조용히
   * 무시되고 다시 시도되지 않는다 — 세션 화면을 앱의 첫 화면으로 열었을 때 빈 화면에
   * 갇히던 원인이다. 준비된 뒤에 나가도록 이 값을 effect의 조건으로 쓴다.
   */
  const rootNavigationState = useRootNavigationState();
  const navigatorReady = Boolean(rootNavigationState?.key);
  const navigation = useNavigation();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [summary, setSummary] = useState<SessionSummaryWithLine | null>(null);
  const lastMilestoneRef = useRef(0);
  /** 연타 방지용(동기 판단). 렌더에서는 읽지 않는다 — 그 용도는 아래 ending state다. */
  const endingRef = useRef(false);
  /** 종료 처리 중인지. 결과 화면이 뜨기 직전 한 프레임에 홈으로 튕기지 않게 렌더가 본다. */
  const [ending, setEnding] = useState(false);
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
  const [endError, setEndError] = useState<string | null>(null);
  /** 뒤로가기를 가로챈 상태인지. 확인 바를 띄우는 동안 화면은 그대로 남는다. */
  /**
   * 방금 유효 세트를 끝냈다는 짧은 표시. **표현 전용 일시 상태다** — 성장/보상과 무관하고
   * 저장되지 않으며, 화면을 벗어나면 컴포넌트와 함께 사라진다.
   */
  const [setReaction, setSetReaction] = useState<string | null>(null);
  const setReactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * 세트 완료 반응을 운동 화면에서 마저 보여 주는 중인지.
   *
   * **표현 전용이고 저장되지 않는다.** 세트 기록과 휴식 종료 시각은 이 플래그와 무관하게
   * 완료를 누른 즉시 확정되므로, 연출 도중 앱이 죽거나 화면을 벗어나도 완료한 세트는 남는다.
   * 돌아오면 이 값이 꺼져 있으니 축하를 다시 재생하지 않고 남은 휴식으로 바로 들어간다.
   */
  const [setCompletePresenting, setSetCompletePresenting] = useState(false);
  const presentationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  /** 사용자가 [세션 유지하고 나가기]를 눌렀다는 표시. 이때만 뒤로가기를 통과시킨다. */
  const exitConfirmedRef = useRef(false);
  /** 가로챈 뒤로가기 동작. 확인 후 그대로 다시 보내 원래 가려던 화면으로 나간다. */
  const blockedExitActionRef = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);

  /**
   * 운동 중 뒤로가기(Android 하드웨어 back / 브라우저 back)를 한 번 잡아 확인을 받는다.
   *
   * **뒤로가기는 운동 종료가 아니다.** 여기서는 어떤 저장도 하지 않는다 — 세션은 그대로
   * 남고, 확인 후 나가더라도 기록/XP/streak/Growth는 만들어지지 않는다. 사용자는 홈의
   * [운동으로 돌아가기]로 같은 세션에 복귀한다. 완료는 오직 [운동 종료] 경로에서만 일어난다.
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, ((event: {
      preventDefault: () => void;
      data: { action: Parameters<typeof navigation.dispatch>[0] };
    }) => {
      const shouldConfirm = shouldConfirmSessionExit({
        hasActiveSession: Boolean(activeSession),
        hasSummary: Boolean(summary),
        isEnding: ending,
        exitConfirmed: exitConfirmedRef.current,
      });
      if (!shouldConfirm) return;
      event.preventDefault();
      blockedExitActionRef.current = event.data.action;
      setConfirmEnd(false);
      setConfirmExit(true);
    }) as never);
    return unsubscribe;
  }, [navigation, activeSession, summary, ending]);

  /**
   * [세션 유지하고 나가기] — 저장은 그대로 두고 화면만 벗어난다.
   *
   * 보낼 액션은 **지역 변수로 먼저 빼 둔 뒤** ref를 비운다. 너무 일찍 비우면 정상 이탈이
   * 실패하고, 비우지 않으면 이미 쓴 액션이 나중에 한 번 더 dispatch될 수 있다.
   */
  const handleKeepSessionAndExit = useCallback(() => {
    exitConfirmedRef.current = true;
    setConfirmExit(false);
    const blocked = blockedExitActionRef.current;
    blockedExitActionRef.current = null;
    if (blocked) navigation.dispatch(blocked);
    else exitToHome();
  }, [navigation, exitToHome]);

  /** [계속 운동] — 가로챈 이동을 버리고 세션 화면에 그대로 머문다. */
  const handleStayInSession = useCallback(() => {
    blockedExitActionRef.current = null;
    setConfirmExit(false);
  }, []);

  /**
   * 화면을 벗어나면 가로챈 이동은 남기지 않는다 — 답을 받지 못한 액션이 다음 세션 화면까지
   * 따라가 뒤늦게 dispatch되지 않도록.
   */
  useEffect(
    () => () => {
      blockedExitActionRef.current = null;
    },
    []
  );

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
    // 세트를 끝낸 직후에는 단백이 한 줄이 주 피드백이다 — 그 줄이 사라진 뒤에 스탠리가
    // 말하도록 미룬다. 예전에는 둘이 동시에 떠서 두 사람이 한꺼번에 말을 걸었다.
    const timer = setTimeout(() => {
      if (Math.random() < 0.5) {
        showReaction(pickTrainerLine(StanleyTrainer.dialogueSet.restReaction).text);
      }
    }, SET_REACTION_MS);
    return () => clearTimeout(timer);
  }, [activeSession?.restUntilMs]);

  /** 화면을 벗어나면 일시 반응 타이머는 남기지 않는다 (세션 데이터와 무관한 표현값이다). */
  useEffect(
    () => () => {
      if (setReactionTimerRef.current) clearTimeout(setReactionTimerRef.current);
      if (presentationTimerRef.current) clearTimeout(presentationTimerRef.current);
    },
    []
  );

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

  /**
   * "지금 채울 세트"를 항상 하나 띄워 둔다 — 세트를 완료할 때마다 [+ 세트 시작]을 다시
   * 누르게 하지 않는다. 기본값은 이번 세션의 직전 세트, 그것도 없으면 지난번 같은 운동의
   * 마지막 세트다 (같은 값을 다시 입력시키지 않는다).
   */
  useEffect(() => {
    if (!activeSession || activeSession.status === 'completed') return;
    const current = getCurrentExercise(activeSession);
    if (!current || current.sets.some((set) => !set.completed)) return;
    const previous = findPreviousPerformance(current.exerciseId, workoutRecords);
    const lastSet = previous?.sets[previous.sets.length - 1];
    ensureSessionPendingSet(
      current.id,
      lastSet ? { weightKg: lastSet.weightKg, reps: lastSet.reps } : undefined
    );
  }, [activeSession, workoutRecords, ensureSessionPendingSet]);


  /**
   * 세션도 결과도 없으면 이 화면은 빈 화면이다 — 반드시 홈으로 내보낸다.
   *  - navigatorReady: 준비 전에 부른 replace는 무시되고 재시도되지 않는다.
   *  - loading: 저장된 세션을 아직 복구하는 중일 수 있다. 나가면 진행 중이던 운동을 놓친다.
   *  - ending: 종료 처리 중이다. 결과 화면이 뜨기 직전 한 프레임에 홈으로 튕기지 않게.
   */
  useEffect(() => {
    if (!navigatorReady || loading || ending) return;
    if (activeSession || summary) return;
    exitToHome();
  }, [navigatorReady, loading, ending, activeSession, summary, exitToHome]);

  /*
   * 아래 네 값은 hook보다 뒤에 쓰이지만, 휴식 화면이 떴는지를 **조기 반환 앞에서** 알아야
   * 하는 effect가 있어 여기서 한 번만 구한다 (세션이 없으면 전부 비활성값이다).
   */
  const isPaused = activeSession?.status === 'paused';
  /** 방금 끝낸 세트를 **누른 그 화면에서** 잠깐 더 보여 주는 중인가. */
  const presentingSetComplete = isSetCompletePresenting({
    presenting: setCompletePresenting,
    paused: isPaused,
    ending: ending || Boolean(summary),
  });
  const restSecondsRemaining = activeSession ? getRestSecondsRemaining(activeSession, nowMs) : 0;
  const isResting = restSecondsRemaining > 0;
  /**
   * 휴식 화면이 실제로 화면을 차지하는가. 휴식 시계는 이미 돌고 있어도 세트 완료 연출이
   * 끝날 때까지는 아직 운동 화면이다.
   */
  const restScreenShowing = isResting && !presentingSetComplete;

  /**
   * 휴식 화면으로 넘어가면 종료 확인은 갈 곳이 없다 — 상태까지 꺼 둔다.
   *
   * 감추기만 하면 ACTIVE로 돌아왔을 때 그대로 다시 떠서, 같은 자리의 다음 탭이
   * [종료하고 기록]에 맞는 사고가 난다(실기기 재현). 이탈 확인(confirmExit)은 휴식
   * 화면에서도 보여야 하므로 정리하지 않는다.
   * setState를 effect 본문에서 동기 호출하지 않도록 콜백으로 감싼다 — 위 휴식 반응과 같은 방식.
   */
  useEffect(() => {
    if (!shouldClearEndConfirm({ resting: restScreenShowing, confirmEnd })) return;
    const timer = setTimeout(() => {
      setConfirmEnd(false);
      setEndError(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [restScreenShowing, confirmEnd]);

  if (!activeSession) {
    // 종료 직후에는 결과 화면이 이 자리를 차지한다. 그 밖의 "그릴 것이 없는" 상태는
    // 아래 effect가 홈으로 내보낸다 (여기서 화면을 그리지 않는다).
    return summary ? <ResultScreen summary={summary} onConfirm={exitToHome} /> : null;
  }

  const elapsedSeconds = computeElapsedSeconds(activeSession, nowMs);
  /**
   * 휴식이 방금 끝났는가. 세션에 이미 있는 restUntilMs에서 그대로 읽는다 — 추가 상태나
   * 타이머 없이 파생되므로 화면을 벗어났다 돌아와도 남거나 어긋나지 않는다.
   * (사용자가 [다음 세트 시작]으로 건너뛰면 restUntilMs가 지워져 READY도 뜨지 않는다.)
   */
  const restJustEnded =
    !isResting &&
    activeSession.restUntilMs !== undefined &&
    nowMs - activeSession.restUntilMs < REST_READY_WINDOW_MS;

  const currentExercise = getCurrentExercise(activeSession);
  const currentIndex = currentExercise
    ? activeSession.exercises.findIndex((e) => e.id === currentExercise.id)
    : -1;
  const nextExercise = getNextExercise(activeSession);
  const previousExercise = currentIndex > 0 ? activeSession.exercises[currentIndex - 1] : undefined;
  const pendingSet = currentExercise?.sets.find((set) => !set.completed);
  const completedSets = currentExercise?.sets.filter(isEffectiveSet) ?? [];
  // 화면에 보이는 완료 세트 수도 기록과 같은 기준을 쓴다 — 체크만 하고 횟수가 없는
  // 세트는 어디에서도 1세트로 세지 않는다.
  const sessionCompletedSets = computeCompletedSetsCount(activeSession);
  const setProgress = currentExercise
    ? getSetProgress(activeSession, currentExercise.id)
    : { completed: 0, target: undefined };
  /**
   * 캐릭터 모션은 종목이 아니라 motion family로 고른다 — 종목별 애니메이션을 만들지 않는다.
   * 같은 조회로 "이 운동이 중량을 쓰는가"도 함께 읽는다 (풀업에 0kg를 입력시키지 않기 위해).
   */
  const resolvedCurrent = currentExercise
    ? getResolvedExerciseById(currentExercise.exerciseId)
    : undefined;
  const motionFamily = resolvedCurrent?.animationFamily ?? (currentExercise
    ? ['running', 'walking', 'cycling', 'sports'].includes(activeSession.primaryCategory)
      ? 'cardio'
      : inferMotionFamily({
          primaryMuscleGroup: activeSession.primaryMuscleGroup ?? 'fullBody',
          equipment: 'other',
        })
    : undefined);
  // 종료 처리/결과 화면으로 넘어가는 중에는 일시 반응을 남기지 않는다.
  const activeSetReaction = ending || summary ? null : setReaction;
  const characterState = deriveWorkoutCharacterState({
    ending,
    paused: isPaused,
    resting: isResting,
    hasExercise: Boolean(currentExercise),
    hasPendingSet: Boolean(pendingSet),
    setJustCompleted: presentingSetComplete,
    restJustEnded,
  });
  // DB에 없는 [직접 추가] 운동은 판단할 근거가 없으므로 중량 입력을 그대로 열어 둔다.
  const usesWeight = resolvedCurrent ? resolvedCurrent.usesWeight : true;

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

  /**
   * 세트 완료 = 게임 입력. 확인창 없이 곧바로 기록되고, 그대로 휴식으로 넘어간다.
   * 휴식 길이는 운동별 기본값(Exercise DB) → 앱 기본값 순으로 정해진다.
   */
  const handleCompleteSet = async (setId: string) => {
    if (!currentExercise) return;
    // 무효 세트는 기록도 보상도 만들지 않으므로 캐릭터도 반응하지 않는다(같은 기준 재사용).
    // 연타로 두 번 들어와도 이전 타이머를 지우고 하나만 돈다.
    const completedSet = currentExercise.sets.find((set) => set.id === setId);
    if (willCountAsEffectiveSet(completedSet)) {
      if (setReactionTimerRef.current) clearTimeout(setReactionTimerRef.current);
      // 어떤 동작인지 알면 단백이가 그것을 따라 한다고 말하고, 모르는 운동(직접 추가 등)은
      // 기존 부위 반응으로 떨어진다 — 아는 척하지 않는다.
      setSetReaction(
        buildDanbaekSetVoice(currentExercise.exerciseId) ??
          getExerciseReactionCopy(resolvedCurrent?.primaryMuscles[0] ?? activeSession.primaryMuscleGroup)
      );
      setReactionTimerRef.current = setTimeout(() => {
        setSetReaction(null);
        setReactionTimerRef.current = null;
      }, SET_REACTION_MS);
      // 이 순간의 주 피드백은 단백이다. 떠 있던 스탠리 말풍선은 접어 두고, 휴식 문구는
      // 위 effect가 단백이 한 줄이 끝난 뒤에 다시 띄운다 (스탠리 시스템 자체는 그대로다).
      setReactionVisible(false);
      // 휴식 화면으로 넘어가기 전, 방금 누른 이 화면에서 반응을 마저 보여 줄 시간.
      // 연타로 다시 들어와도 이전 타이머를 지우므로 창은 언제나 하나다.
      if (presentationTimerRef.current) clearTimeout(presentationTimerRef.current);
      setSetCompletePresenting(true);
      presentationTimerRef.current = setTimeout(() => {
        setSetCompletePresenting(false);
        presentationTimerRef.current = null;
      }, SetCompletePresentationMs);
    }
    // 연출과 무관하게 기록은 지금 확정된다 — 세트 completed, 세션 저장, 휴식 종료 절대시각까지.
    await completeSessionSet(currentExercise.id, setId, {
      restSeconds: getAutoRestSeconds(activeSession, currentExercise.id, AppConfig.defaultRestSeconds),
    });
  };

  const handleUpdateSet = async (setId: string, patch: { weightKg?: number; reps?: number }) => {
    if (!currentExercise) return;
    await updateSessionSet(currentExercise.id, setId, patch);
  };

  const handleAdjustSet = async (setId: string, delta: { weightKg?: number; reps?: number }) => {
    if (!currentExercise) return;
    await adjustSessionSet(currentExercise.id, setId, delta);
  };

  const handleAddExerciseByName = async (exerciseId: string, exerciseName: string) => {
    const resolved = getResolvedExerciseById(exerciseId);
    await addExerciseToSession({
      exerciseId,
      exerciseName,
      targetSets: resolved?.defaultSets,
      defaultRestSeconds: resolved?.defaultRestSeconds,
    });
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
    // 연타/두 손가락 탭으로 종료가 두 번 들어와도 한 번만 처리한다 (기록 중복 저장 방지).
    if (endingRef.current) return;
    setConfirmEnd(false);
    setEndError(null);
    endingRef.current = true;
    setEnding(true);
    const trainerLine = pickTrainerLine(StanleyTrainer.dialogueSet.sessionEnd).text;
    try {
      const result = await endWorkoutSession();
      if (result) {
        setSummary({ ...result, trainerLine });
        return;
      }
      setConfirmEnd(true);
    } catch {
      // Growth/저장 실패를 조용히 완료로 확정하지 않는다. 저장된 세션은 그대로라 재시도 가능하다.
      setEndError('성장 보상을 저장하지 못했어요. 세션은 안전하게 보관 중입니다.');
      setConfirmEnd(true);
    } finally {
      endingRef.current = false;
      setEnding(false);
    }
  };

  const handleDiscard = async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    try {
      await discardWorkoutSession();
    } finally {
      endingRef.current = false;
      setEnding(false);
    }
  };

  /**
   * 지금 하단이 물어야 하는 것. ACTIVE/REST 어느 화면이든 같은 규칙을 본다 —
   * 이탈 확인은 두 화면 모두, 종료 확인은 진입점이 있는 ACTIVE에서만.
   */
  const sessionConfirm = resolveSessionConfirm({
    confirmExit,
    confirmEnd,
    resting: restScreenShowing,
    hasSummary: Boolean(summary),
    isEnding: ending,
  });

  /**
   * 뒤로가기 확인 바. **정의는 하나뿐이고** ACTIVE와 REST가 같은 것을 그린다 —
   * 화면마다 복제하면 한쪽만 고쳐지는 사고가 다시 난다.
   */
  const exitConfirmBar = (
    <View style={styles.confirmBar}>
      <ThemedText type="small" style={styles.confirmText}>
        운동이 아직 진행 중이에요. 세션을 그대로 두고 나갈까요?
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.confirmText}>
        나가도 기록되지 않아요. 홈의 [운동으로 돌아가기]로 이어서 할 수 있어요.
      </ThemedText>
      <View style={styles.inlineRow}>
        <PrimaryButton
          label="계속 운동"
          variant="secondary"
          style={styles.flexItem}
          onPress={handleStayInSession}
        />
        <PrimaryButton
          label="세션 유지하고 나가기"
          variant="gold"
          haptic="medium"
          style={styles.flexItem}
          onPress={handleKeepSessionAndExit}
        />
      </View>
    </View>
  );

  const reaction = (
    <GoldsunReaction
      visible={reactionVisible}
      portrait={StanleyTrainer.portraitPlaceholder}
      name={StanleyTrainer.displayName}
      text={stanleyLine}
      onDismiss={() => setReactionVisible(false)}
    />
  );

  // 휴식 시계는 이미 돌고 있지만, 세트 완료 연출이 끝날 때까지 화면은 운동 화면 그대로다 —
  // 반응이 방금 누른 자리에서, 같은 크기의 단백이에게서 일어나게 하기 위해서다.
  // (연출은 휴식을 미루지 않는다. restUntilMs는 완료 시점에 확정돼 그대로 흐른다.)
  if (restScreenShowing) {
    return (
      <RestScreen
        session={activeSession}
        secondsRemaining={restSecondsRemaining}
        elapsedSeconds={elapsedSeconds}
        currentExercise={currentExercise}
        nextExercise={nextExercise}
        appearance={characterAppearance}
        family={motionFamily}
        bodyParameters={bodyParameters}
        characterState={characterState}
        reactionCopy={activeSetReaction}
        reaction={reaction}
        // 휴식 중 뒤로가기도 여기서 답할 수 있어야 한다 — 있으면 [다음 세트 시작] 자리를 대신한다.
        exitConfirm={sessionConfirm === 'exit' ? exitConfirmBar : null}
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
          ? `운동 ${currentIndex + 1}/${activeSession.exercises.length}`
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
                disabled={isPaused}
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
              <ThemedText type="captionBold" themeColor="textSecondary">
                {setProgress.target
                  ? `${setProgress.completed} / ${setProgress.target} 세트`
                  : `${setProgress.completed + 1}세트째`}
              </ThemedText>
            </View>
            <View style={styles.exerciseNav}>
              <NavArrow
                label="‹"
                disabled={isPaused || !previousExercise}
                onPress={() => previousExercise && setCurrentSessionExercise(previousExercise.id)}
              />
              <NavArrow
                label="›"
                disabled={isPaused || !nextExercise}
                onPress={() => nextExercise && setCurrentSessionExercise(nextExercise.id)}
              />
            </View>
          </View>

          {/*
            단백이 자리. 캐릭터는 홈/결과와 같은 공통 렌더러이고, 여기서 더해지는 건
            현재 운동의 animationFamily로 도는 공통 모션뿐이다 (종목별 애니메이션 없음).
            운동 조작을 가리지 않도록 높이를 고정해 둔다.
          */}
          <CharacterMotionStage
            appearance={characterAppearance}
            family={motionFamily}
            state={characterState}
            bodyParameters={bodyParameters}
            reactionCopy={activeSetReaction}
            height={SESSION_CHARACTER_HEIGHT}
          />

          {/* 지난번 같은 운동의 값 — 중량을 정하기 전에 보여야 하므로 조작 바로 위에 둔다. */}
          <PreviousPerformanceLine
            exerciseId={currentExercise.exerciseId}
            records={workoutRecords}
          />

          {pendingSet ? (
            <SetHero
              set={pendingSet}
              usesWeight={usesWeight}
              // 연출 0.5초 동안은 다음 세트 입력을 잠근다 — 연타가 세트 두 개로 기록되지
              // 않게 하고, 반응이 끝나면 사용자가 아무것도 하지 않아도 저절로 풀린다.
              disabled={isPaused || presentingSetComplete}
              onChange={(patch) => handleUpdateSet(pendingSet.id, patch)}
              onAdjust={(delta) => handleAdjustSet(pendingSet.id, delta)}
              onComplete={() => handleCompleteSet(pendingSet.id)}
            />
          ) : (
            <PrimaryButton
              label="+ 세트 시작"
              variant="gold"
              size="large"
              disabled={isPaused}
              onPress={handleAddSet}
            />
          )}

          {/* 세트가 쌓여도 아래 조작 바를 밀어내지 않도록 이 영역만 스크롤된다. */}
          <ScrollView
            style={styles.logScroll}
            contentContainerStyle={styles.logContent}
            showsVerticalScrollIndicator={false}>
            {completedSets.map((set, index) => (
              <ThemedText key={set.id} type="caption" themeColor="textSecondary">
                {index + 1}. {set.weightKg ?? '-'}kg × {set.reps ?? '-'}회 ✓
              </ThemedText>
            ))}
          </ScrollView>

          {nextExercise && (
            <Pressable
              onPress={() => setCurrentSessionExercise(nextExercise.id)}
              disabled={isPaused}
              accessibilityRole="button"
              accessibilityLabel={`다음 운동 ${nextExercise.exerciseName}로 이동`}
              style={[styles.nextExerciseRow, isPaused && styles.disabledControl]}>
              <ThemedText type="caption" themeColor="textSecondary">
                다음 · {nextExercise.exerciseName}
              </ThemedText>
              <ThemedText type="captionBold" themeColor="textSecondary">
                넘어가기 ›
              </ThemedText>
            </Pressable>
          )}

          {activeSession.exercises.length > 1 && (
            <ChipRow bleed>
              {activeSession.exercises.map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.exerciseName}
                  selected={exercise.id === currentExercise?.id}
                  disabled={isPaused}
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
            editable={!isPaused}
          />
          <ChipRow>
            {searchExercises(addExerciseQuery)
              .slice(0, 8)
              .map((exercise) => (
                <Chip
                  key={exercise.id}
                  label={exercise.name}
                  disabled={isPaused}
                  onPress={() => handleAddExerciseByName(exercise.id, exercise.name)}
                />
              ))}
          </ChipRow>
          <View style={styles.inlineRow}>
            <PrimaryButton
              label="직접 추가"
              variant="secondary"
              disabled={isPaused}
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
                <Chip
                  key={seconds}
                  label={`${seconds}초`}
                  disabled={isPaused}
                  onPress={() => handleStartRest(seconds)}
                />
              ))}
            </ChipRow>
            <TextField
              keyboardType="numeric"
              value={customRestSeconds}
              onChangeText={setCustomRestSeconds}
              placeholder="직접"
              editable={!isPaused}
              containerStyle={styles.restInput}
              onSubmitEditing={handleStartCustomRest}
            />
          </View>
        </View>
      )}

      {/* 하단 조작 바: 운동 추가 / 운동 종료. 종료는 2단계 확인을 거친다 — 세트 완료 옆에서
          잘못 눌러 세션이 날아가는 사고를 막는다. Gold는 [세트 완료]에만 쓴다. */}
      {/*
        뒤로가기 확인이 종료 확인보다 먼저다 — 둘은 다른 결정이다.
        나가기는 세션을 남긴 채 화면만 벗어나고, 종료는 기록/보상을 확정한다.
      */}
      {sessionConfirm === 'exit' ? (
        exitConfirmBar
      ) : sessionConfirm === 'end' ? (
        <View style={styles.confirmBar}>
          <ThemedText type="small" style={styles.confirmText}>
            {endError
              ? endError
              : sessionCompletedSets === 0
                ? '완료한 세트가 없어요. 기록 없이 나갈까요?'
                : '운동을 종료할까요?'}
          </ThemedText>
          <View style={styles.inlineRow}>
            <PrimaryButton
              label="계속 운동"
              variant="secondary"
              style={styles.flexItem}
              onPress={() => setConfirmEnd(false)}
            />
            <PrimaryButton
              label={endError ? '다시 시도' : sessionCompletedSets === 0 ? '기록 없이 나가기' : '종료하고 기록'}
              variant="gold"
              haptic="medium"
              style={styles.flexItem}
              onPress={sessionCompletedSets === 0 ? handleDiscard : handleEnd}
            />
          </View>
        </View>
      ) : (
        <View style={styles.bottomBar}>
          <PrimaryButton
            label="+ 운동 추가"
            variant="secondary"
            disabled={isPaused}
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

/**
 * 세션 화면의 단백이 높이. 세로 공간이 늘 부족한 화면이라(412x915 기준) 캐릭터가
 * 세트 조작을 밀어내지 않도록 고정한다 — 주인공은 [세트 완료]다.
 */
/** 세트 완료 반응이 화면에 머무는 시간(ms). 짧게 스치고 곧 휴식/입력 상태로 돌아간다. */
const SET_REACTION_MS = 900;

/** 휴식이 끝난 뒤 READY 표현을 유지하는 창(ms). 세션 타이머가 1초 간격이라 여유를 둔다. */
const REST_READY_WINDOW_MS = 2000;

const SESSION_CHARACTER_HEIGHT = 104;
const REST_CHARACTER_HEIGHT = 70;

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
  const { characterAppearance, growth: growthAfter } = useAppData();
  const reducedMotion = useReducedMotion();
  const permanentChanged = hasPermanentBodyChange(
    summary.bodyParametersBefore,
    summary.bodyParametersAfter
  );
  const muscles = useMemo(
    () => buildGrowthRevealMuscles({ growth: summary.growth, growthAfter }),
    [summary.growth, growthAfter]
  );
  const stageChanges = muscles.filter((muscle) => muscle.stageChanged);
  /**
   * 항상 실제(영구) 몸으로 끝나는 순서. 영구 변화가 없으면 BEFORE를 건너뛰고 PUMP → AFTER다 —
   * 펌핑 상태로 끝내면 홈에서 보는 실제 몸과 달라 사용자가 혼란스러워진다.
   */
  const revealSequence = useMemo(
    () => buildGrowthRevealSequence({ permanentChanged, reducedMotion }),
    [permanentChanged, reducedMotion]
  );
  const [revealPhase, setRevealPhase] = useState<GrowthRevealPhase>(revealSequence[0]);
  const revealScale = useSharedValue(1);
  const revealOpacity = useSharedValue(1);

  useEffect(() => {
    // 첫 단계는 이미 그리고 있으므로 그 다음 단계들만 순서대로 넘긴다.
    const timers = revealSequence.slice(1).map((phase, index) =>
      setTimeout(() => setRevealPhase(phase), 650 + index * 400)
    );
    return () => timers.forEach(clearTimeout);
  }, [revealSequence]);

  useEffect(() => {
    if (revealPhase !== 'after' || reducedMotion) return;
    revealOpacity.set(withSequence(withTiming(0.72, { duration: 100 }), withTiming(1, { duration: 180 })));
    revealScale.set(withSequence(withTiming(1.035, { duration: 120 }), withTiming(1, { duration: 180 })));
  }, [revealPhase, reducedMotion, revealOpacity, revealScale]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.get(),
    transform: [{ scale: revealScale.get() }],
  }));
  const displayedBody = revealBodyParameters(revealPhase, summary);
  /**
   * 실제로 단계가 오른 부위만 이름을 부른다. 저장된 stage 변화가 없으면 null이라
   * 성장 문구 자체가 뜨지 않는다 — SP만 오른 날을 성장했다고 말하지 않기 위해서다.
   */
  const growthHighlight = buildGrowthHighlight(summary.growth?.stageChanges ?? []);
  /**
   * 실제로 단계가 오른 부위 쪽으로 **카메라만** 당긴다. 한 세션의 영구 변화는 전신
   * 축소 비교에서는 1px도 되지 않아 사실상 보이지 않기 때문이다.
   *
   * BEFORE와 AFTER가 이 **같은 객체 하나**를 받는다 — 배율/크롭/기준점이 어긋날 수
   * 없으므로 두 그림의 차이는 오직 bodyParametersBefore ↔ After뿐이다.
   * 단계 변화가 없으면 null이라 확대 비교 자체가 생기지 않는다.
   */
  const growthCamera = useMemo(
    () => resolveGrowthComparisonCamera(summary.growth?.stageChanges ?? []),
    [summary.growth]
  );
  const revealTitle =
    revealPhase === 'pump'
      ? '운동 직후 펌핑'
      : revealPhase === 'before'
        ? '운동 전 내 몸'
        : (growthHighlight ?? '지금 내 실제 몸');

  /** 펌핑과 영구 성장의 관계를 한 줄로 짚어 준다 (보조 계층 문구). */
  const revealCaption =
    revealPhase === 'pump'
      ? '지금은 펌핑 상태예요. 잠시 뒤 가라앉아요.'
      : revealPhase === 'after'
        ? '펌핑이 빠진 실제 몸이에요. 오늘 쌓은 SP는 그대로 남습니다.'
        : null;

  const skipReveal = () => setRevealPhase('after');

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.resultContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.resultHero}>
          {/*
            홈과 같은 캐릭터 렌더러. 단계에 따라 세션 완료 스냅샷의 몸(운동 전 / 펌핑 /
            지금)을 골라 넘길 뿐, 여기서 새 파라미터를 계산하거나 저장값을 바꾸지 않는다.
            펌핑은 저장되지 않으므로 홈으로 돌아가면 영구 상태만 남는다.
          */}
          <Animated.View style={[styles.resultCharacter, revealStyle]}>
            <PlayerCharacter
              appearance={characterAppearance}
              slot="result"
              height={RESULT_CHARACTER_HEIGHT}
              bodyParameters={displayedBody}
            />
          </Animated.View>
          <ThemedText type="subtitle" style={[styles.centered, { color: theme.gold }]}>
            🏆 운동 완료
          </ThemedText>
          <ThemedText type="captionBold" style={[styles.centered, { color: theme.gold }]}>
            {revealTitle}
          </ThemedText>
          {revealCaption && (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
              {revealCaption}
            </ThemedText>
          )}
          {/* 영구 변화가 없는 날에도 펌핑을 건너뛰고 실제 몸을 바로 볼 수 있다. */}
          {revealPhase !== 'after' && (
            <Pressable onPress={skipReveal} hitSlop={12} accessibilityRole="button">
              <ThemedText type="caption" themeColor="textSecondary">바로 보기</ThemedText>
            </Pressable>
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {StanleyTrainer.portraitPlaceholder} {summary.trainerLine}
          </ThemedText>
        </View>

        {/*
          실제로 한 운동이 먼저다. 성장/학습은 그 결과에 얹히는 이야기라 아래에 온다 —
          숫자 연출이 "내가 오늘 뭘 했는지"를 덮으면 운동 앱이 아니라 게임 화면이 된다.
        */}
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
                  {pr.exerciseName} {describePrAchievement(pr)}
                  {describePrPrevious(pr) ? ` (이전 ${describePrPrevious(pr)})` : ' (첫 기록)'}
                </ThemedText>
              ))}
            </ThemedView>
          )}
        </Section>

        {muscles.length > 0 && (
          <Section title="오늘 자극된 부위">
            <ThemedView type="backgroundElement" style={styles.stimulusCard}>
              {muscles.map((muscle) => (
                <View key={muscle.muscle} style={styles.stimulusRow}>
                  <View style={styles.flexItem}>
                    <ThemedText type="smallBold">{muscle.label}</ThemedText>
                    {muscle.stageChanged ? (
                      <ThemedText type="captionBold" style={{ color: theme.gold }}>
                        Stage {muscle.previousStage} → {muscle.currentStage} 성장!
                      </ThemedText>
                    ) : (
                      <ThemedText type="caption" themeColor="textSecondary">
                        Stage {muscle.currentStage} · {muscle.isMaxStage
                          ? 'MAX'
                          : `${Math.round(muscle.progressBefore * 100)}% → ${Math.round(muscle.progressAfter * 100)}%`}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="smallBold" style={[styles.spGain, { color: theme.gold }]}>
                    +{formatSp(muscle.gainedSp)} SP
                  </ThemedText>
                </View>
              ))}
              <View style={[styles.rewardRow, styles.stimulusTotal, { borderTopColor: theme.border }]}>
                <ThemedText type="captionBold">총 Muscle SP</ThemedText>
                <ThemedText type="metric" style={{ color: theme.gold }}>
                  +{formatSp(summary.growth?.totalSpGained ?? 0)}
                </ThemedText>
              </View>
            </ThemedView>
            {/* 진행도 숫자가 무엇을 향한 것인지 한 줄로 알려 준다. */}
            <ThemedText type="caption" themeColor="textSecondary">
              100%가 되면 Stage가 올라 내 몸이 실제로 커져요.
            </ThemedText>
          </Section>
        )}

        {permanentChanged && revealPhase === 'after' && (
          <Section title={stageChanges.length > 0 ? '실제 성장' : '영구 성장 변화'}>
            <View style={styles.bodyComparisonRow}>
              <BodyComparison
                label="BEFORE"
                appearance={characterAppearance}
                bodyParameters={summary.bodyParametersBefore}
                camera={growthCamera}
              />
              <ThemedText type="subtitle" style={{ color: theme.gold }}>→</ThemedText>
              <BodyComparison
                label="AFTER"
                appearance={characterAppearance}
                bodyParameters={summary.bodyParametersAfter}
                camera={growthCamera}
              />
            </View>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
              {growthCamera
                ? `${withObjectParticle(growthCamera.label)} 같은 배율로 확대해 비교했어요. 펌핑이 아닌 오늘의 영구 성장입니다.`
                : '펌핑이 아닌 오늘의 영구 성장만 비교했어요.'}
            </ThemedText>
          </Section>
        )}

        {/*
          단백이는 플레이어의 아바타가 아니라 옆에서 지켜보고 따라 하는 존재다. 그래서 결과에
          "내가 얼마나 컸는가"와 별개로 **얘가 오늘 무엇을 배웠는가**가 남는다.
          배운 것이 없으면(계열을 알 수 없는 즉석 운동뿐이면) 이 섹션 자체가 없다.
        */}
        {summary.learning.length > 0 && (
          <Section title="오늘 단백이가 배운 것">
            <ThemedView type="backgroundElement" style={styles.learningBox}>
              {/* 먼저 단백이가 자기 말로 한마디 하고, 정확한 단계는 그 아래에 둔다. */}
              <ThemedText type="smallBold">🐣 {buildDanbaekGainVoice(summary.learning)}</ThemedText>
              {summary.learning.map(describeLearningGain).map((copy) => (
                <View key={copy.movementFamily} style={styles.learningRow}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.learningFamily}>
                    {copy.familyLabel}
                  </ThemedText>
                  <ThemedText type="small" themeColor={copy.stageChanged ? 'text' : 'textSecondary'}>
                    {copy.line}
                  </ThemedText>
                </View>
              ))}
              <ThemedText type="caption" themeColor="textSecondary">
                단백이는 오늘 옆에서 본 동작만 따라 합니다.
              </ThemedText>
            </ThemedView>
          </Section>
        )}

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

/**
 * 성장 비교 한 칸.
 *
 * `camera`가 있으면 같은 캐릭터를 **클리핑되는 창 안에서 확대해서** 보여준다. 확대는
 * 화면 표시일 뿐이라 bodyParameters는 원본 그대로 넘어가고, 렌더러도 평소와 같은 계약
 * (`PlayerCharacter` + CANON viewBox 높이)으로 그린다. camera가 null이면 예전처럼
 * 전신을 축소해서 보여준다.
 */
function BodyComparison({ label, appearance, bodyParameters, camera }: {
  label: string;
  appearance: ReturnType<typeof useAppData>['characterAppearance'];
  bodyParameters: EndSessionSummary['bodyParametersAfter'];
  camera: GrowthComparisonCamera | null;
}) {
  const theme = useTheme();

  if (!camera) {
    return (
      <View style={styles.bodyComparisonItem}>
        <ThemedText type="captionBold" themeColor="textSecondary">{label}</ThemedText>
        <PlayerCharacter
          appearance={appearance}
          slot="result"
          height={RESULT_COMPARISON_HEIGHT}
          bodyParameters={bodyParameters}
        />
      </View>
    );
  }

  return (
    <View style={styles.bodyComparisonItem}>
      <ThemedText type="captionBold" themeColor="textSecondary">{label}</ThemedText>
      <View
        style={[
          styles.bodyComparisonViewport,
          { height: camera.viewportHeight, borderColor: theme.border, backgroundColor: theme.backgroundElement },
        ]}>
        {/*
          카메라 레이어. 확대/이동은 여기서만 일어나고 캐릭터 안으로는 들어가지 않는다.
          BEFORE/AFTER가 같은 camera 객체를 쓰므로 두 창의 배율·이동·기준점이 동일하다.
        */}
        <View
          style={[
            styles.bodyComparisonCamera,
            { transform: [{ translateY: camera.translateY }, { scale: camera.zoom }] },
          ]}>
          <PlayerCharacter
            appearance={appearance}
            slot="result"
            height={camera.characterHeight}
            bodyParameters={bodyParameters}
          />
        </View>
      </View>
    </View>
  );
}

function formatSp(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const RESULT_CHARACTER_HEIGHT = 150;
const RESULT_COMPARISON_HEIGHT = 105;

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
  usesWeight,
  disabled,
  onChange,
  onAdjust,
  onComplete,
}: {
  set: WorkoutSetEntry;
  disabled?: boolean;
  /**
   * 이 운동이 중량을 쓰는가(Exercise DB 기준). 풀업/푸쉬업처럼 맨몸 운동이면 중량 줄을
   * 접어 두고 [+ 중량]으로 열 수 있게 한다 — 중량을 다는 사람도 있으므로 없애지는 않는다.
   */
  usesWeight: boolean;
  onChange: (patch: { weightKg?: number; reps?: number }) => void;
  /** 스테퍼는 절대값이 아니라 증감으로 보낸다 — 빠르게 두 번 눌러도 한 번이 씹히지 않는다. */
  onAdjust: (delta: { weightKg?: number; reps?: number }) => void;
  onComplete: () => void;
}) {
  const theme = useTheme();
  const weight = set.weightKg ?? 0;
  const reps = set.reps ?? 0;
  const [weightOpen, setWeightOpen] = useState(false);
  /**
   * 횟수가 없는 세트는 완료할 수 없다 — 체크만 된 빈 세트가 기록/연속/XP를 만들지
   * 않게 하는 첫 번째 차단이다(데이터 계층에서도 같은 기준으로 한 번 더 막는다).
   * 중량 0은 막지 않는다: 맨몸 운동은 0kg가 정상이고, 시간 종목은 이 값이 초다.
   */
  const canComplete = reps > 0;
  const showWeight = usesWeight || weightOpen || weight > 0;

  const stepWeight = (delta: number) => onAdjust({ weightKg: delta });
  const stepReps = (delta: number) => onAdjust({ reps: delta });

  return (
    <View style={styles.hero}>
      {!showWeight && (
        <Pressable onPress={() => setWeightOpen(true)} hitSlop={8} disabled={disabled}>
          <ThemedText type="captionBold" themeColor="textSecondary">
            + 중량 추가
          </ThemedText>
        </Pressable>
      )}
      {showWeight && (
      <View style={styles.heroRow}>
        <StepperButton label="−" disabled={disabled} onPress={() => stepWeight(-AppConfig.setWeightStepKg)} />
        <View style={styles.heroValue}>
          <TextField
            keyboardType="numeric"
            value={String(weight)}
            editable={!disabled}
            onChangeText={(text) => onChange({ weightKg: text ? Math.max(0, Number(text)) : 0 })}
            style={[styles.heroInput, { color: theme.gold }]}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            kg
          </ThemedText>
        </View>
        <StepperButton label="+" disabled={disabled} onPress={() => stepWeight(AppConfig.setWeightStepKg)} />
      </View>
      )}
      <View style={styles.heroRow}>
        <StepperButton label="−" disabled={disabled} onPress={() => stepReps(-AppConfig.setRepsStep)} />
        <View style={styles.heroValue}>
          <TextField
            keyboardType="numeric"
            value={String(reps)}
            editable={!disabled}
            onChangeText={(text) => onChange({ reps: text ? Math.max(0, Number(text)) : 0 })}
            style={styles.heroInput}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            회
          </ThemedText>
        </View>
        <StepperButton label="+" disabled={disabled} onPress={() => stepReps(AppConfig.setRepsStep)} />
      </View>
      {!canComplete && (
        <ThemedText type="caption" themeColor="textSecondary">
          횟수를 입력하면 세트를 완료할 수 있어요.
        </ThemedText>
      )}
      <PrimaryButton
        label="✓ 세트 완료"
        variant="gold"
        size="large"
        haptic="medium"
        disabled={disabled || !canComplete}
        style={styles.fullWidth}
        onPress={onComplete}
      />
    </View>
  );
}

function StepperButton({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} disabled={disabled} style={disabled && styles.disabledControl}>
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
  nextExercise,
  appearance,
  family,
  bodyParameters,
  characterState,
  reactionCopy,
  reaction,
  exitConfirm,
  onPauseToggle,
  onSkip,
}: {
  session: WorkoutSession;
  secondsRemaining: number;
  elapsedSeconds: number;
  currentExercise?: SessionExerciseEntry;
  nextExercise?: SessionExerciseEntry;
  appearance: ReturnType<typeof useAppData>['characterAppearance'];
  family?: Parameters<typeof CharacterMotionStage>[0]['family'];
  bodyParameters: Parameters<typeof CharacterMotionStage>[0]['bodyParameters'];
  characterState: Parameters<typeof CharacterMotionStage>[0]['state'];
  /** 세트 완료 직후의 한 줄. 휴식이 자동으로 시작되므로 그 반응은 이 화면에서 보인다. */
  reactionCopy?: string | null;
  reaction: React.ReactNode;
  /**
   * 뒤로가기 확인 바. 세션 화면이 만든 **그 하나**를 그대로 받는다 — 여기서 다시 만들지 않는다.
   * 있으면 [다음 세트 시작] 자리를 대신한다 (둘을 함께 쌓지 않는다).
   */
  exitConfirm?: React.ReactNode;
  onPauseToggle: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const urgent = secondsRemaining <= AppConfig.restUrgentThresholdSeconds;
  const ringColor = urgent ? theme.goldBright : theme.gold;
  // 휴식이 끝나면 곧바로 채울 세트 — 자동으로 준비된 대기 세트가 있으면 그 값이 정답이다.
  const pendingSet = currentExercise?.sets.find((set) => !set.completed);
  const nextSetPreview = pendingSet
    ? { weightKg: pendingSet.weightKg, reps: pendingSet.reps }
    : currentExercise
      ? getLastSetValues(session, currentExercise.id)
      : null;
  const setProgress = currentExercise ? getSetProgress(session, currentExercise.id) : null;

  return (
    <SessionShell
      elapsedSeconds={elapsedSeconds}
      isPaused={session.status === 'paused'}
      onPauseToggle={onPauseToggle}
      statusLabel="휴식 중"
      reaction={reaction}>
      <View style={styles.restBlock}>
        <CircularProgressRing
          progress={getRestProgress(session, secondsRemaining)}
          size={220}
          thickness={14}
          color={ringColor}
          trackColor={theme.backgroundSelected}
          holeColor={theme.background}>
          <CharacterMotionStage
            appearance={appearance}
            family={family}
            state={characterState}
            bodyParameters={bodyParameters}
            reactionCopy={reactionCopy}
            height={REST_CHARACTER_HEIGHT}
          />
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
              {setProgress?.target ? ` · ${setProgress.completed + 1} / ${setProgress.target}` : ''}
            </ThemedText>
            <ThemedText type="smallBold">
              {currentExercise.exerciseName} · {nextSetPreview.weightKg ?? '-'}KG ×{' '}
              {nextSetPreview.reps ?? '-'}회
            </ThemedText>
            {nextExercise && (
              <ThemedText type="caption" themeColor="textSecondary">
                이 운동 다음 · {nextExercise.exerciseName}
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {/* 뒤로가기 확인이 열리면 CTA 자리를 대신한다 — 겹치거나 함께 쌓이지 않는다. */}
      {exitConfirm ?? (
        <PrimaryButton
          label="다음 세트 시작"
          variant="gold"
          size="large"
          disabled={session.status === 'paused'}
          onPress={onSkip}
        />
      )}
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
        {pr.exerciseName} {describePrAchievement(pr)}
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
  /** 다음 운동 안내는 카드가 아니라 한 줄이다 — 화면을 세로로 더 쓰지 않는다. */
  nextExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
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
  /** 한 손 조작 전제 — 운동 중에 정확히 누를 수 있어야 하므로 작게 만들지 않는다. */
  stepperButton: {
    width: 56,
    height: 56,
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
  disabledControl: {
    opacity: 0.4,
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
  stimulusCard: {
    borderRadius: Radius.large,
    padding: Layout.cardPadding,
    gap: Spacing.two,
  },
  stimulusRow: {
    minHeight: Layout.compactRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stimulusTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  spGain: {
    fontVariant: ['tabular-nums'],
  },
  bodyComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  bodyComparisonItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.one,
  },
  /** 확대된 캐릭터를 잘라내는 창. 높이는 카메라가 정하고, 폭은 열을 그대로 쓴다. */
  bodyComparisonViewport: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  /**
   * 창 위쪽에 붙는 캐릭터 레이어. 절대 배치라 창 높이에 영향을 주지 않고,
   * transform은 레이아웃을 바꾸지 않으므로 아래 UI를 밀어내지 않는다.
   */
  bodyComparisonCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
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
   * PR 카드와 같은 카드 모양이지만 스타일을 공유하지 않는다 — 학습은 성장/PR과 별개 축이라
   * 한쪽 카드를 손볼 때 다른 쪽이 따라 움직이면 안 된다.
   */
  learningBox: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  learningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  learningFamily: {
    flexShrink: 1,
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
