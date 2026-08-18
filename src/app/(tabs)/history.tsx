import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CharacterIntrinsicHeight, CharacterSilhouette } from '@/components/character/character-silhouette';
import { CharacterViewer } from '@/components/character/character-viewer';
import { ThemedText } from '@/components/themed-text';
import { BarChart } from '@/components/ui/bar-chart';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { MetricGrid, MetricTile } from '@/components/ui/metric-tile';
import { PhotoSlot } from '@/components/ui/photo-slot';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { StanleyTrainer } from '@/config/trainers';
import {
  WorkoutCategories,
  WorkoutCategoryLabels,
  WorkoutIntensities,
  WorkoutIntensityLabels,
} from '@/config/workout-labels';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getThisMonthRecords, getThisWeekRecords, getThisYearRecords } from '@/data/workout-repository';
import { useTheme } from '@/hooks/use-theme';
import { WorkoutCategory, WorkoutIntensity } from '@/types/workout';
import { todayDateString } from '@/utils/date';
import { countPeriodPRs } from '@/utils/exercise-history';
import { buildHistoryDays } from '@/utils/history';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import { buildPeriodChart, formatVolumeKg, sumVolumeKg } from '@/utils/workout-stats';

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = { week: '주', month: '월', year: '연' };
const BODY_PREVIEW_HEIGHT = 96;

/** 부호를 항상 붙인 변화량 표기. 감소만 성공처럼 보이지 않게 색으로 평가하지 않는다. */
function formatDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return `변화 없음`;
  return `${rounded > 0 ? '+' : ''}${rounded}${unit}`;
}

