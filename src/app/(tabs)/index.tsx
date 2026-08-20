import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
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
 * 01 HOME — 기존 기능/레이아웃 계약을 유지하면서 MASTER CANON의 HUD 밀도만 복원한다.
 * Header → HELL PASS/주간 기록 → 캐릭터(좌측 신체 HUD + 우측 스탠리) → CTA → 추천 운동.
 * 신체 HUD는 실제 입력값만 표시하며 없는 값은 '-'로 둔다.
 */
/**
 * 캐릭터가 stage 가장자리에 딱 붙지 않도록 남기는 여유(px, 위아래 합).
 * Android는 부모 밖으로 나간 부분을 잘라내므로 0px 여유는 반올림만으로도 머리/발이 깎인다.
 */
const CharacterSafeInset = 8;

/**
 * 스탠리 한 줄이 차지하는 고정 높이(px). GoldsunBubble의 portrait(40) + 아래 여백(4).
 * 말풍선이 2~3줄로 늘어나면 그만큼 캐릭터 영역이 줄어들 뿐, 겹치지는 않는다.
 */
const TrainerRowHeight = 44;

/**
 * 실측 전에 쓰는 캐릭터 영역 높이 추정 비율(화면 높이 대비).
 * 실제 영역(412x915에서 490 = 0.54)보다 넉넉히 작게 잡는다 — 추정이 실제보다 크면 잘리므로.
 */
const CharacterAreaHeightRatio = 0.42;

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

  const windowHeight = Dimensions.get('window').height;
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

  /**
   * 캐릭터에 넘길 높이 = 캐릭터 영역을 실측한 값에서 안전 여유만 뺀 것.
   * transform으로 키워서 잘라내지 않고, 이 높이 안에서 contain으로만 맞춘다.
   *
   * 실측이 아직 없을 때(첫 프레임, 그리고 콜드 부팅에서 onLayout이 늦게 오는 경우)는
   * 화면 높이 기반 추정치를 쓴다. 추정치는 실제 영역보다 항상 작게 잡아서, 최악의 경우에도
   * 캐릭터가 조금 작게 보일 뿐 잘리거나 아예 안 그려지는 일이 없게 한다.
   */
  const estimatedAreaHeight = Math.round(windowHeight * CharacterAreaHeightRatio);
  const characterHeight = Math.max(
    0,
    (stageHeight > 0 ? stageHeight : estimatedAreaHeight) - CharacterSafeInset
  );

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

        <View style={styles.stage}>
          {/* 스탠리는 캐릭터 위에 겹치지 않고 흐름상 "윗줄"에 있다 —
              stage가 작아져도 말풍선이 얼굴/상체를 덮는 일이 구조적으로 없다. */}
          <View style={styles.trainerRow}>
            <GoldsunBubble
              portrait={StanleyTrainer.portraitPlaceholder}
              name={StanleyTrainer.displayName}
              text={greeting.text}
              onPress={() => router.push('/trainer')}
            />
          </View>

          {/* 캐릭터가 실제로 쓰는 영역. 이 박스를 직접 재서 그 높이만 PlayerCharacter에 넘긴다. */}
          <View style={styles.characterArea}>
            <Pressable
              onPress={() => setViewerOpen(true)}
              onLayout={handleStageLayout}
              style={styles.characterFill}
              accessibilityRole="button"
              accessibilityLabel="캐릭터 360도로 보기">
              <PlayerCharacter appearance={characterAppearance} slot="home" height={characterHeight} idle />
            </Pressable>

            {/* 보조 HUD. pointerEvents none이라 캐릭터 터치/360 진입을 막지 않는다. */}
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

            <Pressable
              onPress={() => setViewerOpen(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="캐릭터 360도로 보기"
              style={[
                styles.rotatePill,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="caption" themeColor="textSecondary">
                🔄 360°
              </ThemedText>
            </Pressable>
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
  },
  /**
   * 캐릭터가 실제로 그려지는 영역. stage에서 스탠리 줄을 뺀 나머지를 전부 가져간다.
   *
   * 예전에는 캐릭터 Pressable이 top/bottom -10%로 stage 밖까지 뻗어 있었다. 그 결과
   * (a) Android에서 부모 밖으로 나간 부분이 잘려 머리/발이 날아가고,
   * (b) 아래로 삐져나온 터치 영역이 [운동 시작] CTA 위를 덮어 오탭을 만들었다.
   * 이제 캐릭터는 이 박스 안에서만 contain으로 맞춰진다 — transform으로 키워서 잘라먹지 않는다.
   */
  characterArea: {
    flex: 1,
    position: 'relative',
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
    borderWidth: 1,
    borderRadius: Radius.medium,
    overflow: 'hidden',
    zIndex: 2,
  },
  bodyHudMetric: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    gap: 1,
  },
  trainerRow: {
    width: '100%',
    minHeight: TrainerRowHeight,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.one,
  },
  rotatePill: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    zIndex: 3,
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
