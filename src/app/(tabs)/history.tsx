import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CharacterSilhouette } from '@/components/character/character-silhouette';
import { CharacterViewer } from '@/components/character/character-viewer';
import { ThemedText } from '@/components/themed-text';
import { BarChart } from '@/components/ui/bar-chart';
import { Chip } from '@/components/ui/chip';
import { PhotoSlot } from '@/components/ui/photo-slot';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { CompactStat, StatRow } from '@/components/ui/stat-row';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { StanleyTrainer } from '@/config/trainers';
import {
  WorkoutCategories,
  WorkoutCategoryLabels,
  WorkoutIntensities,
  WorkoutIntensityLabels,
} from '@/config/workout-labels';
import { Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisMonthRecords, getThisWeekRecords, getThisYearRecords } from '@/data/workout-repository';
import { useTheme } from '@/hooks/use-theme';
import { WorkoutCategory, WorkoutIntensity, WorkoutRecord } from '@/types/workout';
import { toDateString, todayDateString } from '@/utils/date';
import { countPeriodPRs } from '@/utils/exercise-history';
import { buildHistoryDays } from '@/utils/history';
import { pickTrainerLine } from '@/utils/trainer-dialogue';

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
type Period = 'week' | 'month' | 'year';

/** 완료된 세트(무게×횟수)만 합산한다 — 세션 화면의 computeTotalVolumeKg와 같은 규칙. */
function sumVolumeKg(records: WorkoutRecord[]): number {
  return records.reduce((total, record) => {
    const recordVolume = (record.exercises ?? []).reduce((sum, exercise) => {
      const sets = exercise.setDetails;
      if (sets) {
        return (
          sum +
          sets.reduce(
            (setSum, set) =>
              set.completed && set.weightKg !== undefined && set.reps !== undefined
                ? setSum + set.weightKg * set.reps
                : setSum,
            0
          )
        );
      }
      if (exercise.weightKg !== undefined && exercise.reps !== undefined && exercise.sets) {
        return sum + exercise.weightKg * exercise.reps * exercise.sets;
      }
      return sum;
    }, 0);
    return total + recordVolume;
  }, 0);
}

