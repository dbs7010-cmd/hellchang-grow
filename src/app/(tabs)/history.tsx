import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PhotoSlot } from '@/components/ui/photo-slot';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { todayDateString } from '@/utils/date';
import { buildHistoryDays } from '@/utils/history';

export default function HistoryScreen() {
  const { bodyHistory, workoutRecords, addBodyHistoryEntry, canAddPhotoToday, nextPhotoAvailableDate } =
    useAppData();
  const [weightKg, setWeightKg] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [compareDateA, setCompareDateA] = useState<string | null>(null);
  const [compareDateB, setCompareDateB] = useState<string | null>(null);

  const historyDays = useMemo(
    () => buildHistoryDays(bodyHistory, workoutRecords),
    [bodyHistory, workoutRecords]
  );
  const comparableDates = useMemo(
    () => historyDays.filter((day) => day.bodyEntry).map((day) => day.date),
    [historyDays]
  );

  const handlePickPhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('사진 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    setPhotoUri(result.assets[0].uri);
  };

  const handleAddEntry = async () => {
    const value = Number(weightKg);
    if (!weightKg || Number.isNaN(value) || value <= 0) {
      setError('체중을 숫자로 입력해주세요.');
      return;
    }
    setError(null);
    await addBodyHistoryEntry({
      date: todayDateString(),
      weightKg: value,
      source: photoUri ? 'photo' : 'manual',
      photoReference: photoUri,
    });
    setWeightKg('');
    setPhotoUri(undefined);
  };

  const dayA = historyDays.find((day) => day.date === compareDateA);
  const dayB = historyDays.find((day) => day.date === compareDateB);
  const weightDiff =
    dayA?.bodyEntry && dayB?.bodyEntry ? dayA.bodyEntry.weightKg - dayB.bodyEntry.weightKg : null;

  return (
    <ScreenScroll>
      <ThemedText type="subtitle">히스토리</ThemedText>

      <SectionCard title="오늘 기록 추가">
        <TextField
          label="오늘 체중 (kg)"
          keyboardType="numeric"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="예: 69.5"
        />

        {photoUri ? (
          <View style={styles.photoPreviewRow}>
            <PhotoSlot label="이번 사진" photoUri={photoUri} />
          </View>
        ) : canAddPhotoToday ? (
          <PrimaryButton label="사진 추가 (선택)" variant="secondary" onPress={handlePickPhoto} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            오늘 사진 업데이트는 이미 사용했어요. 다음 업데이트는 {nextPhotoAvailableDate}부터
            가능해요.
          </ThemedText>
        )}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <PrimaryButton label="기록 추가" onPress={handleAddEntry} />
      </SectionCard>

      <SectionCard title="전후 비교">
        {comparableDates.length < 2 ? (
          <ThemedText type="small" themeColor="textSecondary">
            체중 기록이 2개 이상 쌓이면 두 날짜를 비교할 수 있어요.
          </ThemedText>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              비교할 두 날짜를 골라주세요.
            </ThemedText>
            <ThemedText type="small">A 날짜</ThemedText>
            <View style={styles.chipRow}>
              {comparableDates.map((date) => (
                <Chip
                  key={`a-${date}`}
                  label={date}
                  selected={compareDateA === date}
                  onPress={() => setCompareDateA(date)}
                />
              ))}
            </View>
            <ThemedText type="small">B 날짜</ThemedText>
            <View style={styles.chipRow}>
              {comparableDates.map((date) => (
                <Chip
                  key={`b-${date}`}
                  label={date}
                  selected={compareDateB === date}
                  onPress={() => setCompareDateB(date)}
                />
              ))}
            </View>

            {dayA && dayB && (
              <View style={styles.compareResult}>
                <ThemedText type="smallBold" style={styles.compareVs}>
                  {dayA.date} VS {dayB.date}
                </ThemedText>
                <View style={styles.compareRow}>
                  <PhotoSlot label={dayA.date} photoUri={dayA.bodyEntry?.photoReference} />
                  <PhotoSlot label={dayB.date} photoUri={dayB.bodyEntry?.photoReference} />
                </View>
                {weightDiff !== null && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.compareVs}>
                    체중 차이: {weightDiff > 0 ? '+' : ''}
                    {weightDiff.toFixed(1)}kg
                  </ThemedText>
                )}
              </View>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="전체 히스토리">
        {historyDays.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아직 기록이 없어요.
          </ThemedText>
        ) : (
          historyDays.map((day) => (
            <View key={day.date} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <ThemedText type="smallBold">{day.date}</ThemedText>
                {day.bodyEntry && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {day.bodyEntry.weightKg}kg{day.hasPhoto ? ' · 📷' : ''}
                  </ThemedText>
                )}
              </View>
              {day.workouts.map((record) => (
                <ThemedText key={record.id} type="small" themeColor="textSecondary">
                  · {record.title} ({WorkoutCategoryLabels[record.category]})
                </ThemedText>
              ))}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photoPreviewRow: {
    flexDirection: 'row',
  },
  compareResult: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  compareVs: {
    textAlign: 'center',
  },
  compareRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dayRow: {
    gap: Spacing.half,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
