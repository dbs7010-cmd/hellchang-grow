import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { NavRow } from '@/components/ui/nav-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { getExerciseById } from '@/config/exercises';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import { getTodaysScheduledRoutine } from '@/utils/routine';

/**
 * 06 WORKOUT HUB. Exercise DB 전체를 한 화면에 나열하던 구조로 되돌리지 않는다 —
 * 여기는 "오늘 운동 / 내 루틴 / 최근 운동 / 운동 찾기 / 새 루틴 만들기"로 이어지는
 * compact navigation 화면이다. 전체 탐색은 13 EXERCISE SELECT, 루틴 편집은 12 ROUTINE EDIT.
 */
export default function WorkoutHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { routines, workoutRecords } = useAppData();

  const scheduledRoutine = getTodaysScheduledRoutine(routines, new Date().getDay());
  const recentRecords = workoutRecords.slice(0, 3);

  return (
    <ScreenScroll>
      <ThemedText type="heading">운동</ThemedText>

      <NavRow
        label="오늘 운동"
        value={scheduledRoutine ? scheduledRoutine.name : '운동 시작하기'}
        onPress={() => router.push('/workout-start')}
      />

      <Section
        title="내 루틴"
        actionLabel="+ 새 루틴"
        onPressAction={() => router.push('/routine-edit')}>
        {routines.length === 0 ? (
          <ThemedText type="caption" themeColor="textSecondary">
            루틴은 선택 사항이에요. 없어도 [운동 시작]으로 바로 운동할 수 있어요.
          </ThemedText>
        ) : (
          routines.map((routine) => (
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
          ))
        )}
      </Section>

      <Section title="최근 운동">
        {recentRecords.length === 0 ? (
          <ThemedText type="caption" themeColor="textSecondary">
            아직 기록이 없어요.
          </ThemedText>
        ) : (
          recentRecords.map((record) => (
            <View key={record.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {record.title}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {WorkoutCategoryLabels[record.category]}
                  {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''}
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {record.date}
              </ThemedText>
            </View>
          ))
        )}
      </Section>

      <NavRow label="운동 찾기" value="전체 Exercise DB" onPress={() => router.push('/exercise-select')} />

      <PrimaryButton
        label="+ 새 루틴 만들기"
        variant="secondary"
        onPress={() => router.push('/routine-edit')}
      />
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
});
