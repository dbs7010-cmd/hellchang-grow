import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterSilhouette } from '@/components/character/character-silhouette';
import { CharacterViewer } from '@/components/character/character-viewer';
import { GoldsunBubble } from '@/components/home/goldsun-bubble';
import { GrowthHud } from '@/components/home/growth-hud';
import { RecommendedStrip } from '@/components/home/recommended-strip';
import { StartWorkoutButton } from '@/components/home/start-workout-button';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AppConfig } from '@/config/app-config';
import { Exercises, getExerciseById, getExercisesByMuscleGroup } from '@/config/exercises';
import { MuscleGroups } from '@/config/muscle-groups';
import { StanleyTrainer } from '@/config/trainers';
import { BottomTabInset, GymTheme, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords } from '@/data/workout-repository';
import { findPreviousPerformance } from '@/utils/exercise-history';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profile,
    workoutRecords,
    bodyHistory,
    streak,
    openEventPass,
    activeSession,
    routines,
    passProgress,
    claimStreakReward,
  } = useAppData();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const weeklyCount = getThisWeekRecords(workoutRecords).length;
  const sessionInProgress = activeSession && activeSession.status !== 'completed';
  const scheduledRoutine = useMemo(
    () => getTodaysScheduledRoutine(routines, new Date().getDay()),
    [routines]
  );

  // workoutRecords.length를 키에 포함해 기록을 남길 때마다 골드썬 대사가 새로 뽑히게 한다.
  const greeting = useMemo(
    () => pickTrainerLine(StanleyTrainer.dialogueSet.homeGreeting),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workoutRecords.length]
  );

  const canClaimReward =
    streak.currentStreakDays >= AppConfig.streakRewardDays && !streak.rewardClaimed;
  const noticeAvailable = !openEventPass.active || canClaimReward;

  const latestBody = bodyHistory[0];
  const weightKg = latestBody?.weightKg ?? profile?.weightKg;
  const bodyFatPercent = latestBody?.bodyFatPercent;

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
        subtitle: previous ? `지난번 ${previous.sets.length}세트` : '첫 도전',
      };
    });
  }, [scheduledRoutine, workoutRecords]);

  const handleStartPress = () => {
    router.push(sessionInProgress ? '/session' : '/workout-start');
  };

  if (!profile) return null;

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
        <ThemedText type="smallBold" style={styles.logo}>
          🏋 헬창키우기
        </ThemedText>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push('/trainer')} hitSlop={8}>
            <ThemedText type="small" style={styles.topActionText}>
              골드썬 PT
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => setNoticeOpen(true)} hitSlop={8} style={styles.bellButton}>
            <ThemedText style={styles.topActionIcon}>🔔</ThemedText>
            {noticeAvailable && <View style={styles.badgeDot} />}
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <ThemedText style={styles.topActionIcon}>⚙️</ThemedText>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BottomTabInset + Spacing.five }]}>
        <View style={styles.heroRow}>
          <GrowthHud
            passLevel={passProgress.level}
            passXpIntoLevel={passProgress.xpIntoLevel}
            passXpForLevel={passProgress.xpForLevel}
            passProgress={passProgress.progress}
            weightKg={weightKg}
            bodyFatPercent={bodyFatPercent}
            workoutCount={workoutRecords.length}
          />

          <Pressable onPress={() => setViewerOpen(true)} style={styles.characterTouchable}>
            <CharacterSilhouette
              genderExpression={profile.genderExpression}
              size={profile.bodyParameters.size}
              tone={profile.bodyParameters.tone}
              angle="front"
            />
            <ThemedText type="small" style={styles.rotateHint}>
              🔄 터치해서{'\n'}캐릭터 회전
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.bubbleRow}>
          <GoldsunBubble
            portrait={StanleyTrainer.portraitPlaceholder}
            name={StanleyTrainer.displayName}
            text={greeting.text}
            onPress={() => router.push('/trainer')}
          />
        </View>

        {!sessionInProgress && (
          <ThemedText type="small" style={styles.suggestionLine}>
            {scheduledRoutine ? `오늘 · ${scheduledRoutine.name}` : '오늘은 뭐 조질까?'}
          </ThemedText>
        )}

        <StartWorkoutButton
          label={sessionInProgress ? '운동으로 돌아가기' : '운동 시작'}
          subLabel="오늘도 한계를 돌파해보세요!"
          onPress={handleStartPress}
        />

        {!sessionInProgress && (
          <RecommendedStrip
            items={recommendedItems}
            onPressItem={handleStartPress}
            onPressMore={handleStartPress}
          />
        )}

        <ThemedText type="small" style={styles.statsLine}>
          이번 주 {weeklyCount}회 · 연속 {streak.currentStreakDays}일째
        </ThemedText>
      </ScrollView>

      <CharacterViewer
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
        genderExpression={profile.genderExpression}
        size={profile.bodyParameters.size}
        tone={profile.bodyParameters.tone}
      />

      {noticeOpen && (
        <Pressable style={styles.noticeBackdrop} onPress={() => setNoticeOpen(false)}>
          <Pressable style={styles.noticeCard} onPress={(event) => event.stopPropagation()}>
            <ThemedText type="smallBold" style={styles.noticeTitle}>
              알림
            </ThemedText>
            {!openEventPass.active && (
              <View style={styles.noticeItem}>
                <ThemedText type="small" style={styles.noticeText}>
                  🎉 오픈 이벤트: 지금 시작하면 무료 패스 {AppConfig.openEventPassDays}일을 받을 수
                  있어요.
                </ThemedText>
                <PrimaryButton
                  label="무료 패스 받기"
                  variant="secondary"
                  onPress={() => {
                    setNoticeOpen(false);
                    router.push('/settings');
                  }}
                />
              </View>
            )}
            {canClaimReward && (
              <View style={styles.noticeItem}>
                <ThemedText type="small" style={styles.noticeText}>
                  {AppConfig.streakRewardDays}일 연속 기록 달성! 특별 트레이너 이용권을 받을 수
                  있어요.
                </ThemedText>
                <PrimaryButton
                  label="보상 받기"
                  onPress={() => {
                    claimStreakReward();
                    setNoticeOpen(false);
                  }}
                />
              </View>
            )}
            {!noticeAvailable && (
              <ThemedText type="small" style={styles.noticeText}>
                새로운 알림이 없어요.
              </ThemedText>
            )}
            <PrimaryButton label="닫기" variant="secondary" onPress={() => setNoticeOpen(false)} />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GymTheme.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  logo: {
    color: GymTheme.text,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  topActionText: {
    color: GymTheme.gold,
  },
  topActionIcon: {
    fontSize: 18,
  },
  bellButton: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0433C',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterTouchable: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  rotateHint: {
    color: GymTheme.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  bubbleRow: {
    alignItems: 'flex-end',
  },
  suggestionLine: {
    textAlign: 'center',
    color: GymTheme.textSecondary,
  },
  statsLine: {
    textAlign: 'center',
    color: GymTheme.textSecondary,
  },
  noticeBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  noticeCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: GymTheme.surface,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: GymTheme.border,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  noticeTitle: {
    color: GymTheme.gold,
  },
  noticeItem: {
    gap: Spacing.two,
  },
  noticeText: {
    color: GymTheme.text,
  },
});
