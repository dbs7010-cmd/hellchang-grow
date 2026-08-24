import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { hasPlayerCharacterModel, StanleyPortraitImage } from '@/config/character-assets';
import { Exercises, getExerciseById, getExercisesByMuscleGroup } from '@/config/exercises';
import { MuscleGroups } from '@/config/muscle-groups';
import { StanleyTrainer } from '@/config/trainers';
import { BottomTabInset, HomeColors, Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords } from '@/data/workout-repository';
import { useTheme } from '@/hooks/use-theme';
import { findPreviousPerformance } from '@/utils/exercise-history';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { resolveMonetizationVisibility } from '@/utils/monetization-visibility';
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
    bodyParameters,
  } = useAppData();

  const { height: windowHeight } = useWindowDimensions();
  /** 실제 3D 모델이 등록돼 있을 때만 360 진입점을 노출한다 (V1은 아직 없다). */
  const canView360 = hasPlayerCharacterModel();
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
  const monetizationVisibility = resolveMonetizationVisibility(
    typeof __DEV__ !== 'undefined' && __DEV__
  );
  const noticeAvailable =
    (monetizationVisibility.openEventPass && !openEventPass.active) || canClaimReward;

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

  /**
   * 추천 카드는 "이 운동이 뭔지 먼저 보는" 입구다 — 누른 운동의 상세로 그대로 보낸다.
   * 카드를 눌렀다고 세션을 자동으로 시작하지 않는다 (시작은 항상 [운동 시작] 흐름을 거친다).
   * DB에 없는 ID가 들어와도 상세 화면이 "운동을 찾을 수 없어요"로 받아내므로 빈 화면이 없다.
   */
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

      {/*
        하단 여백에 insets.bottom을 더하지 않는다.
        이 화면은 NativeTabs 안이라 탭바가 아래에 자리를 차지하고 시스템 내비 inset도 탭바가
        흡수한다. 여기서 insets.bottom을 또 더하면 Android에서만 약 48dp가 이중으로 잡히고,
        stage가 유일한 flex:1이라 그 손해를 캐릭터가 전부 뒤집어쓴다.
        (웹은 insets.bottom이 0이라 이 버그가 보이지 않아 실기기에서만 캐릭터가 작았다.)
        플랫폼별 탭바 여유는 BottomTabInset 하나로만 관리한다.
      */}
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
          {/* 스탠리는 캐릭터 위에 겹치지 않고 흐름상 "윗줄"에 있다 —
              stage가 작아져도 말풍선이 얼굴/상체를 덮는 일이 구조적으로 없다. */}
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
            캐릭터가 실제로 쓰는 영역. 실제 에셋은 fill 모드라 이 박스를 그대로 꽉 채운다 —
            JS 측정값이 개입하지 않아서 Android와 웹이 같은 크기로 나온다.
            height(측정값)는 에셋이 없을 때의 도형 placeholder에만 쓰인다.
          */}
          <View style={styles.characterArea}>
            <View pointerEvents="none" style={styles.characterAtmosphere} />
            <View pointerEvents="none" style={styles.characterBackdrop} />
            <View pointerEvents="none" style={styles.characterGround} />
            <Pressable
              onPress={canView360 ? () => setViewerOpen(true) : undefined}
              onLayout={handleStageLayout}
              style={styles.characterFill}
              accessibilityRole={canView360 ? 'button' : undefined}
              accessibilityLabel={canView360 ? '캐릭터 360도로 보기' : undefined}>
              {/*
                bodyParameters를 넘기면 성장 상태가 보이는 파라메트릭 바디로 그려진다.
                홈은 **영구** 상태다 — 펌핑은 운동 종료 화면에서만 얹는다.
                레이아웃 계약(이 박스를 넘지 않는다)은 그대로다.
              */}
              <PlayerCharacter
                appearance={characterAppearance}
                slot="home"
                gameAssetSlot="idle"
                height={characterHeight}
                bodyParameters={bodyParameters}
                fill
                idle
              />
            </Pressable>

            {/* 보조 HUD. pointerEvents none이라 캐릭터 터치/360 진입을 막지 않는다. */}
            <View
              pointerEvents="none"
              style={styles.bodyHud}>
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

            {/* 실제 3D 모델이 등록되기 전에는 360을 아예 노출하지 않는다 — 눌러봐야 도형
                placeholder가 도는 빈 기능이다. model3d가 채워지면 이 버튼과 CharacterViewer가
                코드 수정 없이 그대로 다시 살아난다. */}
            {canView360 && (
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
            )}
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

/**
 * 주간 요약 한 칸. 라벨과 값을 한 줄에 나란히 두면 360px 화면에서 "이번 주 볼륨 1,950kg"이
 * 칸 폭을 넘겨 잘렸다 — 값이 잘리면 정보로서 쓸모가 없으므로 위/아래로 나눠 각자 칸 폭을
 * 전부 쓰게 한다. 숫자는 라벨보다 크게 읽히도록 한 단계 키운다.
 */
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

function BodyHudMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
    /**
     * 캐릭터 발밑과 [운동 시작] 사이의 틈을 좁힌다 — "캐릭터 → 운동 시작"이 두 개의 블록이
     * 아니라 한 동작으로 읽히게 하려는 것. content의 공통 gap(8)에서 4만 되돌린다.
     * 캐릭터는 이 박스 안에서 contain으로 맞춰지므로 몸을 가리거나 잘리지 않는다.
     */
    marginBottom: -Spacing.one,
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
