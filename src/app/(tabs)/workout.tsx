import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DanbaekVoiceBubble } from '@/components/character/danbaek-voice-bubble';
import { ThemedText } from '@/components/themed-text';
import { NavRow } from '@/components/ui/nav-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { getExerciseById } from '@/config/exercises';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { buildDanbaekVoice, buildLearningBoard } from '@/utils/danbaek-learning-presence';
import { getTodaysScheduledRoutine } from '@/utils/routine';

/**
 * 06 WORKOUT HUB.
 *
 * 이 화면에서 가장 중요한 행동은 "운동을 시작하는 것"이다. 예전에는 [오늘 운동]이
 * 다른 항목과 똑같은 navigation row라서 무엇을 눌러야 할지 알 수 없었고, 화면이 비어
 * 보였다. 이제 상단은 홈과 같은 Gold Primary CTA이고 나머지는 전부 보조다.
 *
 * 루틴은 여전히 선택 사항이다 — 루틴 만들기가 운동 시작보다 강한 CTA가 되면 안 된다.
 * Exercise DB 전체 나열 구조로 되돌리지 않는다 (전체 탐색은 13 EXERCISE SELECT).
 */
export default function WorkoutHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { routines, workoutRecords, activeSession, danbaekLearning } = useAppData();

  const danbaekVoice = useMemo(() => buildDanbaekVoice(danbaekLearning), [danbaekLearning]);
  const learningBoard = useMemo(() => buildLearningBoard(danbaekLearning), [danbaekLearning]);

  const scheduledRoutine = getTodaysScheduledRoutine(routines, new Date().getDay());
  const recentRecords = workoutRecords.slice(0, 3);
  const sessionInProgress = activeSession && activeSession.status !== 'completed';

  return (
    <ScreenScroll>
      <ThemedText type="heading">운동</ThemedText>

      <PrimaryButton
        label={sessionInProgress ? '운동으로 돌아가기' : '운동 시작'}
        subLabel={
          sessionInProgress
            ? '진행 중인 세션이 있어요'
            : scheduledRoutine
              ? '오늘 · ' + scheduledRoutine.name
              : '루틴 없이 바로 시작할 수 있어요'
        }
        variant="gold"
        size="large"
        onPress={() => router.push(sessionInProgress ? '/session' : '/workout-start')}
      />

      <Section title="내 루틴">
        {routines.length === 0 ? (
          <View style={styles.emptyBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              아직 저장한 루틴이 없어요.
            </ThemedText>
            <Pressable onPress={() => router.push('/routine-edit')} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.gold }}>
                + 첫 루틴 만들기
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {routines.map((routine) => (
              <Pressable
                key={routine.id}
                onPress={() => router.push(`/routine-edit?routineId=${routine.id}`)}
                style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {routine.name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {routine.exerciseIds.map((id) => getExerciseById(id)?.name ?? id).join(', ')}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ›
                </ThemedText>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push('/routine-edit')} hitSlop={8} style={styles.inlineAction}>
              <ThemedText type="captionBold" themeColor="textSecondary">
                + 새 루틴 만들기
              </ThemedText>
            </Pressable>
          </>
        )}
      </Section>

      {/*
        내 운동이 단백이의 학습으로 이어진다는 걸 이 화면에서 한 번 더 보여준다.
        새로 계산하는 값은 없다 — 이미 만들어진 학습 스냅샷을 짧게 옮겨 적을 뿐이고,
        아직 본 적 없는 동작은 나열하지 않는다(할 일 목록이 되면 죄책감이 된다).
      */}
      <Section title="단백이가 배운 것">
        <DanbaekVoiceBubble line={danbaekVoice.line} status={danbaekVoice.status} />
        {learningBoard.length > 0 && (
          <View style={styles.boardRows}>
            {learningBoard.map((row) => (
              <View key={row.movementFamily} style={styles.boardRow}>
                <ThemedText type="small" numberOfLines={1} style={styles.rowText}>
                  {row.label}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {row.stageLabel} · {row.evidenceCount}번 봄
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="최근 운동">
        {recentRecords.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아직 기록이 없어요. 위에서 바로 시작해보세요.
          </ThemedText>
        ) : (
          recentRecords.map((record) => (
            <View key={record.id} style={styles.recentRow}>
              <ThemedText type="small" numberOfLines={1} style={styles.rowText}>
                {record.title}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {WorkoutCategoryLabels[record.category]}
                {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''} · {record.date}
              </ThemedText>
            </View>
          ))
        )}
      </Section>

      <NavRow label="운동 찾기" value="전체 Exercise DB" onPress={() => router.push('/exercise-select')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    minHeight: Layout.compactRowHeight,
  },
  rowText: {
    flex: 1,
  },
  /** 최근 운동은 카드가 아니라 한 줄 로그다 — 화면을 길게 만들지 않는다. */
  recentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: 2,
  },
  boardRows: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  emptyBlock: {
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  inlineAction: {
    paddingVertical: Spacing.one,
  },
});
