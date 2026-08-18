import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterSilhouette } from '@/components/character/character-silhouette';
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
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisWeekRecords } from '@/data/workout-repository';
import { useTheme } from '@/hooks/use-theme';
import { findPreviousPerformance } from '@/utils/exercise-history';
import { getTodaysScheduledRoutine } from '@/utils/routine';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { recommendMuscleGroup } from '@/utils/workout-recommendation';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
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
  } = useAppData();

  const [viewerOpen, setViewerOpen] = useState(false);

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
    <ThemedView style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
        <ThemedText type="smallBold">🏋 헬창키우기</ThemedText>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push('/trainer')} hitSlop={8}>
            <ThemedText type="small" style={{ color: theme.gold }}>
              골드썬 PT
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellButton}>
            <ThemedText style={styles.topActionIcon}>🔔</ThemedText>
            {noticeAvailable && <View style={[styles.badgeDot, { backgroundColor: theme.mutedRed }]} />}
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
          <Pressable onPress={() => router.push('/pass')} hitSlop={8}>
            <GrowthHud
              passLevel={passProgress.level}
              passXpIntoLevel={passProgress.xpIntoLevel}
              passXpForLevel={passProgress.xpForLevel}
              passProgress={passProgress.progress}
              weightKg={weightKg}
              bodyFatPercent={bodyFatPercent}
              workoutCount={workoutRecords.length}
            />
          </Pressable>

          <Pressable onPress={() => setViewerOpen(true)} style={styles.characterTouchable}>
            <CharacterSilhouette
              genderExpression={profile.genderExpression}
              size={profile.bodyParameters.size}
              tone={profile.bodyParameters.tone}
              angle="front"
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.rotateHint}>
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
          <ThemedText type="small" themeColor="textSecondary" style={styles.suggestionLine}>
            {scheduledRoutine ? `오늘 · ${scheduledRoutine.name}` : '오늘은 뭐 조질까?'}
          </ThemedText>
        )}

        <PrimaryButton
          label={sessionInProgress ? '운동으로 돌아가기' : '운동 시작'}
          subLabel="오늘도 한계를 돌파해보세요!"
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

        <ThemedText type="small" themeColor="textSecondary" style={styles.statsLine}>
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
    </ThemedView>
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
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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
    textAlign: 'center',
    fontSize: 11,
  },
  bubbleRow: {
    alignItems: 'flex-end',
  },
  suggestionLine: {
    textAlign: 'center',
  },
  statsLine: {
    textAlign: 'center',
  },
});
