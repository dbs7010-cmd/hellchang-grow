import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getTodayRecords } from '@/data/workout-repository';
import {
  WorkoutCategories,
  WorkoutCategoryLabels,
  WorkoutIntensities,
  WorkoutIntensityLabels,
} from '@/config/workout-labels';
import { StanleyTrainer } from '@/config/trainers';
import { WorkoutCategory, WorkoutIntensity } from '@/types/workout';
import { todayDateString } from '@/utils/date';
import { pickTrainerLine } from '@/utils/trainer-dialogue';

export default function WorkoutScreen() {
  const { workoutRecords, addWorkoutRecord } = useAppData();
  const [category, setCategory] = useState<WorkoutCategory>('strength');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<WorkoutIntensity | null>(null);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trainerReaction, setTrainerReaction] = useState<string | null>(null);

  const todayRecords = getTodayRecords(workoutRecords);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('운동 이름을 입력해주세요.');
      return;
    }

    setError(null);
    await addWorkoutRecord({
      date: todayDateString(),
      category,
      title: title.trim(),
      durationMinutes: duration ? Number(duration) : undefined,
      intensity: intensity ?? undefined,
      memo: memo.trim() || undefined,
      completed: true,
    });

    setTitle('');
    setDuration('');
    setIntensity(null);
    setMemo('');
    setTrainerReaction(pickTrainerLine(StanleyTrainer.dialogueSet.greetingRecordedToday).text);
  };

  return (
    <ScreenScroll>
      <ThemedText type="subtitle">운동 기록</ThemedText>

      <SectionCard title="오늘 뭐 했어요?">
        <View style={styles.chipRow}>
          {WorkoutCategories.map((item) => (
            <Chip
              key={item}
              label={WorkoutCategoryLabels[item]}
              selected={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </View>

        <TextField
          label="운동 이름"
          value={title}
          onChangeText={setTitle}
          placeholder="예: 하체 웨이트, 5km 러닝"
        />
        <TextField
          label="시간 (분, 선택)"
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
          placeholder="예: 40"
        />

        <View style={styles.chipRow}>
          {WorkoutIntensities.map((item) => (
            <Chip
              key={item}
              label={WorkoutIntensityLabels[item]}
              selected={intensity === item}
              onPress={() => setIntensity(intensity === item ? null : item)}
            />
          ))}
        </View>

        <TextField
          label="메모 (선택)"
          value={memo}
          onChangeText={setMemo}
          placeholder="컨디션이나 특이사항"
          multiline
        />

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <PrimaryButton label="기록 추가" onPress={handleSubmit} />

        {trainerReaction && (
          <View style={styles.trainerReaction}>
            <ThemedText type="small" themeColor="textSecondary">
              {StanleyTrainer.portraitPlaceholder} {trainerReaction}
            </ThemedText>
          </View>
        )}
      </SectionCard>

      <SectionCard title="오늘 기록">
        {todayRecords.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아직 오늘 기록이 없어요.
          </ThemedText>
        ) : (
          todayRecords.map((record) => (
            <View key={record.id} style={styles.recordRow}>
              <ThemedText type="smallBold">{record.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {WorkoutCategoryLabels[record.category]}
                {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''}
                {record.intensity ? ` · ${WorkoutIntensityLabels[record.intensity]}` : ''}
              </ThemedText>
            </View>
          ))
        )}
      </SectionCard>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  error: {
    color: '#D64545',
  },
  recordRow: {
    gap: Spacing.half,
  },
  trainerReaction: {
    paddingTop: Spacing.one,
  },
});
