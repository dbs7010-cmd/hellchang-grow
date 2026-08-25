import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerCharacter } from '@/components/character/player-character';
import { GoldsunBubble } from '@/components/goldsun/goldsun-bubble';
import { GrowthHud } from '@/components/home/growth-hud';
import { RecommendedStrip } from '@/components/home/recommended-strip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppConfig } from '@/config/app-config';
import { StanleyPortraitImage } from '@/config/character-assets';
import { Exercises, getExerciseById, getExercisesByMuscleGroup } from '@/config/exercises';
import { MuscleGroups } from '@/config/muscle-groups';
import { StanleyTrainer } from '@/config/trainers';
import { BottomTabInset, HomeColors, Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords } from '@/data/workout-repository';
import { findPreviousPerformance } from '@/utils/exercise-history';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';
import { formatVolumeKg, sumVolumeKg } from '@/utils/workout-stats';

/**
 * V1 HOME VISUAL CANON — LOCKED.
 * Warm White, Character Stage tonal field/ground, HELL PASS hierarchy, Gold CTA,
 * borderless body HUD, Gold-tinted recommendations, Stanley bubble, bottom navigation,
 * 그리고 412x915 / 390x844 / 360x800 responsive 배치를 함께 고정한다.
 *
 * 01 HOME — 기존 기능/레이아웃 계약을 유지하면서 MASTER CANON의 HUD 밀도만 복원한다.
 * Header → HELL PASS/주간 기록 → 캐릭터(좌측 신체 HUD + 우측 스탠리) → CTA → 추천 운동.
 * 신체 HUD는 실제 입력값만 표시하며 없는 값은 '-'로 둔다.
 */
const CharacterSafeInset = 8;
const TrainerRowHeight = 44;
const CharacterAreaHeightRatio = 0.42;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profile,
    bodyHistory,
    workoutRecords,
    streak,
    openEventPass,
    activeSession,
    routines,
    passProgress,
    characterAppearance,
    bodyParameters,
  } = useAppData();

  const { height: windowHeight } = useWindowDimensions();
  const [stageHeight, setStageHeight] = useState(0);

  const weekRecords = useMemo(() => getThisWeekRecords(workoutRecords), [workoutRecords]);
  const weeklyVolumeKg = useMemo(() => sumVolumeKg(weekRecords), [weekRecords]);
  const latestBody = useMemo(
    () =>
      bodyHistory.reduce<(typeof bodyHistory)[number] | undefined>(
        (latest, entry) => (!latest || entry.date > latest.date ? entry : latest),
        undefined
      ),
    [bodyHistory]
  );
  const sessionInProgress = activeSession && activeSession.status !== 'completed';
  const scheduledRoutine = useMemo(
    () => getTodaysScheduledRoutine(routines, new Date().getDay()),
    [routines]
  );

  const greeting = useMemo(
    () => pickTrainerLine(StanleyTrainer.dialogueSet.homeGreeting),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workoutRecords.length]
  );

  const canClaimReward =
    streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;
  const noticeAvailable = !openEventPass.active || canClaimReward;

  const recommendedItems = useMemo(() => {
    const exercises = scheduledRoutine
      ? scheduledRoutine.exerciseIds
          .map((id) => getExerciseById(id))
          .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise))
      : getExercisesByMuscleGroup(recommendMuscleGroup(workoutRecords, Exercises, MuscleGroups));

    return exercises.slice(0, 4).map((exercise) => {
      const previous = findPreviousPerformance(exercise.id, workoutRecords);
      return {
        id: exercise.id,
        name: exercise.name,
        subtitle: describePreviousPerformance(previous),
      };
    });
  }, [scheduledRoutine, workoutRecords]);

  const handleStartPress = () => {
    router.push(sessionInProgress ? '/session' : '/workout-start');
  };

  const handleRecommendedPress = (exerciseId: string) => {
    if (!getExerciseById(exerciseId)) {
      router.push('/workout-start');
      return;
    }
    router.push({ pathname: '/exercise-detail', params: { id: exerciseId } });
  };

  const handleStageLayout = (event: LayoutChangeEvent) => {
    setStageHeight(event.nativeEvent.layout.height);
  };

  const estimatedAreaHeight = Math.round(windowHeight * CharacterAreaHeightRatio);
  const characterHeight = Math.max(
    0,
    (stageHeight > 0 ? stageHeight : estimatedAreaHeight) - CharacterSafeInset
  );

  if (!profile) return null;

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.one }]}>
        <ThemedText type="smallBold" style={styles.brand}>🏋 헬창키우기</ThemedText>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push('/trainer')} hitSlop={10}>
            <ThemedText type="captionBold" style={styles.trainerLink}>
              스탠리 PT ›
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.bellButton}>
            <ThemedText style={styles.topActionIcon}>🔔</ThemedText>
            {noticeAvailable && <View style={styles.badgeDot} />}
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
            <ThemedText style={styles.topActionIcon}>⚙️</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: BottomTabInset + Spacing.two }]}>
        <View style={styles.progressBlock}>
          <GrowthHud
            passLevel={passProgress.level}
            passXpIntoLevel={passProgress.xpIntoLevel}
            passXpForLevel={passProgress.xpForLevel}
            passProgress={passProgress.progress}
            onPress={() => router.push('/pass')}
          />
          <View style={styles.statsRow}>
            <HomeStat label="이번 주" value={weekRecords.length + '회'} />
            <HomeStat label="연속" value={'🔥 ' + streak.currentStreakDays + '일'} />
            <HomeStat label="이번 주 볼륨" value={weeklyVolumeKg > 0 ? formatVolumeKg(weeklyVolumeKg) : '-'} />
          </View>
        </View>

        <View style={styles.stage}>
          <View style={styles.trainerRow}>
            <GoldsunBubble
              portrait={StanleyPortraitImage ?? StanleyTrainer.portraitPlaceholder}
              name={StanleyTrainer.displayName}
              text={greeting.text}
              onPress={() => router.push('/trainer')}
              homeLight
            />
          </View>

          <View style={styles.characterArea}>
            <View pointerEvents="none" style={styles.characterAtmosphere} />
            <View pointerEvents="none" style={styles.characterBackdrop} />
            <View pointerEvents="none" style={styles.characterGround} />
            <View onLayout={handleStageLayout} style={styles.characterFill}>
              <PlayerCharacter
                appearance={characterAppearance}
                slot="home"
                height={characterHeight}
                bodyParameters={bodyParameters}
                fill
                idle
              />
            </View>

            <View pointerEvents="none" style={styles.bodyHud}>
              <BodyHudMetric label="체중" value={`${latestBody?.weightKg ?? profile.weightKg}kg`} />
              <BodyHudMetric
                label="골격근량"
                value={latestBody?.skeletalMuscleKg !== undefined ? `${latestBody.skeletalMuscleKg}kg` : '-'}
              />
              <BodyHudMetric
                label="체지방률"
                value={latestBody?.bodyFatPercent !== undefined ? `${latestBody.bodyFatPercent}%` : '-'}
              />
              <BodyHudMetric label="운동 기록" value={`${workoutRecords.length}회`} />
            </View>
          </View>
        </View>

        <PrimaryButton
          label={sessionInProgress ? '운동으로 돌아가기' : '운동 시작'}
          subLabel={
            sessionInProgress
              ? '진행 중인 세션이 있어요'
              : scheduledRoutine
                ? '오늘 · ' + scheduledRoutine.name
                : '바로 시작할 수 있어요'
          }
          variant="homeGold"
          size="large"
          onPress={handleStartPress}
        />

        {!sessionInProgress && (
          <RecommendedStrip
            items={recommendedItems}
            onPressItem={handleRecommendedPress}
            onPressMore={handleStartPress}
          />
        )}
      </View>
    </ThemedView>
  );
}

