import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Section } from '@/components/ui/section';
import { SubScreen } from '@/components/ui/sub-screen';
import { TextField } from '@/components/ui/text-field';
import { getExerciseById, searchExercises } from '@/config/exercises';
import { WeekdayLabels } from '@/config/weekdays';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * 12 ROUTINE EDIT. 순번 + 운동명 + (드래그 대신) 위/아래 이동 버튼의 compact row로 구성한다 —
 * 위험한 새 제스처 의존성을 추가하지 않고 순서를 바꿀 수 있다.
 * routineId가 있으면 기존 루틴 수정(updateRoutine), 없으면 새 루틴 생성(saveRoutine).
 *
 * [루틴 저장]은 스크롤 영역 밖의 고정 footer다 — 운동을 많이 담아도 저장 버튼이 화면 밖으로
 * 밀려나지 않는다 (이전에는 목록이 길어지면 저장 버튼에 도달할 수 없었다).
 */
export default function RoutineEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { routines, saveRoutine, updateRoutine } = useAppData();

  const existing = routineId ? routines.find((r) => r.id === routineId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [days, setDays] = useState<Set<number>>(new Set(existing?.scheduledDays ?? []));
  const [exerciseIds, setExerciseIds] = useState<string[]>(existing?.exerciseIds ?? []);
  const [search, setSearch] = useState('');

  const searchResults = useMemo(() => (search.trim() ? searchExercises(search) : []), [search]);
  const canSave = name.trim().length > 0 && exerciseIds.length > 0;

  const toggleDay = (day: number) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const addExercise = (exerciseId: string) => {
    if (exerciseIds.includes(exerciseId)) return;
    setExerciseIds((prev) => [...prev, exerciseId]);
    setSearch('');
  };

  const removeExercise = (exerciseId: string) => {
    setExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    setExerciseIds((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || exerciseIds.length === 0) return;
    const input = {
      name: trimmed,
      exerciseIds,
      scheduledDays: days.size > 0 ? Array.from(days) : undefined,
    };
    if (existing) {
      await updateRoutine(existing.id, input);
    } else {
      await saveRoutine(input);
    }
    router.back();
  };

  return (
    <SubScreen
      title={existing ? '루틴 수정' : '루틴 만들기'}
      footer={
        <PrimaryButton label="루틴 저장" variant="gold" disabled={!canSave} onPress={handleSave} />
      }>
      <TextField label="루틴 이름" value={name} onChangeText={setName} placeholder="예: 가슴 A" />

      <Section title="요일 (선택)">
        <ChipRow wrap>
          {WeekdayLabels.map((label, day) => (
            <Chip key={day} label={label} selected={days.has(day)} onPress={() => toggleDay(day)} />
          ))}
        </ChipRow>
      </Section>

      <Section title="운동 순서">
        {exerciseIds.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아래에서 운동을 검색해 추가하세요.
          </ThemedText>
        ) : (
          exerciseIds.map((exerciseId, index) => (
            <View key={exerciseId} style={[styles.exerciseRow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="captionBold" themeColor="textSecondary" style={styles.exerciseIndex}>
                {index + 1}
              </ThemedText>
              <ThemedText type="small" style={styles.exerciseName} numberOfLines={1}>
                {getExerciseById(exerciseId)?.name ?? exerciseId}
              </ThemedText>
              <Pressable onPress={() => moveExercise(index, -1)} hitSlop={10} disabled={index === 0}>
                <ThemedText type="smallBold" themeColor={index === 0 ? 'border' : 'text'}>
                  ↑
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => moveExercise(index, 1)}
                hitSlop={10}
                disabled={index === exerciseIds.length - 1}>
                <ThemedText type="smallBold" themeColor={index === exerciseIds.length - 1 ? 'border' : 'text'}>
                  ↓
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => removeExercise(exerciseId)} hitSlop={10}>
                <ThemedText type="smallBold" style={{ color: theme.mutedRed }}>
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ))
        )}
      </Section>

      <Section title="운동 추가">
        <TextField placeholder="운동 검색해서 추가" value={search} onChangeText={setSearch} />
        {searchResults.length > 0 && (
          <ChipRow wrap>
            {searchResults.slice(0, 8).map((exercise) => (
              <Chip key={exercise.id} label={exercise.name} onPress={() => addExercise(exercise.id)} />
            ))}
          </ChipRow>
        )}
      </Section>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: Layout.compactRowHeight,
  },
  exerciseIndex: {
    width: 14,
  },
  exerciseName: {
    flex: 1,
  },
});