/**
 * 07 HISTORY + 08 BODY GROWTH.
 *
 * HISTORY는 "얼마나 했나"(DATA), BODY GROWTH는 "몸이 어떻게 변하고 있나"를 본다.
 * 두 블록 모두 세로로 긴 라벨-값 목록 대신 2열 metric 그리드를 쓴다.
 *
 * BODY GROWTH는 체중계가 아니다 — 체중/체지방률 옆에 같은 기간의 총 볼륨과 PR을 나란히 둬서,
 * "체중이 줄어야만 성장"이 아니라 "체중 유지 + 수행 향상"도 성장으로 읽히게 한다.
 * (FAT CUT / STRENGTH UP / Body Growth 도메인이 생기면 이 블록에 그대로 붙인다 —
 *  아직 없는 수치를 지어내지 않는다.)
 */
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
  const [compareOpen, setCompareOpen] = useState(false);
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
  const chartData = useMemo(() => buildPeriodChart(workoutRecords, period), [workoutRecords, period]);

  const historyDays = useMemo(
    () => buildHistoryDays(bodyHistory, workoutRecords),
    [bodyHistory, workoutRecords]
  );
  // "사진 비교"는 사진이 2장 이상 있을 때만 의미가 있다 — 체중만 있는 날짜는 비교 대상이 아니다.
  const photoDates = useMemo(
    () => historyDays.filter((day) => day.hasPhoto).map((day) => day.date),
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
    setAddEntryOpen(false);
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
  const previousBody = bodyHistory[1];
  const currentWeightKg = latestBody?.weightKg ?? profile?.weightKg;
  const weightDeltaNote =
    latestBody && previousBody ? `지난 기록 ${formatDelta(latestBody.weightKg - previousBody.weightKg, 'kg')}` : undefined;
  const fatDeltaNote =
    latestBody?.bodyFatPercent !== undefined && previousBody?.bodyFatPercent !== undefined
      ? `지난 기록 ${formatDelta(latestBody.bodyFatPercent - previousBody.bodyFatPercent, '%')}`
      : undefined;

  const dayA = historyDays.find((day) => day.date === compareDateA);
  const dayB = historyDays.find((day) => day.date === compareDateB);
  const compareWeightDiff =
    dayA?.bodyEntry && dayB?.bodyEntry ? dayA.bodyEntry.weightKg - dayB.bodyEntry.weightKg : null;

  return (
    <ScreenScroll>
      <ThemedText type="heading">히스토리</ThemedText>

      <Section>
        <ChipRow>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((item) => (
            <Chip
              key={item}
              label={PERIOD_LABELS[item]}
              selected={period === item}
              onPress={() => setPeriod(item)}
            />
          ))}
        </ChipRow>

        <MetricGrid>
          <MetricTile label="운동 횟수" value={`${cleanPeriodRecords.length}회`} />
          <MetricTile label="운동 시간" value={`${periodMinutes}분`} />
          <MetricTile label="총 볼륨" value={formatVolumeKg(periodVolumeKg)} />
          <MetricTile label="PR" value={periodPRs > 0 ? `${periodPRs}개` : '-'} accent={periodPRs > 0} />
        </MetricGrid>

        <BarChart items={chartData} height={72} />
      </Section>

      {profile && (
        <Section title="BODY GROWTH">
          <ThemedText type="caption" themeColor="textSecondary">
            체중만 보는 화면이 아니에요. 같은 기간의 볼륨·PR과 함께 봐야 몸이 어떻게 변하는지 보여요.
          </ThemedText>

          <MetricGrid>
            {currentWeightKg !== undefined && (
              <MetricTile label="체중" value={`${currentWeightKg}kg`} note={weightDeltaNote} />
            )}
            {latestBody?.bodyFatPercent !== undefined && (
              <MetricTile label="체지방률" value={`${latestBody.bodyFatPercent}%`} note={fatDeltaNote} />
            )}
          </MetricGrid>

          <View style={styles.bodyRow}>
            <View style={[styles.characterPreview, { backgroundColor: theme.backgroundElement }]}>
              <CharacterSilhouette
                genderExpression={profile.genderExpression}
                size={profile.bodyParameters.size}
                tone={profile.bodyParameters.tone}
                idle={false}
                scale={BODY_PREVIEW_HEIGHT / CharacterIntrinsicHeight}
              />
            </View>
            <View style={styles.bodyActions}>
              <PrimaryButton label="360도 보기" variant="secondary" onPress={() => setViewerOpen(true)} />
              {photoDates.length >= 2 ? (
                <PrimaryButton
                  label={compareOpen ? '사진 비교 닫기' : `사진 비교 (${photoDates.length}장)`}
                  variant="secondary"
                  onPress={() => setCompareOpen((v) => !v)}
                />
              ) : (
                <ThemedText type="caption" themeColor="textSecondary">
                  사진이 2장 이상 쌓이면 전후 비교를 볼 수 있어요.
                </ThemedText>
              )}
            </View>
          </View>

          {compareOpen && photoDates.length >= 2 && (
            <View style={styles.compareBlock}>
              <ThemedText type="caption" themeColor="textSecondary">
                비교할 두 날짜
              </ThemedText>
              <ChipRow>
                {photoDates.map((date) => (
                  <Chip
                    key={`a-${date}`}
                    label={date}
                    selected={compareDateA === date}
                    onPress={() => setCompareDateA(date)}
                  />
                ))}
              </ChipRow>
              <ChipRow>
                {photoDates.map((date) => (
                  <Chip
                    key={`b-${date}`}
                    label={date}
                    selected={compareDateB === date}
                    onPress={() => setCompareDateB(date)}
                  />
                ))}
              </ChipRow>

              {dayA && dayB && (
                <View style={styles.compareResult}>
                  <View style={styles.compareRow}>
                    <PhotoSlot label={dayA.date} photoUri={dayA.bodyEntry?.photoReference} />
                    <PhotoSlot label={dayB.date} photoUri={dayB.bodyEntry?.photoReference} />
                  </View>
                  {compareWeightDiff !== null && (
                    <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
                      체중 {formatDelta(compareWeightDiff, 'kg')}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          )}
        </Section>
      )}

      {addEntryOpen ? (
        <Section title="오늘 체중/사진 기록">
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
            <ThemedText type="caption" themeColor="textSecondary">
              오늘 사진 업데이트는 이미 사용했어요. 다음 업데이트는 {nextPhotoAvailableDate}부터 가능해요.
            </ThemedText>
          )}
          {error && (
            <ThemedText type="small" style={{ color: theme.mutedRed }}>
              {error}
            </ThemedText>
          )}
          <View style={styles.inlineRow}>
            <PrimaryButton
              label="취소"
              variant="secondary"
              style={styles.flexItem}
              onPress={() => setAddEntryOpen(false)}
            />
            <PrimaryButton label="기록 추가" style={styles.flexItem} onPress={handleAddEntry} />
          </View>
        </Section>
      ) : (
        <PrimaryButton
          label="오늘 체중/사진 기록 추가"
          variant="secondary"
          onPress={() => setAddEntryOpen(true)}
        />
      )}

      {manualOpen ? (
        <Section title="놓친 운동 기록 추가">
          <ThemedText type="caption" themeColor="textSecondary">
            실시간 세션 없이 이미 끝난 운동을 나중에 기록할 때만 써요. 홈의 [운동 시작]을 쓰면 이 입력
            없이 자동으로 기록돼요.
          </ThemedText>
          <ChipRow>
            {WorkoutCategories.map((item) => (
              <Chip
                key={item}
                label={WorkoutCategoryLabels[item]}
                selected={manualCategory === item}
                onPress={() => setManualCategory(item)}
              />
            ))}
          </ChipRow>
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
          <ChipRow>
            {WorkoutIntensities.map((item) => (
              <Chip
                key={item}
                label={WorkoutIntensityLabels[item]}
                selected={manualIntensity === item}
                onPress={() => setManualIntensity(manualIntensity === item ? null : item)}
              />
            ))}
          </ChipRow>
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
          <View style={styles.inlineRow}>
            <PrimaryButton
              label="닫기"
              variant="secondary"
              style={styles.flexItem}
              onPress={() => setManualOpen(false)}
            />
            <PrimaryButton label="기록 추가" style={styles.flexItem} onPress={handleAddManualRecord} />
          </View>
          {manualReaction && (
            <ThemedText type="caption" themeColor="textSecondary">
              {StanleyTrainer.portraitPlaceholder} {manualReaction}
            </ThemedText>
          )}
        </Section>
      ) : (
        <PrimaryButton label="놓친 운동 기록 추가" variant="secondary" onPress={() => setManualOpen(true)} />
      )}

      <Pressable onPress={() => setFullListOpen((v) => !v)} style={styles.fullListToggle} hitSlop={8}>
        <ThemedText type="captionBold" style={{ color: theme.gold }}>
          {fullListOpen ? '전체 기록 접기 ︿' : '전체 기록 보기 ﹀'}
        </ThemedText>
      </Pressable>

      {fullListOpen && (
        <Section>
          {historyDays.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              아직 기록이 없어요.
            </ThemedText>
          ) : (
            historyDays.map((day) => (
              <View key={day.date} style={[styles.dayRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.dayHeader}>
                  <ThemedText type="smallBold">{day.date}</ThemedText>
                  {day.bodyEntry && (
                    <ThemedText type="caption" themeColor="textSecondary">
                      {day.bodyEntry.weightKg}kg{day.hasPhoto ? ' · 📷' : ''}
                    </ThemedText>
                  )}
                </View>
                {day.workouts.map((record) => {
                  const setCount =
                    record.exercises?.reduce((sum, exercise) => sum + (exercise.sets ?? 0), 0) ?? 0;
                  const suspicious = (record.durationMinutes ?? 0) > AppConfig.suspiciousDurationMinutes;
                  return (
                    <View key={record.id}>
                      <ThemedText type="caption" themeColor="textSecondary">
                        · {record.title} ({WorkoutCategoryLabels[record.category]})
                        {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''}
                        {record.exercises && record.exercises.length > 0
                          ? ` · 운동 ${record.exercises.length}개 · ${setCount}세트`
                          : ''}
                      </ThemedText>
                      {suspicious && (
                        <Pressable onPress={() => deleteWorkoutRecord(record.id)} hitSlop={8}>
                          <ThemedText type="captionBold" style={{ color: theme.mutedRed }}>
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
        </Section>
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
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  characterPreview: {
    width: 80,
    height: BODY_PREVIEW_HEIGHT,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  bodyActions: {
    flex: 1,
    gap: Spacing.two,
  },
  compareBlock: {
    gap: Spacing.two,
  },
  compareResult: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  compareRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  photoPreviewRow: {
    flexDirection: 'row',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flexItem: {
    flex: 1,
  },
  fullListToggle: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  dayRow: {
    gap: Spacing.half,
    borderRadius: Radius.medium,
    padding: Spacing.two,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
