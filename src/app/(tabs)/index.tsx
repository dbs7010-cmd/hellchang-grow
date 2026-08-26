import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerCharacter } from '@/components/character/player-character';
import { DanbaekVoiceBubble } from '@/components/character/danbaek-voice-bubble';
import { GoldsunBubble } from '@/components/goldsun/goldsun-bubble';
import { GrowthHud } from '@/components/home/growth-hud';
import { RecommendedStrip } from '@/components/home/recommended-strip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppConfig } from '@/config/app-config';
import { StanleyPortraitImage } from '@/config/character-assets';
import { resolveDanbaekWorldEntry } from '@/config/danbaek-world-entry';
import { Exercises, getExerciseById, getExercisesByMuscleGroup } from '@/config/exercises';
import { MuscleGroups } from '@/config/muscle-groups';
import { StanleyTrainer } from '@/config/trainers';
import { BottomTabInset, HomeColors, Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords } from '@/data/workout-repository';
import { buildDanbaekVoice } from '@/utils/danbaek-learning-presence';
import { findPreviousPerformance } from '@/utils/exercise-history';
import { buildHomeBodyMetrics } from '@/utils/home-presentation';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';
import { formatVolumeKg, sumVolumeKg } from '@/utils/workout-stats';

/**
 * 01 HOME — Warm White, Character Stage, Gold CTA, Stanley bubble, bottom navigation.
 * 412x915 / 390x844 / 360x800 responsive 배치를 함께 고정한다.
 *
 * **순서가 곧 우선순위다**:
 *   Header → 스탠리 한마디 + 캐릭터 → 단백이 한마디 → [운동 시작] → (단백세상 입구)
 *   → 내 몸 한 줄 → HELL PASS/주간 기록 → 추천 운동
 *
 * 예전에는 진행도 카드가 맨 위, 신체 HUD가 캐릭터 옆 200px 컬럼이라 화면을 열면 숫자판이
 * 먼저 보이고 주인공(캐릭터)이 그보다 작았다. 값과 기능은 하나도 지우지 않고 **층만** 내렸다.
 * 신체 수치는 실제 입력값만 표시하며 없는 값은 '-'로 둔다 (utils/home-presentation.ts).
 *
 * 360 뷰어 경로는 복구 기준선(f466f00)의 삭제 결정을 그대로 유지한다 — 캐릭터는 언제나
 * 단일 PlayerCharacter로만 그려진다.
 */
const CharacterSafeInset = 8;
const TrainerRowHeight = 44;
const CharacterAreaHeightRatio = 0.36;

/**
 * 무대(스탠리 한 줄 + 캐릭터)가 가져가는 높이. **화면 높이에서 비율로 정한다.**
 *
 * 예전에는 stage가 유일한 flex:1이라, 아래에 무엇을 하나 더할 때마다 그 손해를 전부
 * 캐릭터가 뒤집어썼다. 이제 무대 몫을 먼저 떼고 나머지가 스크롤된다.
 */
