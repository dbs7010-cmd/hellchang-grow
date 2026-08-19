import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerCharacter } from '@/components/character/player-character';
import { CharacterViewer } from '@/components/character/character-viewer';
import { GoldsunBubble } from '@/components/goldsun/goldsun-bubble';
import { GrowthHud } from '@/components/home/growth-hud';
import { RecommendedStrip } from '@/components/home/recommended-strip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppConfig } from '@/config/app-config';
import { Exercises, getExerciseById, getExercisesByMuscleGroup } from '@/config/exercises';
import { MuscleGroups } from '@/config/muscle-groups';
import { StanleyTrainer } from '@/config/trainers';
import { BottomTabInset, Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords } from '@/data/workout-repository';
import { useTheme } from '@/hooks/use-theme';
import { findPreviousPerformance } from '@/utils/exercise-history';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';
import { formatVolumeKg, sumVolumeKg } from '@/utils/workout-stats';

/**
 * 01 HOME — MASTER CANON의 모바일 밀도를 유지한다.
 * Header → HELL PASS/주간 기록 → 캐릭터(좌측 신체 HUD + 우측 스탠리) → CTA → 추천 운동.
 * 추천 운동 이하 영역은 캐릭터 stage 조정의 영향을 받지 않는다.
 * 신체 HUD는 실제 입력값만 표시하며 없는 값은 '-'로 둔다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
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
  } = useAppData();

  const [viewerOpen, setViewerOpen] = useState(false);
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

  const handleStageLayout = (event: LayoutChangeEvent) => {
    setStageHeight(event.nativeEvent.layout.height);
  };

  if (!profile) return null;

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.one }]}>
        <ThemedText type="smallBold">🏋 헬창키우기</ThemedText>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push('/trainer')} hitSlop={10}>
            <ThemedText type="captionBold" style={{ color: theme.gold }}>
              스탠리 PT ›
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.bellButton}>
            <ThemedText style={styles.topActionIcon}>🔔</ThemedText>
            {noticeAvailable && <View style={[styles.badgeDot, { backgroundColor: theme.mutedRed }]} />}
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
            <ThemedText style={styles.topActionIcon}>⚙️</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.two }]}>
        <View style={[styles.progressBlock, { borderColor: theme.border }]}>
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

        <View onLayout={handleStageLayout} style={styles.stage}>
          <Pressable
            onPress={() => setViewerOpen(true)}
            style={styles.characterPressable}
            accessibilityRole="button"
            accessibilityLabel="캐릭터 360도로 보기">
            <PlayerCharacter
              appearance={characterAppearance}
              slot="home"
              height={stageHeight > 0 ? stageHeight * 1.2 : 0}
              idle
            />
          </Pressable>

          <View
            pointerEvents="none"
            style={[
              styles.bodyHud,
              { backgroundColor: theme.background + 'D9', borderColor: theme.border },
            ]}>
            <BodyHudMetric label="체중" value={`${latestBody?.weightKg ?? profile.weightKg}kg`} />
            <BodyHudMetric
              label="골격근량"
              value={latestBody?.skeletalMuscleKg !== undefined ? `${latestBody.skeletalMuscleKg}kg` : '-'}
            />
            <BodyHudMetric
              label="체지방률"
              value={latestBody?.bodyFatPercent !== undefined ? `${latestBody.bodyFatPercent}%` : '-'}
            />
            <BodyHudMetric label="운동 기록" value={`${workoutRecords.length}회`} last />
          </View>

          <View style={styles.trainerOverlay}>
            <GoldsunBubble
              portrait={StanleyTrainer.portraitPlaceholder}
              name={StanleyTrainer.displayName}
              text={greeting.text}
              onPress={() => router.push('/trainer')}
            />
          </View>

          <View
            style={[
              styles.rotatePill,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">
              🔄 360°
            </ThemedText>
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
          variant="gold"
          size="large"
          onPress={handleStartPress}
        />

        {!sessionInProgress && (
          <RecommendedStrip
            items={recommendedItems}
            onPressItem={handleStartPress}
            onPressMore={handleStartPress}
          />
        )}
      </View>

      <CharacterViewer
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
        genderExpression={profile.genderExpression}
        size={profile.bodyParameters.size}
        tone={profile.bodyParameters.tone}
        growthStage={characterAppearance.growthStage}
      />
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
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

function BodyHudMetric({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.bodyHudMetric, !last && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    gap: Spacing.two,
  },
  stage: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  characterPressable: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyHud: {
    position: 'absolute',
    left: 0,
    top: Spacing.two,
    width: 76,
    borderWidth: 1,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  bodyHudMetric: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    gap: 1,
  },
  trainerOverlay: {
    position: 'absolute',
    right: 0,
    top: Spacing.one,
    width: '39%',
  },
  rotatePill: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  progressBlock: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.one,
  },
});
