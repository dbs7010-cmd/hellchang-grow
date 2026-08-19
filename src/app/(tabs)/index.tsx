import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import { CharacterViewer } from '@/components/character/character-viewer';
import { GoldsunBubble } from '@/components/goldsun/goldsun-bubble';
import { GrowthHud } from '@/components/home/growth-hud';
import { RecommendedStrip } from '@/components/home/recommended-strip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Exercises, getExerciseById, getExercisesByMuscleGroup } from '@/config/exercises';
import { MuscleGroups } from '@/config/muscle-groups';
import { StanleyTrainer } from '@/config/trainers';
import { AppConfig } from '@/config/app-config';
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
 * 01 HOME — 앱의 얼굴. Galaxy 412x915에서 스크롤 없이 아래가 전부 보여야 한다.
 *
 * 최종 순서:
 *   Header → HELL PASS → 이번 주 운동 기록 → 캐릭터 → 스탠리 한마디 →
 *   운동 시작 CTA → 오늘 추천 운동 → Bottom Tabs
 *
 * 시각적 중요도는 순서와 다르다: 운동 시작 CTA > 캐릭터 > HELL PASS > 운동 기록.
 * 그래서 위에 올라간 진행 정보는 카드가 아니라 얇은 줄이고, Gold는 진행 바에만 쓴다.
 *
 * 그래서 이 화면은 ScrollView가 아니라 고정 flex column이다. 남는 세로 공간은 전부
 * 캐릭터 stage(flex:1)가 흡수하고, 캐릭터는 stage 높이에 맞춰 scale된다 —
 * 화면이 더 작은 기기에서도 잘리지 않고, 더 큰 기기에서는 캐릭터가 더 커진다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    profile,
    workoutRecords,
    streak,
    openEventPass,
    activeSession,
    routines,
    passProgress,
  } = useAppData();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [stageHeight, setStageHeight] = useState(0);

  const weekRecords = useMemo(() => getThisWeekRecords(workoutRecords), [workoutRecords]);
  const weeklyVolumeKg = useMemo(() => sumVolumeKg(weekRecords), [weekRecords]);
  const sessionInProgress = activeSession && activeSession.status !== 'completed';
  const scheduledRoutine = useMemo(
    () => getTodaysScheduledRoutine(routines, new Date().getDay()),
    [routines]
  );

  // workoutRecords.length를 키에 포함해 기록을 남길 때마다 스탠리 대사가 새로 뽑히게 한다.
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

  // 실제 캐릭터 아트(PlayerCharacterImages)가 들어오면 CharacterSilhouette가 Image를
  // width/height 100% + contentFit="contain"으로 그리므로, 이 scale과 무관하게 stage에 맞춰진다.
  const characterScale = stageHeight > 0 ? Math.min(1, stageHeight / CharacterIntrinsicHeight) : 1;

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
        {/* 진행 정보. 캐릭터/CTA보다 조용해야 한다 — 카드로 띄우지 않고 얇은 줄로만 둔다. */}
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

        <Pressable
          onPress={() => setViewerOpen(true)}
          onLayout={handleStageLayout}
          style={styles.stage}
          accessibilityRole="button"
          accessibilityLabel="캐릭터 360도로 보기">
          <CharacterSilhouette
            genderExpression={profile.genderExpression}
            size={profile.bodyParameters.size}
            tone={profile.bodyParameters.tone}
            angle="front"
            scale={characterScale}
          />
          <View
            style={[
              styles.rotatePill,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">
              🔄 360°
            </ThemedText>
          </View>
        </Pressable>

        <GoldsunBubble
          portrait={StanleyTrainer.portraitPlaceholder}
          name={StanleyTrainer.displayName}
          text={greeting.text}
          onPress={() => router.push('/trainer')}
        />

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

/**
 * 추천 카드의 상태 한 줄. 지어낸 문구가 아니라 실제 기록에서 나온 값만 쓴다.
 *  - 무게 기록이 있으면 지난번 최고 중량
 *  - 무게 없이 세트만 있으면 세트 수
 *  - 기록이 없거나(세션에 추가만 하고 세트를 안 채운 경우 포함) 비어 있으면 "첫 도전"
 */
function describePreviousPerformance(
  previous: ReturnType<typeof findPreviousPerformance>
): string {
  if (!previous || previous.sets.length === 0) return '첫 도전';
  if (previous.maxWeightKg !== undefined) return '지난번 ' + previous.maxWeightKg + 'kg';
  return '지난번 ' + previous.sets.length + '세트';
}

/**
 * 홈 하단 한 줄 요약. 체중이 아니라 "이번 주 활동량"을 보여준다 — 홈은 체중계가 아니다.
 * 라벨과 값을 한 줄에 붙여 세로 공간을 캐릭터 stage에 돌려준다.
 */
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
  /** 남는 세로 공간을 전부 캐릭터에 준다. 캐릭터는 이 높이에 맞춰 scale된다. */
  stage: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
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
