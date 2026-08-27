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
import { HomeHeadlineStat } from '@/components/home/home-headline-stat';
import { HomeSection } from '@/components/home/home-section';
import { RecommendedStrip } from '@/components/home/recommended-strip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppConfig } from '@/config/app-config';
import { StanleyPortraitImage } from '@/config/character-assets';
import { resolveDanbaekWorldEntry } from '@/config/danbaek-world-entry';
import { Exercises, getExerciseById, getExercisesByMuscleGroup } from '@/config/exercises';
import { MuscleGroupLabels, MuscleGroups } from '@/config/muscle-groups';
import { StanleyTrainer } from '@/config/trainers';
import { BottomTabInset, HomeColors, Layout, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords, getTodayRecords } from '@/data/workout-repository';
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
 * 홈에서 관리해야 하는 대상이 아니다.
 *
 * 홈은 카드 모음이 아니라 **이름이 붙은 묶음의 연속**이다:
 *
 *   오늘(행동 또는 완료 + 오늘의 성취) → 단백이(무대 + 반응) → 이번 주(꾸준함 + HELL PASS)
 *   → 단백세상 → 오늘 추천 운동 → 내 몸
 *
 * 각 묶음은 조용한 머리말 하나와 그 안에서 **가장 큰 것 하나**를 갖는다. 예전 홈에는
 * 위계가 두 단계뿐이었다 — [운동 시작] 22px와 나머지 전부 12~14px. 체중도 볼륨도
 * HELL PASS도 단백세상도 같은 크기로 늘어서서 화면이 무엇이 중요한지 말하지 않았고,
 * 숫자 일곱 개가 두 줄로 붙어 있어 대시보드처럼 읽혔다. 지금은 묶음마다 주인공이 있다.
 *
 * 세 상태는 문구만 바뀌는 같은 화면이 아니다. 운동 중에는 **묶음 자체가 사라진다** —
 * 지금 결정할 것은 하나뿐이므로 주간 통계도 추천도 몸 수치도 그때는 내보내지 않는다.
 *
 * 세로가 모자라면 줄어드는 쪽은 언제나 무대다.
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
const HeroHeightRatio = 0.2;
const HeroMinHeight = 132;
const HeroMaxHeight = 196;
/** 운동 중에는 아래 묶음이 없으므로 무대가 남는 세로를 가져간다. */
const HeroFocusRatio = 0.36;
const HeroFocusMaxHeight = 320;

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

  /**
   * 오늘 저장된 기록 중 가장 최근 것. [오늘 운동 기록]이 요약이 아니라 **그 기록**으로
   * 가기 위해 필요한 값이고, 판정에는 쓰이지 않는다.
   */
  const todayRecordId = useMemo(() => {
    const today = getTodayRecords(workoutRecords);
    const latest = today.reduce<(typeof today)[number] | null>(
      (best, record) => (!best || record.createdAt > best.createdAt ? record : best),
      null
    );
    return latest?.id ?? null;
  }, [workoutRecords]);

  /**
   * 오늘 추천 부위. **이미 추천 strip이 쓰던 그 값 그대로**이고, 새 추천 로직이 아니다 —
   * 화면 아래에서만 쓰이던 것을 위에서도 읽을 수 있게 밖으로 꺼냈을 뿐이다.
   * 오늘 예약된 루틴이 있으면 루틴 이름이 이기므로 그때는 계산하지 않는다.
   */
  const recommendedGroup = useMemo(
    () => (scheduledRoutine ? null : recommendMuscleGroup(workoutRecords, Exercises, MuscleGroups)),
    [scheduledRoutine, workoutRecords]
  );
  /*
   * 오늘 내 운동이 어디까지 왔는가 — 이 화면의 첫 질문이자, 아래 모든 순서를 정하는 값.
   * 판단도 문구도 여기서 만들지 않는다: 이미 계산돼 있는 PtContext를 순수 함수 하나에
   * 넘기고 결과를 그리기만 한다. 새로 저장하는 것도, 시계를 보는 것도 없다.
   */
  const home = useMemo(
    () =>
      buildHomeView({
        ptContext,
        scheduledRoutineName: scheduledRoutine?.name ?? null,
        recommendedFocusLabel: recommendedGroup ? MuscleGroupLabels[recommendedGroup] : null,
        todayRecordId,
      }),
    [ptContext, scheduledRoutine, recommendedGroup, todayRecordId]
  );

  const greeting = useMemo(
    () => pickTrainerLine(StanleyTrainer.dialogueSet.homeGreeting),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workoutRecords.length]
  );

  /**
   * 연속 일수 아래 한 줄.
   *
   * 아직 한 번도 안 한 사람에게 큰 "0"만 세워 두면 홈이 실패를 먼저 말한다. 없는 값을
   * 지어내지 않고, 이미 저장된 값(최고 연속)이나 다음에 무슨 일이 일어나는지만 말한다.
   */
  const streakNote =
    streak.currentStreakDays === 0
      ? '오늘 하면 1일째'
      : streak.longestStreakDays > streak.currentStreakDays
        ? `최고 ${streak.longestStreakDays}일`
        : null;

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

  /**
   * 무대 높이.
   *
   * 평소에는 양보하는 쪽이다 — 오늘의 행동과 이번 주가 먼저 자리를 잡는다.
   * 운동 중에는 아래 묶음들이 통째로 빠지므로 화면이 짧아지는데, 그때 무대까지 작으면
   * 홈이 잘린 것처럼 보인다. 그 상태에서만 무대가 남는 자리를 가져간다.
   */
  const heroRatio = home.state === 'IN_PROGRESS' ? HeroFocusRatio : HeroHeightRatio;
  const heroMax = home.state === 'IN_PROGRESS' ? HeroFocusMaxHeight : HeroMaxHeight;
  const heroHeight = Math.min(
    heroMax,
    Math.max(HeroMinHeight, Math.round(windowHeight * heroRatio))
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
          {/*
            상단 세 컨트롤은 아이콘/글자 크기만큼만 눌리는 영역이었다(25x24, 58x16).
            화면 구성과 3-state는 그대로 두고 눌리는 크기만 손 하나로 닿는 하한선에 맞춘다.
          */}
          <Pressable
            onPress={() => router.push('/trainer')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="스탠리 PT"
            style={styles.topAction}>
            <ThemedText type="captionBold" style={styles.trainerLink}>
              스탠리 PT ›
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="알림"
            style={[styles.topAction, styles.bellButton]}>
            <ThemedText style={styles.topActionIcon}>🔔</ThemedText>
            {noticeAvailable && <View style={styles.badgeDot} />}
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="설정"
            style={styles.topAction}>
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
        <HomeSection title={home.todayLabel} gap={Spacing.two}>
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
              된다. 완료는 눌러야 하는 것이 아니라 이미 이룬 것이다 — 그래서 카드가 아니라
              글자로 선다. 카드로 감싸면 아래 성취와 서로 다른 위젯 두 개로 읽힌다.
            */
            <View style={styles.completion}>
              <ThemedText type="heading" style={styles.completionTitle}>
                ✓ {home.primary.label}
              </ThemedText>
              {home.primary.note && (
                <ThemedText type="caption" style={styles.completionNote}>
                  {home.primary.note}
                </ThemedText>
              )}
            </View>
          )}

          {/*
            오늘 기준으로 가장 강한 실제 성취 하나. 새 PR 정의도 새 보상도 만들지 않고,
            이미 저장된 기록에서 고르기만 한다. 고를 것이 없으면 아무것도 그리지 않는다.

            완료 표시와 **같은 블록 안에** 둔다. 예전에는 흰 카드 하나로 따로 떠 있어서
            "오늘 끝냈다"와 "무엇을 해냈다"가 서로 다른 위젯처럼 읽혔다. 지금은 운동명 →
            값 → 근거가 위에서 아래로 이어지는 한 문장이다.
          */}
          {home.performance && (
            <View style={styles.performance}>
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

          {/*
            보조 행동은 채워진 버튼이 아니라 한 줄이다 — 골드 CTA 자리 아래에 또 하나의
            큰 면을 두면 "지금 눌러야 할 것"이 둘로 보인다. 가는 곳은 그대로다.
          */}
          {home.secondary && (
            <Pressable
              onPress={() =>
                home.secondary?.recordId
                  ? router.push({ pathname: '/workout-record', params: { id: home.secondary.recordId } })
                  : router.push('/(tabs)/history')
              }
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={home.secondary.label}
              style={styles.secondaryRow}>
              <ThemedText type="captionBold" style={styles.secondaryLabel}>
                {home.secondary.label} ›
              </ThemedText>
            </Pressable>
          )}
        </HomeSection>

        {/*
          단백이 묶음 — 무대와 반응이 **한 묶음**이다.
          예전에는 스탠리 말풍선, 내 캐릭터, 단백이 한마디가 아무 이름 없이 세로로
          이어져서 셋 중 누가 말하는 건지, 가운데 서 있는 게 누구인지 알 수 없었다.
          머리말을 붙여 이 띠가 무엇인지부터 말하고, 학습 상태를 그 옆에 둔다.
        */}
        <HomeSection title="단백이" divided gap={0}>
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

          {/*
            받침대도 후광도 없다. 무대 장식을 두르면 단백이가 "전시된 아바타 슬롯"처럼
            보이고, 그 순간 홈의 주인공이 사람에서 캐릭터로 넘어간다.
          */}
          <View style={styles.characterArea}>
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
          있으면, 홈이 캐릭터 관리 화면처럼 읽힌다. 그래서 말풍선을 카드로 띄우지 않고
          캐릭터 바로 밑에 붙여, 성취 → 반응이 한 덩어리로 읽히게 한다.
        */}
        <DanbaekVoiceBubble
          line={danbaekVoice.line}
          status={danbaekVoice.status}
          homeLight
          onPress={() => router.push('/(tabs)/workout')}
        />
        </HomeSection>

        {/*
          운동 중에는 여기서 화면이 끝난다.
          지금 결정할 것은 "이어서 하러 간다" 하나뿐인데, 그 아래에 주간 통계와 추천과
          몸 수치를 늘어놓으면 진행 중이라는 사실이 통계에 묻힌다. 세 상태를 문구가 아니라
          **구성으로** 구분하는 자리다.
        */}
        {home.state !== 'IN_PROGRESS' && (
          <>
            {/*
              이번 주 — 이 묶음의 주인공은 연속 일수다.
              예전에는 이번 주/연속/볼륨이 전부 14px로 나란히 있어서 무엇을 봐야 할지
              알 수 없었고, 그 위아래로 몸 수치 네 칸이 또 같은 모양으로 붙어 숫자 일곱 개가
              한 덩어리로 보였다. 꾸준함이 이 앱이 만들고 싶은 행동이므로 그것만 크게 세운다.
            */}
            <HomeSection title="이번 주" divided actionLabel="전체 기록" onPressAction={() => router.push('/(tabs)/history')}>
              <View style={styles.weekRow}>
                <HomeHeadlineStat
                  label="연속"
                  value={`🔥 ${streak.currentStreakDays}`}
                  unit="일"
                  note={streakNote}
                />
                <View style={styles.weekSide}>
                  <HomeStat label="운동" value={weekRecords.length + '회'} />
                  <HomeStat
                    label="볼륨"
                    value={weeklyVolumeKg > 0 ? formatVolumeKg(weeklyVolumeKg) : '-'}
                  />
                </View>
              </View>

              {/* 보상 진행도는 주간 꾸준함과 같은 이야기다 — 따로 떨어진 줄로 두지 않는다. */}
              <GrowthHud
                passLevel={passProgress.level}
                passXpIntoLevel={passProgress.xpIntoLevel}
                passXpForLevel={passProgress.xpForLevel}
                passProgress={passProgress.progress}
                onPress={() => router.push('/pass')}
              />
            </HomeSection>

            {/*
              단백세상 입구.
              실제 운동이 무엇을 여는지가 이 제품의 정체성인데, 예전에는 통계 아래
              12px 회색 한 줄이라 각주처럼 보였다. 골드 CTA와 무게를 겨루지는 않되
              (오늘 할 운동이 여전히 유일한 주 행동이다) 읽을 수 있는 크기로 세운다.
              seam이 닫혀 있으면 아무것도 그리지 않는다.
            */}
            {worldEntry && (
              <HomeSection title="단백세상" divided>
                <Pressable
                  onPress={() => router.push(worldEntry.route)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${worldEntry.label} 들어가기`}
                  style={styles.worldEntryRow}>
                  <ThemedText style={styles.worldEntryMark}>🌱</ThemedText>
                  <View style={styles.worldEntryText}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.worldEntryLabel}>
                      {worldEntry.label}
                    </ThemedText>
                    <ThemedText type="caption" numberOfLines={2} style={styles.worldEntrySub}>
                      {worldEntry.subLabel}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={styles.worldEntryChevron}>
                    ›
                  </ThemedText>
                </Pressable>
              </HomeSection>
            )}

            {/*
              보조 탐색. 오늘 이미 운동했더라도 그대로 둔다 — 여기가 홈에서 한 번 더 하러
              가는 기존 경로이고, 그 길을 막지 않는다.
            */}
            {recommendedItems.length > 0 && (
              <HomeSection title="오늘 추천 운동" divided actionLabel="더보기" onPressAction={handleStartPress}>
                <RecommendedStrip
                  items={recommendedItems}
                  onPressItem={handleRecommendedPress}
                  onPressMore={handleStartPress}
                  headless
                />
              </HomeSection>
            )}

            {/*
              내 몸. 실제 입력값만 나오고 없는 값은 '-'다.
              매일 바뀌는 값이 아니라 **참고 수치**이므로 오늘의 행동보다 아래에 둔다 —
              예전에는 이 네 칸이 화면 한가운데에서 대부분 '-'를 보여주고 있었다.
              값을 채우는 곳(히스토리의 몸 변화)으로 가는 길을 여기서 같이 준다.
            */}
            <HomeSection
              title="내 몸"
              divided
              actionLabel="기록 추가"
              onPressAction={() => router.push('/(tabs)/history')}>
              <View style={styles.bodyStrip}>
                {bodyMetrics.map((metric) => (
                  <HomeStat key={metric.label} label={metric.label} value={metric.value} />
                ))}
              </View>
            </HomeSection>
          </>
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
  /** 상단 컨트롤의 최소 터치 영역. 아이콘 크기는 그대로고 눌리는 범위만 넓어진다. */
  topAction: {
    minHeight: Layout.compactRowHeight,
    minWidth: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
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
    top: 6,
    right: 4,
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
  /**
   * 오늘의 운동 블록 — 머리말 → 행동(또는 완료) → 오늘의 성취 → 보조 한 줄이 **하나로**
   * 읽힌다. 예전에는 이 넷이 각자 둥근 면을 갖고 따로 떠 있어서 위젯 네 개처럼 보였다.
   */
  /** 이번 주 묶음: 주인공(연속)이 왼쪽, 받쳐 주는 두 값이 오른쪽. */
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  weekSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: Spacing.half,
  },
  /** 완료는 면이 아니라 글자로 선다. 버튼 모양을 흉내 내지 않는다. */
  completion: {
    gap: Spacing.half,
    paddingTop: Spacing.one,
  },
  completionTitle: {
    color: HomeColors.goldStrong,
  },
  completionNote: {
    color: HomeColors.textSecondary,
  },
  /**
   * 오늘 가장 강한 실제 성취. 카드가 아니라 타이포그래피가 위계를 만든다 —
   * 운동명(작게) → 값(크게) → 근거(작게).
   */
  performance: {
    paddingTop: Spacing.one,
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
  /** 보조 행동 한 줄. 단백세상 입구와 같은 문법을 쓴다 — 홈에 큰 면을 늘리지 않는다. */
  secondaryRow: {
    justifyContent: 'center',
    minHeight: Layout.compactRowHeight,
  },
  secondaryLabel: {
    color: HomeColors.goldStrong,
  },
  stage: {
    marginBottom: -Spacing.one,
  },
  characterArea: {
    flex: 1,
    position: 'relative',
  },
  /**
   * 캐릭터는 무대 가운데가 아니라 **아래쪽**에 선다. 가운데에 띄우면 발밑에 빈 칸이 생기고,
   * 바로 아래 붙어야 할 단백이 한마디가 멀어져서 "내 성취에 얘가 반응한다"가 끊긴다.
   */
  characterFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trainerRow: {
    width: '100%',
    minHeight: TrainerRowHeight,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.one,
  },
  /**
   * 몸 상태 한 줄. 카드가 아니라 배경 위에 그대로 얹는다 — 값이 대부분 '-'인 사용자에게
   * 카드를 세워 주면 빈 대시보드가 하나 더 생긴다.
   */
  bodyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /**
   * 단백세상 입구. 표시(🌱) → 이름 → 지금 상황이 한 줄로 읽히고 오른쪽에 이동 표시가 선다.
   * 골드 CTA와 무게를 겨루지 않되, 각주로 보이지도 않는 크기를 갖는다.
   */
  worldEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Layout.listRowHeight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: HomeColors.questBorder,
    backgroundColor: HomeColors.questSurface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  worldEntryMark: {
    fontSize: 20,
  },
  worldEntryText: {
    flex: 1,
    gap: 1,
  },
  worldEntryChevron: {
    color: HomeColors.goldStrong,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.half,
  },
  brand: { color: HomeColors.text },
  worldEntryLabel: { color: HomeColors.text },
  worldEntrySub: { color: HomeColors.textSecondary },
  trainerLink: { color: HomeColors.goldStrong },
  statLabel: { color: HomeColors.textSecondary },
  statValue: { color: HomeColors.text, fontWeight: 800, fontVariant: ['tabular-nums'] },
});
