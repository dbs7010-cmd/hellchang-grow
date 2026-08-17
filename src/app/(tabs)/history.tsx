import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { todayDateString } from '@/utils/date';

export default function HistoryScreen() {
  const { bodyHistory, workoutRecords, addBodyHistoryEntry } = useAppData();
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddWeight = async () => {
    const value = Number(weightKg);
    if (!weightKg || Number.isNaN(value) || value <= 0) {
      setError('체중을 숫자로 입력해주세요.');
      return;
    }
    setError(null);
    await addBodyHistoryEntry({ date: todayDateString(), weightKg: value, source: 'manual' });
    setWeightKg('');
  };

  return (
    <ScreenScroll>
      <ThemedText type="subtitle">히스토리</ThemedText>

      <SectionCard title="체중 기록 추가">
        <TextField
          label="오늘 체중 (kg)"
          keyboardType="numeric"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="예: 69.5"
        />
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <PrimaryButton label="기록 추가" onPress={handleAddWeight} />
      </SectionCard>

      <SectionCard title="신체 히스토리">
        {bodyHistory.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아직 기록이 없어요.
          </ThemedText>
        ) : (
          bodyHistory.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <ThemedText type="small">{entry.date}</ThemedText>
              <ThemedText type="smallBold">{entry.weightKg}kg</ThemedText>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="운동 기록">
        {workoutRecords.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아직 운동 기록이 없어요.
          </ThemedText>
        ) : (
          workoutRecords.map((record) => (
            <View key={record.id} style={styles.row}>
              <ThemedText type="small">{record.date}</ThemedText>
              <ThemedText type="smallBold">{record.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {WorkoutCategoryLabels[record.category]}
              </ThemedText>
            </View>
          ))
        )}
      </SectionCard>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#D64545',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
