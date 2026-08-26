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
import { buildHomeBodyMetrics, buildHomeView } from '@/utils/home-presentation';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';
import { formatVolumeKg, sumVolumeKg } from '@/utils/workout-stats';

/**
 * 01 HOME — 현실 사용자의 오늘 운동이 맨 위에 오는 화면.
 *
 * **주인공은 앱을 쓰는 사람이다.** 단백이는 그 사람의 실제 운동에 반응하는 존재이지,
 * 홈에서 관리해야 하는 대상이 아니다. 그래서 순서가 이렇게 고정된다:
 *
 *   오늘 내 운동 상태 → 지금 할 행동(또는 완료 상태) → 오늘 가장 강한 실제 성취
 *   → 단백이 반응(무대 + 한마디) → 실제 진행도/주간 꾸준함 → 단백세상 → 보조 탐색
 *
 * 예전에는 캐릭터 무대가 화면의 40%를 먼저 가져가고 [운동 시작]이 그 아래에 있었다.
 * 그러면 "오늘 뭘 해야 하는가"보다 아바타가 먼저 읽힌다. 지금은 행동이 먼저고,
 * 세로가 모자라면 **줄어드는 쪽은 언제나 무대**다.
 *
 * 상태와 문구는 여기서 정하지 않는다 — `utils/home-presentation.ts`의 순수 함수 하나가
 * 정하고(PRE/IN_PROGRESS/POST), 화면은 그 결과를 그리기만 한다. 값도 실제 입력값만
 * 나오며 없는 값은 '-'다.
 *
 * 360 뷰어 경로는 복구 기준선(f466f00)의 삭제 결정을 그대로 유지한다 — 캐릭터는 언제나
 * 단일 PlayerCharacter로만 그려진다.
 */
const CharacterSafeInset = 8;
const TrainerRowHeight = 44;
const CharacterAreaHeightRatio = 0.24;

/**
 * 단백이 무대가 가져가는 높이.
 *
 * 이 값은 **양보하는 쪽**이다. 오늘의 운동 정보와 행동이 먼저 자리를 잡고, 남는 세로에서
 * 무대가 존재감을 갖는다 — 반대로 하면 작은 화면에서 행동이 첫 화면 밖으로 밀린다.
 */
