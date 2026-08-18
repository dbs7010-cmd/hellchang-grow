import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { getExerciseById, searchExercises } from '@/config/exercises';
import { WeekdayLabels } from '@/config/weekdays';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * 16 SCREEN 중 "12 ROUTINE EDIT". 순번 + 운동명 + (드래그 대신) 위/아래 이동 버튼의
 * compact row로 구성한다 — 위험한 새 제스처 의존성을 추가하지 않고 순서를 바꿀 수 있다.
 * routineId가 있으면 기존 루틴 수정(신규 updateRoutine), 없으면 새 루틴 생성.
 */
export default function RoutineEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { routines, saveRoutine, updateRoutine } = useAppData();

  const existing = routineId ? routines.find((r) => r.id === routineId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [days, setDays] = useState<Set<number>>(new Set(existing?.scheduledDays ?? []));
  const [exerciseIds, setExerciseIds] = useState<string[]>(existing?.exerciseIds ?? []);
  const [search, setSearch] = useState('');

  const searchResults = useMemo(() => (search.trim() ? searchExercises(search) : []), [search]);

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
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ‹ 닫기
          </ThemedText>
        </Pressable>
        <ThemedText type="heading">{existing ? '루틴 수정' : '루틴 만들기'}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <TextField label="루틴 이름" value={name} onChangeText={setName} placeholder="예: 가슴 A" />

      <View style={styles.dayBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          요일 (선택)
        </ThemedText>
        <View style={styles.chipRow}>
          {WeekdayLabels.map((label, day) => (
            <Chip key={day} label={label} selected={days.has(day)} onPress={() => toggleDay(day)} />
          ))}
        </View>
      </View>

      <View style={styles.exerciseBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          운동 순서
        </ThemedText>
        {exerciseIds.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            아래에서 운동을 검색해 추가하세요.
          </ThemedText>
        ) : (
          exerciseIds.map((exerciseId, index) => (
            <View key={exerciseId} style={[styles.exerciseRow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.exerciseIndex}>
                {index + 1}
              </ThemedText>
              <ThemedText type="small" style={styles.exerciseName} numberOfLines={1}>
                {getExerciseById(exerciseId)?.name ?? exerciseId}
              </ThemedText>
              <Pressable onPress={() => moveExercise(index, -1)} hitSlop={8} disabled={index === 0}>
                <ThemedText type="smallBold" themeColor={index === 0 ? 'textSecondary' : 'text'}>
                  ↑
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => moveExercise(index, 1)}
                hitSlop={8}
                disabled={index === exerciseIds.length - 1}>
                <ThemedText type="smallBold" themeColor={index === exerciseIds.length - 1 ? 'textSecondary' : 'text'}>
                  ↓
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => removeExercise(exerciseId)} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.mutedRed }}>
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <TextField placeholder="운동 검색해서 추가" value={search} onChangeText={setSearch} />
      {searchResults.length > 0 && (
        <View style={styles.chipRow}>
          {searchResults.slice(0, 8).map((exercise) => (
            <Chip key={exercise.id} label={exercise.name} onPress={() => addExercise(exercise.id)} />
          ))}
        </View>
      )}

      <PrimaryButton label="루틴 저장" variant="gold" onPress={handleSave} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayBlock: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  exerciseBlock: {
    gap: Spacing.two,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  exerciseIndex: {
    width: 20,
  },
  exerciseName: {
    flex: 1,
  },
});