/** 지난 7일간 일별 볼륨 — 새 차트 라이브러리 없이 BarChart로 그린다. */
function buildLast7DaysVolume(records: WorkoutRecord[]): { label: string; value: number }[] {
  const today = new Date();
  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = toDateString(date);
    const dayRecords = records.filter((record) => record.date === dateStr);
    days.push({ label: WEEKDAY_SHORT[date.getDay()], value: sumVolumeKg(dayRecords) });
  }
  return days;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const {
    profile,
    bodyHistory,
    workoutRecords,
    addBodyHistoryEntry,
    addWorkoutRecord,
    deleteWorkoutRecord,
    canAddPhotoToday,
    nextPhotoAvailableDate,
  } = useAppData();

  const [period, setPeriod] = useState<Period>('week');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [compareDateA, setCompareDateA] = useState<string | null>(null);
  const [compareDateB, setCompareDateB] = useState<string | null>(null);
  const [addEntryOpen, setAddEntryOpen] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualCategory, setManualCategory] = useState<WorkoutCategory>('strength');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualIntensity, setManualIntensity] = useState<WorkoutIntensity | null>(null);
  const [manualMemo, setManualMemo] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualReaction, setManualReaction] = useState<string | null>(null);
  const [fullListOpen, setFullListOpen] = useState(false);

  const periodRecords = useMemo(() => {
    if (period === 'month') return getThisMonthRecords(workoutRecords);
    if (period === 'year') return getThisYearRecords(workoutRecords);
    return getThisWeekRecords(workoutRecords);
  }, [period, workoutRecords]);

  // 과거 stale-session 버그로 생긴 비정상 기록(예: 1217분)이 통계를 왜곡하지 않도록 뺀다.
  const cleanPeriodRecords = useMemo(
    () => periodRecords.filter((r) => (r.durationMinutes ?? 0) <= AppConfig.suspiciousDurationMinutes),
    [periodRecords]
  );
  const periodMinutes = cleanPeriodRecords.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);
  const periodVolumeKg = useMemo(() => sumVolumeKg(cleanPeriodRecords), [cleanPeriodRecords]);
  const periodPRs = useMemo(
    () => countPeriodPRs(cleanPeriodRecords, workoutRecords),
    [cleanPeriodRecords, workoutRecords]
  );
  const chartData = useMemo(() => buildLast7DaysVolume(workoutRecords), [workoutRecords]);

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

  const handleAddManualRecord = async () => {
    if (!manualTitle.trim()) {
      setManualError('운동 이름을 입력해주세요.');
      return;
    }
    setManualError(null);
    await addWorkoutRecord({
      date: todayDateString(),
      category: manualCategory,
      title: manualTitle.trim(),
      durationMinutes: manualDuration ? Number(manualDuration) : undefined,
      intensity: manualIntensity ?? undefined,
      memo: manualMemo.trim() || undefined,
      completed: true,
    });
    setManualTitle('');
    setManualDuration('');
    setManualIntensity(null);
    setManualMemo('');
    setManualReaction(pickTrainerLine(StanleyTrainer.dialogueSet.greetingRecordedToday).text);
  };

  const latestBody = bodyHistory[0];
  const dayA = historyDays.find((day) => day.date === compareDateA);
  const dayB = historyDays.find((day) => day.date === compareDateB);
  const weightDiff =
    dayA?.bodyEntry && dayB?.bodyEntry ? dayA.bodyEntry.weightKg - dayB.bodyEntry.weightKg : null;

  return (
    <ScreenScroll>
      <ThemedText type="heading">히스토리</ThemedText>

      <View style={styles.chipRow}>
        <Chip label="주" selected={period === 'week'} onPress={() => setPeriod('week')} />
        <Chip label="월" selected={period === 'month'} onPress={() => setPeriod('month')} />
        <Chip label="연" selected={period === 'year'} onPress={() => setPeriod('year')} />
      </View>

      <SectionCard>
        <StatRow>
          <CompactStat label="운동 횟수" value={`${cleanPeriodRecords.length}회`} emphasize />
          <CompactStat label="총 볼륨" value={`${Math.round(periodVolumeKg)}kg`} emphasize />
          <CompactStat label="운동 시간" value={`${periodMinutes}분`} />
          {periodPRs > 0 && <CompactStat label="PR" value={`${periodPRs}개 NEW`} emphasize />}
        </StatRow>
        <BarChart items={chartData} />
      </SectionCard>

      {profile && (
        <SectionCard title="BODY">
          <StatRow>
            {(latestBody?.weightKg ?? profile.weightKg) !== undefined && (
              <CompactStat label="체중" value={`${latestBody?.weightKg ?? profile.weightKg}kg`} emphasize />
            )}
            {latestBody?.bodyFatPercent !== undefined && (
              <CompactStat label="체지방률" value={`${latestBody.bodyFatPercent}%`} />
            )}
          </StatRow>

          <View style={styles.characterRow}>
            <View style={styles.characterPreview}>
              <CharacterSilhouette
                genderExpression={profile.genderExpression}
                size={profile.bodyParameters.size}
                tone={profile.bodyParameters.tone}
                idle={false}
                scale={0.3}
              />
            </View>
            <PrimaryButton label="360도 보기" variant="secondary" onPress={() => setViewerOpen(true)} />
          </View>

          {comparableDates.length < 2 ? (
            <ThemedText type="small" themeColor="textSecondary">
              체중 기록이 2개 이상 쌓이면 사진 전후 비교를 볼 수 있어요.
            </ThemedText>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                비교할 두 날짜
              </ThemedText>
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
      )}

      {addEntryOpen ? (
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
              오늘 사진 업데이트는 이미 사용했어요. 다음 업데이트는 {nextPhotoAvailableDate}부터 가능해요.
            </ThemedText>
          )}
          {error && (
            <ThemedText type="small" style={{ color: theme.mutedRed }}>
              {error}
            </ThemedText>
          )}
          <PrimaryButton label="기록 추가" onPress={handleAddEntry} />
        </SectionCard>
      ) : (
        <PrimaryButton label="오늘 체중/사진 기록 추가" variant="secondary" onPress={() => setAddEntryOpen(true)} />
      )}

      {manualOpen ? (
        <SectionCard title="놓친 운동 기록 수동으로 추가">
          <ThemedText type="small" themeColor="textSecondary">
            실시간 세션 없이 이미 끝난 운동을 나중에 기록할 때만 사용해요. 홈의 [운동 시작]을 쓰면 이
            입력 없이 자동으로 기록돼요.
          </ThemedText>
          <View style={styles.chipRow}>
            {WorkoutCategories.map((item) => (
              <Chip
                key={item}
                label={WorkoutCategoryLabels[item]}
                selected={manualCategory === item}
                onPress={() => setManualCategory(item)}
              />
            ))}
          </View>
          <TextField
            label="운동 이름"
            value={manualTitle}
            onChangeText={setManualTitle}
            placeholder="예: 하체 웨이트, 5km 러닝"
          />
          <TextField
            label="시간 (분, 선택)"
            keyboardType="numeric"
            value={manualDuration}
            onChangeText={setManualDuration}
            placeholder="예: 40"
          />
          <View style={styles.chipRow}>
            {WorkoutIntensities.map((item) => (
              <Chip
                key={item}
                label={WorkoutIntensityLabels[item]}
                selected={manualIntensity === item}
                onPress={() => setManualIntensity(manualIntensity === item ? null : item)}
              />
            ))}
          </View>
          <TextField
            label="메모 (선택)"
            value={manualMemo}
            onChangeText={setManualMemo}
            placeholder="컨디션이나 특이사항"
            multiline
          />
          {manualError && (
            <ThemedText type="small" style={{ color: theme.mutedRed }}>
              {manualError}
            </ThemedText>
          )}
          <PrimaryButton label="기록 추가" variant="secondary" onPress={handleAddManualRecord} />
          {manualReaction && (
            <ThemedText type="small" themeColor="textSecondary">
              {StanleyTrainer.portraitPlaceholder} {manualReaction}
            </ThemedText>
          )}
        </SectionCard>
      ) : (
        <PrimaryButton label="놓친 운동 기록 추가" variant="secondary" onPress={() => setManualOpen(true)} />
      )}

      <Pressable onPress={() => setFullListOpen((v) => !v)} style={styles.fullListToggle}>
        <ThemedText type="small" style={{ color: theme.gold }}>
          {fullListOpen ? '전체 기록 접기' : '전체 기록 보기'} {fullListOpen ? '︿' : '﹀'}
        </ThemedText>
      </Pressable>

      {fullListOpen && (
        <SectionCard>
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
                {day.workouts.map((record) => {
                  const setCount =
                    record.exercises?.reduce((sum, exercise) => sum + (exercise.sets ?? 0), 0) ?? 0;
                  const suspicious = (record.durationMinutes ?? 0) > AppConfig.suspiciousDurationMinutes;
                  return (
                    <View key={record.id} style={styles.recordRow}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.recordText}>
                        · {record.title} ({WorkoutCategoryLabels[record.category]})
                        {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''}
                        {record.exercises && record.exercises.length > 0
                          ? ` · 운동 ${record.exercises.length}개 · ${setCount}세트`
                          : ''}
                      </ThemedText>
                      {suspicious && (
                        <Pressable onPress={() => deleteWorkoutRecord(record.id)} hitSlop={8}>
                          <ThemedText type="small" style={[styles.suspiciousTag, { color: theme.mutedRed }]}>
                            ⚠ 비정상 기록 · 삭제
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </SectionCard>
      )}

      {profile && (
        <CharacterViewer
          visible={viewerOpen}
          onClose={() => setViewerOpen(false)}
          genderExpression={profile.genderExpression}
          size={profile.bodyParameters.size}
          tone={profile.bodyParameters.tone}
        />
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  characterPreview: {
    width: 90,
    height: 110,
    overflow: 'hidden',
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
  fullListToggle: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  dayRow: {
    gap: Spacing.half,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordRow: {
    gap: Spacing.half,
  },
  recordText: {
    flex: 1,
  },
  suspiciousTag: {
    fontWeight: '700',
  },
});
