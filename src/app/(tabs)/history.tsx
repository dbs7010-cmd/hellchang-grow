import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlayerCharacter } from '@/components/character/player-character';
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
import { BodyGoalLabels } from '@/config/body-goals';
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
import {
  buildLearningBoard,
  learnedFamilyCount,
  seenFamilyCount,
} from '@/utils/danbaek-learning-presence';
import { buildRecommendationContext } from '@/utils/recommendation-context';
import { pickTrainerLine } from '@/utils/trainer-dialogue';
import {
  buildPeriodChart,
  countCompletedExercises,
  countCompletedSets,
  formatVolumeKg,
  sumVolumeKg,
} from '@/utils/workout-stats';

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = { week: '주', month: '월', year: '연' };
const BODY_PREVIEW_HEIGHT = 96;
/** 값이 없을 때 쓰는 표기. 0을 대신 보여주지 않는다. */
const EMPTY = '-';

/** 부호를 항상 붙인 변화량 표기. 감소만 성공처럼 보이지 않게 색으로 평가하지 않는다. */
function formatDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '변화 없음';
  return `${rounded > 0 ? '+' : ''}${rounded}${unit}`;
}

/**
 * 07 HISTORY.
 *
 * 한 화면에 두 가지 이야기가 있다: "얼마나 했나"(운동 기록)와 "몸이 어떻게 변하고 있나"(몸 변화).
 * 서로 다른 서비스처럼 보이지 않도록 같은 MetricGrid / Section 문법으로 통일하고,
 * 몸 변화는 설명 문단 대신 사용자의 운동 목표 한 줄로만 맥락을 준다.
 *
 * 실제 값이 없는 지표(볼륨을 계산할 세트 기록이 없거나, 골격근량을 입력한 적이 없는 경우)는
 * 0으로 표시하지 않고 '-'로 둔다 — 없는 데이터를 있는 것처럼 보이게 하지 않는다.
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
    characterAppearance,
    danbaekLearning,
  } = useAppData();

  const [period, setPeriod] = useState<Period>('week');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [skeletalMuscleKg, setSkeletalMuscleKg] = useState('');
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
  const chartHasData = chartData.some((point) => point.value > 0);

  const historyDays = useMemo(
    () => buildHistoryDays(bodyHistory, workoutRecords),
    [bodyHistory, workoutRecords]
  );
  // "사진 비교"는 사진이 2장 이상 있을 때만 의미가 있다 — 체중만 있는 날짜는 비교 대상이 아니다.
  const photoDates = useMemo(
    () => historyDays.filter((day) => day.hasPhoto).map((day) => day.date),
    [historyDays]
  );

  /*
   * 단백이가 이 기록에서 무엇을 배웠는지. 계산은 어댑터가 이미 했고 여기서는 옮겨 적기만
   * 한다 — 없는 성장 수치를 만들지 않는다.
   */
  const learningBoard = useMemo(() => buildLearningBoard(danbaekLearning), [danbaekLearning]);
  const learningEvidenceLine = useMemo(() => {
    const seen = seenFamilyCount(danbaekLearning);
    if (seen === 0) return '아직 단백이가 본 동작이 없어요. 운동을 기록하면 여기에 쌓여요.';
    const learned = learnedFamilyCount(danbaekLearning);
    const learnedPart = learned > 0 ? ` 그중 ${learned}가지는 배웠어요.` : '';
    return `이 기록으로 단백이가 ${seen}가지 동작을 지켜봤어요.${learnedPart}`;
  }, [danbaekLearning]);

  const recommendationContext = useMemo(
    () => buildRecommendationContext(profile, bodyHistory, workoutRecords),
    [profile, bodyHistory, workoutRecords]
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

  /** 빈 문자열/잘못된 값은 저장하지 않는다 — 0으로 채워 넣지 않는다. */
  const parseOptionalNumber = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isFinite(value) && value > 0 ? value : undefined;
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
      bodyFatPercent: parseOptionalNumber(bodyFatPercent),
      skeletalMuscleKg: parseOptionalNumber(skeletalMuscleKg),
      source: photoUri ? 'photo' : 'manual',
      photoReference: photoUri,
    });
    setWeightKg('');
    setBodyFatPercent('');
    setSkeletalMuscleKg('');
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
  const deltaNote = (
    current: number | undefined,
    previous: number | undefined,
    unit: string
  ): string | undefined =>
    current !== undefined && previous !== undefined
      ? `지난 기록 ${formatDelta(current - previous, unit)}`
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
          <MetricTile
            label="운동 횟수"
            value={cleanPeriodRecords.length > 0 ? `${cleanPeriodRecords.length}회` : EMPTY}
          />
          <MetricTile label="운동 시간" value={periodMinutes > 0 ? `${periodMinutes}분` : EMPTY} />
          <MetricTile
            label="총 볼륨"
            value={periodVolumeKg > 0 ? formatVolumeKg(periodVolumeKg) : EMPTY}
            note={periodVolumeKg > 0 ? undefined : '세트 기록이 있는 운동만 합산돼요'}
          />
          <MetricTile label="PR" value={periodPRs > 0 ? `${periodPRs}개` : EMPTY} accent={periodPRs > 0} />
        </MetricGrid>

        {chartHasData ? (
          <BarChart items={chartData} height={72} />
        ) : (
          <ThemedText type="caption" themeColor="textSecondary">
            이 기간에는 볼륨으로 계산할 세트 기록이 없어요.
          </ThemedText>
        )}
      </Section>

      {/*
        이 화면의 숫자는 통계로 끝나지 않는다 — **이 기록이 단백이가 배운 근거**다.
        과장하지 않기 위해 여기서 새로 계산하는 값은 없다: 학습 스냅샷이 이미 아는 사실
        (몇 가지를 봤고, 어디까지 배웠고, 무엇을 몇 번 봤는지)만 옮겨 적는다.
      */}
      <Section title="단백이가 배운 근거">
        <ThemedText type="caption" themeColor="textSecondary">
          {learningEvidenceLine}
        </ThemedText>
        {learningBoard.map((row) => (
          <View key={row.movementFamily} style={styles.learningRow}>
            <ThemedText type="small" numberOfLines={1} style={styles.learningLabel}>
              {row.label}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {row.stageLabel} · {row.evidenceCount}번 봄
            </ThemedText>
          </View>
        ))}
      </Section>

      {profile && (
        <Section title="몸 변화">
          {recommendationContext && (
            <ThemedText type="caption" themeColor="textSecondary">
              목표 · {BodyGoalLabels[recommendationContext.bodyGoal]}
            </ThemedText>
          )}

          {/* 값이 없는 지표는 '-'로 둔다. 앱이 추정해서 채우지 않는다. */}
          <MetricGrid>
            <MetricTile
              label="체중"
              value={currentWeightKg !== undefined ? `${currentWeightKg}kg` : EMPTY}
              note={deltaNote(latestBody?.weightKg, previousBody?.weightKg, 'kg')}
            />
            <MetricTile
              label="골격근량"
              value={
                latestBody?.skeletalMuscleKg !== undefined ? `${latestBody.skeletalMuscleKg}kg` : EMPTY
              }
              note={deltaNote(latestBody?.skeletalMuscleKg, previousBody?.skeletalMuscleKg, 'kg')}
            />
            <MetricTile
              label="체지방률"
              value={latestBody?.bodyFatPercent !== undefined ? `${latestBody.bodyFatPercent}%` : EMPTY}
              note={deltaNote(latestBody?.bodyFatPercent, previousBody?.bodyFatPercent, '%')}
            />
          </MetricGrid>

          <View style={styles.bodyRow}>
            <View style={[styles.characterPreview, { backgroundColor: theme.backgroundElement }]}>
              {/* 홈과 같은 캐릭터 identity — 크기만 다르다. */}
              <PlayerCharacter
                appearance={characterAppearance}
                slot="history"
                height={BODY_PREVIEW_HEIGHT}
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

          {addEntryOpen ? (
            <View style={styles.formBlock}>
              <TextField
                label="오늘 체중 (kg)"
                keyboardType="numeric"
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="예: 69.5"
              />
              <View style={styles.inlineRow}>
                <TextField
                  label="체지방률 (%, 선택)"
                  keyboardType="numeric"
                  value={bodyFatPercent}
                  onChangeText={setBodyFatPercent}
                  placeholder="예: 18.4"
                  containerStyle={styles.flexItem}
                />
                <TextField
                  label="골격근량 (kg, 선택)"
                  keyboardType="numeric"
                  value={skeletalMuscleKg}
                  onChangeText={setSkeletalMuscleKg}
                  placeholder="예: 33.1"
                  containerStyle={styles.flexItem}
                />
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                체지방률/골격근량은 인바디 등에서 직접 잰 값만 넣어요. 앱이 추정하지 않아요.
              </ThemedText>
              {photoUri ? (
                <View style={styles.photoPreviewRow}>
                  <PhotoSlot label="이번 사진" photoUri={photoUri} />
                </View>
              ) : canAddPhotoToday ? (
                <PrimaryButton label="사진 추가 (선택)" variant="secondary" onPress={handlePickPhoto} />
              ) : (
                <ThemedText type="caption" themeColor="textSecondary">
                  오늘 사진 업데이트는 이미 사용했어요. 다음 업데이트는 {nextPhotoAvailableDate}부터
                  가능해요.
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
            </View>
          ) : (
            <PrimaryButton
              label="오늘 체중/사진 기록 추가"
              variant="secondary"
              onPress={() => setAddEntryOpen(true)}
            />
          )}
        </Section>
      )}

      {/* 놓친 기록 채우기와 전체 기록 보기는 History의 보조 기능이다 —
          Primary 버튼처럼 보이지 않게 텍스트 액션으로 둔다. */}
      <View style={styles.secondaryActions}>
        <Pressable onPress={() => setManualOpen((v) => !v)} hitSlop={8}>
          <ThemedText type="captionBold" themeColor="textSecondary">
            {manualOpen ? '놓친 운동 기록 닫기' : '놓친 운동 기록 추가'}
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => setFullListOpen((v) => !v)} hitSlop={8}>
          <ThemedText type="captionBold" themeColor="textSecondary">
            {fullListOpen ? '전체 기록 접기 ︿' : '전체 기록 보기 ﹀'}
          </ThemedText>
        </Pressable>
      </View>

      {manualOpen && (
        <Section title="놓친 운동 기록">
          <ThemedText type="caption" themeColor="textSecondary">
            이미 끝난 운동을 나중에 기록할 때만 써요. [운동 시작]으로 하면 이 입력 없이 자동으로
            기록돼요.
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
          <PrimaryButton label="기록 추가" variant="secondary" onPress={handleAddManualRecord} />
          {manualReaction && (
            <ThemedText type="caption" themeColor="textSecondary">
              {StanleyTrainer.portraitPlaceholder} {manualReaction}
            </ThemedText>
          )}
        </Section>
      )}

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
                  // 담기만 한 운동/횟수 없는 세트는 세지 않는다 — 결과 화면과 같은 기준.
                  const setCount = countCompletedSets(record);
                  const exerciseCount = countCompletedExercises(record);
                  const suspicious = (record.durationMinutes ?? 0) > AppConfig.suspiciousDurationMinutes;
                  return (
                    <View key={record.id}>
                      <ThemedText type="caption" themeColor="textSecondary">
                        · {record.title} ({WorkoutCategoryLabels[record.category]})
                        {record.durationMinutes ? ` · ${record.durationMinutes}분` : ''}
                        {exerciseCount > 0
                          ? ` · 운동 ${exerciseCount}개 · ${setCount}세트`
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
  /** 학습 근거는 카드가 아니라 한 줄 로그다 — 통계 카드와 무게를 겨루지 않는다. */
  learningRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  learningLabel: {
    flexShrink: 1,
  },
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
  formBlock: {
    gap: Spacing.two,
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
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
