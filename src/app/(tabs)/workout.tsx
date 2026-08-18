import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { NavRow } from '@/components/ui/nav-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { getExerciseById } from '@/config/exercises';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { getTodaysScheduledRoutine } from '@/utils/routine';

/**
 * 16 SCREEN 중 "06 WORKOUT HUB". Exercise DB 전체를 한 화면에 나열하던 이전 구조를
 * 폐기하고, CANON처럼 오늘 운동 / 내 루틴 / 최근 운동 / 운동 찾기로 이어지는
 * compact navigation row로 바꿨다. 전체 Exercise DB 탐색은 "13 운동 찾기"
 * (exercise-select.tsx)로, 루틴 생성/수정은 "12 루틴 편집"(routine-edit.tsx)으로 옮겼다.
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

      <NavRow
        label="내 루틴"
        value={routines.length > 0 ? `${routines.length}개` : '루틴 없음 · 선택 사항'}
        onPress={() => router.push('/routine-edit')}
      />

      <View style={styles.recentBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          최근 운동
        </ThemedText>
        {recentRecords.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyLine}>
            아직 기록이 없어요.
          </ThemedText>
        ) : (
          recentRecords.map((record) => (
            <View key={record.id} style={[styles.recentRow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.recentTitle}>
                {record.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {record.date}
              </ThemedText>
            </View>
          ))
        )}
      </View>

      {routines.length > 0 && (
        <View style={styles.recentBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            루틴 목록
          </ThemedText>
          {routines.map((routine) => (
            <Pressable
              key={routine.id}
              onPress={() => router.push(`/routine-edit?routineId=${routine.id}`)}
              style={[styles.recentRow, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.recentTitle}>
                <ThemedText type="smallBold">{routine.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {routine.exerciseIds.map((id) => getExerciseById(id)?.name ?? id).join(', ')}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <NavRow label="운동 찾기" value="전체 Exercise DB" onPress={() => router.push('/exercise-select')} />

      <PrimaryButton label="+ 새 루틴 만들기" variant="secondary" onPress={() => router.push('/routine-edit')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  recentBlock: {
    gap: Spacing.two,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.medium,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  recentTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyLine: {
    paddingVertical: Spacing.one,
  },
});