const HeroHeightRatio = 0.4;
const HeroMinHeight = 220;
const HeroMaxHeight = 380;

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
    danbaekLearning,
  } = useAppData();

  const { height: windowHeight } = useWindowDimensions();
  const [stageHeight, setStageHeight] = useState(0);

  const weekRecords = useMemo(() => getThisWeekRecords(workoutRecords), [workoutRecords]);
  const weeklyVolumeKg = useMemo(() => sumVolumeKg(weekRecords), [weekRecords]);
  /** 실제 입력값만 나오는 몸 상태 한 줄. 규칙은 utils/home-presentation.ts 하나에서만 온다. */
  const bodyMetrics = useMemo(
    () =>
      profile
        ? buildHomeBodyMetrics({ profile, bodyHistory, workoutRecordCount: workoutRecords.length })
        : [],
    [profile, bodyHistory, workoutRecords.length]
  );

  /*
   * 단백이의 학습은 성장(HELL PASS)과 **다른 축**이다 — 진행도 표시는 그대로 두고,
   * 여기서는 얘가 내 운동을 보고 무엇을 따라 하는 중인지만 두 층으로 말한다.
   * 계산은 어댑터가 이미 했다. 화면은 문구만 고른다.
   */
  const danbaekVoice = useMemo(() => buildDanbaekVoice(danbaekLearning), [danbaekLearning]);

  /*
   * 단백세상 입구. seam이 닫혀 있어 지금은 null이고 아무것도 그리지 않는다 —
   * WORLD는 다른 소유라 여기서 화면을 추측해 만들지 않는다.
   */
  const worldEntry = useMemo(
    () => resolveDanbaekWorldEntry({ profile: danbaekLearning }),
    [danbaekLearning]
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

  const heroHeight = Math.min(
    HeroMaxHeight,
    Math.max(HeroMinHeight, Math.round(windowHeight * HeroHeightRatio))
  );
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: BottomTabInset + Spacing.two }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.stage, { height: heroHeight }]}>
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

          </View>
        </View>

        {/*
          단백이가 말하는 자리. 스탠리는 무대 **위**, 단백이는 무대 **아래**에서 말한다 —
          둘이 같은 띠에서 동시에 말하면 누가 말하는지가 화면에서 사라진다.
          한마디(단백이 목소리) + 상태 한 줄(정확한 학습 단계) 두 층으로만 말한다.
        */}
        <DanbaekVoiceBubble
          line={danbaekVoice.line}
          status={danbaekVoice.status}
          homeLight
          onPress={() => router.push('/(tabs)/workout')}
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
          variant="homeGold"
          size="large"
          onPress={handleStartPress}
        />

        {/*
          단백세상 입구. **CTA가 아니라 CTA 아래 한 줄**이다 — [운동 시작]과 나란히 두면
          지금 뭘 해야 하는가가 두 개가 된다. seam이 닫혀 있으면 아무것도 그리지 않는다.
        */}
        {worldEntry && (
          <Pressable
            onPress={() => router.push(worldEntry.route)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${worldEntry.label} 들어가기`}
            style={styles.worldEntryRow}>
            <ThemedText type="captionBold" numberOfLines={1} style={styles.worldEntryLabel}>
              🌱 {worldEntry.label} ›
            </ThemedText>
            <ThemedText type="caption" numberOfLines={1} style={styles.worldEntrySub}>
              {worldEntry.subLabel}
            </ThemedText>
          </Pressable>
        )}

        {/*
          내 몸 상태. 예전에는 캐릭터 옆 200px 컬럼이라 화면의 주인공(캐릭터)보다 커 보였다 —
          같은 값을 지우지 않고 한 줄로 눕혀서, 캐릭터가 무대를 되찾고 숫자는 필요할 때
          읽히는 자리로 내려왔다. 실제 입력값만 나오고 없는 값은 '-'다.
        */}
        <View style={styles.bodyStrip}>
          {bodyMetrics.map((metric) => (
            <HomeStat key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </View>

        {/*
          진행도(HELL PASS / 주간 기록)는 **마지막 층**이다. 화면을 열자마자 숫자판이 먼저
          보이면 이 앱이 대시보드처럼 읽힌다 — 먼저 보여야 하는 것은 단백이와 오늘 할 운동이다.
          값과 기능은 그대로 두고 순서만 내렸다.
        */}
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

        {!sessionInProgress && (
          <RecommendedStrip
            items={recommendedItems}
            onPressItem={handleRecommendedPress}
            onPressMore={handleStartPress}
          />
        )}
      </ScrollView>
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
  },
  contentInner: {
    paddingHorizontal: Layout.screenPaddingX,
    gap: Spacing.two,
  },
  stage: {
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
  /**
   * 몸 상태 한 줄. 카드가 아니라 배경 위에 그대로 얹는다 — 진행도 카드와 같은 무게로
   * 보이면 홈에 숫자판이 두 개 생긴다.
   */
  bodyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  /** 단백세상 입구는 CTA 아래 한 줄이다 — 골드 CTA와 무게를 겨루지 않는다. */
  worldEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.half,
  },
  brand: { color: HomeColors.text },
  worldEntryLabel: { color: HomeColors.goldStrong },
  worldEntrySub: { color: HomeColors.textSecondary },
  trainerLink: { color: HomeColors.goldStrong },
  statLabel: { color: HomeColors.textSecondary },
  statValue: { color: HomeColors.text, fontWeight: 800, fontVariant: ['tabular-nums'] },
});
