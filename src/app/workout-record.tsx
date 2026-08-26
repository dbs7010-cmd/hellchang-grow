import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Section } from '@/components/ui/section';
import { SubScreen } from '@/components/ui/sub-screen';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { formatVolumeKg } from '@/utils/workout-stats';
import { buildWorkoutRecordDetail } from '@/utils/workout-record-detail';

/**
 * 운동 기록 상세.
 *
 * 결과 화면을 닫으면 내가 무엇을 얼마나 들었는지 다시 볼 곳이 없었다 — 홈의 [오늘 운동
 * 기록], 히스토리의 기록 줄, 운동 탭의 최근 운동이 전부 한 줄 요약에서 끝났다.
 * **세 곳이 모두 이 화면 하나로 온다.** 상세 화면을 세 개 만들지 않는다.
 *
 * 여기서 계산하는 것은 없다. 저장된 기록을 순수 함수(`buildWorkoutRecordDetail`)에 넘겨
 * 읽을 모양으로 바꾸고 그리기만 한다 — 없는 값은 지어내지 않는다.
 */
export default function WorkoutRecordScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workoutRecords } = useAppData();

  const record = useMemo(
    () => (id ? workoutRecords.find((candidate) => candidate.id === id) : undefined),
    [id, workoutRecords]
  );
  const detail = useMemo(() => (record ? buildWorkoutRecordDetail(record) : null), [record]);

  if (!record || !detail) {
    return (
      <SubScreen title="운동 기록">
        <ThemedText type="small" themeColor="textSecondary">
          이 기록을 찾을 수 없어요. 삭제됐거나 다른 기기에서 만든 기록일 수 있어요.
        </ThemedText>
      </SubScreen>
    );
  }

  return (
    <SubScreen title="운동 기록">
      <View style={styles.header}>
        <ThemedText type="caption" themeColor="textSecondary">
          {detail.date} · {WorkoutCategoryLabels[record.category]}
          {detail.durationMinutes ? ` · ${detail.durationMinutes}분` : ''}
        </ThemedText>
        <ThemedText type="heading">{detail.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          운동 {detail.totals.exercises}개 · {detail.totals.sets}세트
          {detail.totals.volumeKg > 0 ? ` · 총 볼륨 ${formatVolumeKg(detail.totals.volumeKg)}` : ''}
        </ThemedText>
      </View>

      {detail.emptyLine ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detail.emptyLine}
        </ThemedText>
      ) : (
        <Section title="종목별 기록">
          {detail.exercises.map((exercise) => (
            <ThemedView
              key={exercise.id}
              type="backgroundElement"
              style={[styles.exercise, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">{exercise.name}</ThemedText>

              {exercise.sets.map((set) => (
                <View key={set.order} style={styles.setRow}>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.setOrder}>
                    {set.order}세트
                  </ThemedText>
                  <ThemedText type="small" style={styles.setValue}>
                    {set.weightKg ?? '-'}kg × {set.reps ?? '-'}회
                  </ThemedText>
                </View>
              ))}

              {/* 세트 상세가 없는 옛 기록. 없는 세트를 만들어 내지 않고 남아 있는 요약만 말한다. */}
              {exercise.legacySummary && (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {exercise.legacySummary}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    세트별 상세가 없는 이전 기록이에요.
                  </ThemedText>
                </>
              )}
            </ThemedView>
          ))}
        </Section>
      )}

      {detail.memo && (
        <Section title="메모">
          <ThemedText type="small" themeColor="textSecondary">
            {detail.memo}
          </ThemedText>
        </Section>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.half,
  },
  exercise: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  setOrder: {
    width: 48,
  },
  setValue: {
    fontVariant: ['tabular-nums'],
  },
});
