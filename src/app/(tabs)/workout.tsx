import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

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
  const { routines, workoutRecords, activeSession } = useAppData();

  const scheduledRoutine = getTodaysScheduledRoutine(routines, new Date().getDay());
  const recentRecords = workoutRecords.slice(0, 3);
  const sessionInProgress = activeSession && activeSession.status !== 'completed';

  return (
    <ScreenScroll>
      <ThemedText type="heading">운동</ThemedText>

      <PrimaryButton
        label={sessionInProgress ? '운동 계속하기' : '운동 시작'}
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

      <Section title="최근 운동">
        {recentRecords.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아직 기록이 없어요. 위에서 바로 시작해보세요.
          </ThemedText>
        ) : (
          recentRecords.map((record) => (
            // 눌러서 세트 상세로. 홈/히스토리와 같은 화면으로 간다 — 상세를 세 개 만들지 않는다.
            <Pressable
              key={record.id}
              onPress={() => router.push({ pathname: '/workout-record', params: { id: record.id } })}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${record.title} 기록 자세히 보기`}
              style={styles.recentRow}>
              <ThemedText type="small" numberOfLines={1} style={styles.rowText}>
                {record.title}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {WorkoutCategoryLabels[record.category]}
                {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''} · {record.date} ›
              </ThemedText>
            </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: Layout.compactRowHeight,
  },
  emptyBlock: {
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  inlineAction: {
    paddingVertical: Spacing.one,
  },
});
