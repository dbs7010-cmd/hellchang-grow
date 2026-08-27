import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineAction } from '@/components/ui/inline-action';
import { NavRow } from '@/components/ui/nav-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { Exercises, getExerciseById } from '@/config/exercises';
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
          // 루틴은 선택 사항이다 — 없다고 재촉하지 않고, 있으면 뭐가 좋은지만 말한다.
          <EmptyState
            icon="📋"
            line="아직 저장한 루틴이 없어요."
            hint="자주 하는 운동을 묶어 두면 다음부터 한 번에 시작할 수 있어요."
            action={
              <InlineAction label="+ 첫 루틴 만들기" onPress={() => router.push('/routine-edit')} />
            }
          />
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
                <ThemedText type="smallBold" style={[styles.chevron, { color: theme.gold }]}>
                  ›
                </ThemedText>
              </Pressable>
            ))}
            <InlineAction
              label="+ 새 루틴 만들기"
              tone="quiet"
              onPress={() => router.push('/routine-edit')}
            />
          </>
        )}
      </Section>

      <Section title="최근 운동">
        {recentRecords.length === 0 ? (
          <EmptyState
            icon="📝"
            line="아직 기록이 없어요."
            hint="운동을 마치면 여기에 세트까지 그대로 남아요."
          />
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
              <ThemedText type="smallBold" numberOfLines={1} style={styles.rowText}>
                {record.title}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {WorkoutCategoryLabels[record.category]}
                {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''} · {record.date}
              </ThemedText>
              {/* chevron은 문장 끝이 아니라 다른 화면과 같은 자리·같은 색으로 둔다. */}
              <ThemedText type="smallBold" style={[styles.chevron, { color: theme.gold }]}>
                ›
              </ThemedText>
            </Pressable>
          ))
        )}
      </Section>

      {/* 전체 DB 탐색은 이 화면의 마지막 층이다 — 떠 있는 줄 하나가 아니라 이름이 붙은 블록으로. */}
      <Section title="더 찾아보기">
        <NavRow
          label="운동 찾기"
          value={`전체 Exercise DB · ${Exercises.length}개 종목`}
          onPress={() => router.push('/exercise-select')}
        />
      </Section>
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
  /** 목록 화면들과 같은 폭·같은 정렬의 chevron. */
  chevron: {
    width: 10,
    textAlign: 'right',
  },
});