function describePreviousPerformance(
  previous: ReturnType<typeof findPreviousPerformance>
): string {
  if (!previous || previous.sets.length === 0) return '첫 도전';
  if (previous.maxWeightKg !== undefined) return '지난번 ' + previous.maxWeightKg + 'kg';
  return '지난번 ' + previous.sets.length + '세트';
}

function HomeStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="caption" style={styles.statLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {value}
      </ThemedText>
    </View>
  );
}

function BodyHudMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.bodyHudMetric}>
      <ThemedText type="caption" style={styles.bodyHudLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.bodyHudValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HomeColors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Spacing.one,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  topActionIcon: {
    fontSize: 18,
    color: HomeColors.text,
  },
  bellButton: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: HomeColors.danger,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    gap: Spacing.two,
  },
  stage: {
    flex: 1,
    minHeight: 180,
    marginBottom: -Spacing.one,
  },
  characterArea: {
    flex: 1,
    position: 'relative',
  },
  characterBackdrop: {
    position: 'absolute',
    left: '28%',
    right: '28%',
    bottom: '9%',
    height: '48%',
    borderRadius: Radius.pill,
    backgroundColor: HomeColors.surfaceMuted,
    opacity: 0.52,
  },
  characterAtmosphere: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '2%',
    bottom: '2%',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(182, 121, 30, 0.018)',
  },
  characterGround: {
    position: 'absolute',
    left: '34%',
    right: '34%',
    bottom: '10%',
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(182, 121, 30, 0.09)',
    boxShadow: HomeColors.groundShadow,
  },
  characterFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyHud: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 76,
    borderWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: Radius.medium,
    overflow: 'hidden',
    zIndex: 2,
    boxShadow: HomeColors.hudShadow,
  },
  bodyHudMetric: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    gap: Spacing.half,
  },
  trainerRow: {
    width: '100%',
    minHeight: TrainerRowHeight,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.one,
  },
  progressBlock: {
    borderWidth: 1,
    borderColor: HomeColors.border,
    borderRadius: Radius.large,
    backgroundColor: HomeColors.surface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    boxShadow: HomeColors.shadow,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.half,
  },
  brand: { color: HomeColors.text },
  trainerLink: { color: HomeColors.goldStrong },
  statLabel: { color: HomeColors.textSecondary },
  statValue: { color: HomeColors.text, fontWeight: 800, fontVariant: ['tabular-nums'] },
  bodyHudLabel: { color: HomeColors.textSecondary },
  bodyHudValue: { color: HomeColors.text, fontWeight: 800, fontVariant: ['tabular-nums'] },
});