const HeroHeightRatio = 0.28;
const HeroMinHeight = 168;
const HeroMaxHeight = 280;

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
    ptContext,
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

  /*
   * 오늘 내 운동이 어디까지 왔는가 — 이 화면의 첫 질문이자, 아래 모든 순서를 정하는 값.
   * 판단도 문구도 여기서 만들지 않는다: 이미 계산돼 있는 PtContext를 순수 함수 하나에
   * 넘기고 결과를 그리기만 한다. 새로 저장하는 것도, 시계를 보는 것도 없다.
   */
  const home = useMemo(
    () => buildHomeView({ ptContext, scheduledRoutineName: scheduledRoutine?.name ?? null }),
    [ptContext, scheduledRoutine]
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
        {/*
          오늘 내 운동. 화면을 열면 이것이 먼저 읽혀야 한다 — 아바타가 아니라.
          지금 할 행동이거나(운동 시작 / 운동 계속하기), 이미 끝냈다면 **행동이 아니라 상태**다.
        */}
        <View style={styles.todayBlock}>
          <ThemedText type="captionBold" style={styles.todayLabel}>
            {home.todayLabel}
          </ThemedText>

          {home.primary.kind === 'action' ? (
            <PrimaryButton
              label={home.primary.label}
              subLabel={home.primary.note ?? undefined}
              variant="homeGold"
              size="large"
              onPress={handleStartPress}
            />
          ) : (
            /*
              오늘 운동을 끝낸 사람에게 같은 자리에 골드 CTA를 다시 세우면 "한 번 더 해라"가
              된다. 완료는 눌러야 하는 것이 아니라 이미 이룬 것이라 카드로 남긴다.
            */
            <View style={styles.completionCard}>
              <ThemedText type="subtitle" style={styles.completionTitle}>
                ✓ {home.primary.label}
              </ThemedText>
              {home.primary.note && (
                <ThemedText type="caption" style={styles.completionNote}>
                  {home.primary.note}
                </ThemedText>
              )}
            </View>
          )}

          {home.secondary && (
            <PrimaryButton
              label={home.secondary.label}
              variant="secondary"
              onPress={() => router.push(home.secondary!.route)}
            />
          )}
        </View>

        {/*
          오늘 기준으로 가장 강한 실제 성취 하나. 새 PR 정의도 새 보상도 만들지 않고,
          이미 저장된 기록에서 고르기만 한다. 고를 것이 없으면 카드 자체가 없다.
        */}
        {home.performance && (
          <View style={styles.performanceCard}>
            <ThemedText type="caption" numberOfLines={1} style={styles.performanceTitle}>
              {home.performance.title}
            </ThemedText>
            <ThemedText type="metric" numberOfLines={1} style={styles.performanceValue}>
              {home.performance.value}
            </ThemedText>
            {home.performance.note && (
              <ThemedText type="caption" numberOfLines={1} style={styles.performanceNote}>
                {home.performance.note}
              </ThemedText>
            )}
          </View>
        )}

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

          이 반응은 위의 실제 성취에 **딸린 것**이다. 얘가 먼저 말하고 내 운동이 그 아래
          있으면, 홈이 캐릭터 관리 화면처럼 읽힌다.
        */}
        <DanbaekVoiceBubble
          line={danbaekVoice.line}
          status={danbaekVoice.status}
          homeLight
          onPress={() => router.push('/(tabs)/workout')}
        />

        {/*
          내 몸 상태 + 진행도. 실제 입력값만 나오고 없는 값은 '-'다.
        */}
        <View style={styles.bodyStrip}>
          {bodyMetrics.map((metric) => (
            <HomeStat key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </View>

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

        {/*
          단백세상 입구. **CTA가 아니라 한 줄**이다 — 오늘 할 운동과 무게를 겨루지 않는다.
          seam이 닫혀 있으면 아무것도 그리지 않는다.
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
          보조 탐색. 오늘 이미 운동했더라도 그대로 둔다 — 여기가 홈에서 **한 번 더 하러 가는
          기존 경로**이고, 그 길을 막지 않는다. 진행 중일 때만 숨긴다(지금 할 일은 하나다).
        */}
        {home.state !== 'IN_PROGRESS' && (
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
  /** 오늘의 운동 블록 — 머리말 + 행동(또는 완료 상태) + 보조 행동이 한 덩어리로 읽힌다. */
  todayBlock: {
    gap: Spacing.two,
  },
  todayLabel: {
    color: HomeColors.textSecondary,
  },
  /** 완료는 눌리는 것이 아니라 이룬 것이다 — 버튼 높이를 흉내 내지 않는다. */
  completionCard: {
    borderWidth: 1,
    borderColor: HomeColors.questBorder,
    borderRadius: Radius.large,
    backgroundColor: HomeColors.surfaceGold,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    gap: Spacing.half,
  },
  completionTitle: {
    color: HomeColors.goldStrong,
  },
  completionNote: {
    color: HomeColors.textSecondary,
  },
  /** 오늘 가장 강한 실제 성취 하나. 진행도 카드와 다른 무게로 둔다. */
  performanceCard: {
    borderWidth: 1,
    borderColor: HomeColors.border,
    borderRadius: Radius.large,
    backgroundColor: HomeColors.surface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
    boxShadow: HomeColors.hudShadow,
  },
  performanceTitle: {
    color: HomeColors.textSecondary,
  },
  performanceValue: {
    color: HomeColors.text,
    fontVariant: ['tabular-nums'],
  },
  performanceNote: {
    color: HomeColors.textSecondary,
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
