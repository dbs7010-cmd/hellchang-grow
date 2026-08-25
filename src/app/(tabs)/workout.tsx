import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DanbaekVoiceBubble } from '@/components/character/danbaek-voice-bubble';
import { ThemedText } from '@/components/themed-text';
import { NavRow } from '@/components/ui/nav-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { getExerciseById } from '@/config/exercises';
import { WorkoutCategoryLabels } from '@/config/workout-labels';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { buildDanbaekVoice, buildLearningBoard } from '@/utils/danbaek-learning-presence';
import { getTodaysScheduledRoutine } from '@/utils/routine';

export default function WorkoutHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { routines, workoutRecords, activeSession, danbaekLearning } = useAppData();
  const danbaekVoice = useMemo(() => buildDanbaekVoice(danbaekLearning), [danbaekLearning]);
  const learningBoard = useMemo(() => buildLearningBoard(danbaekLearning), [danbaekLearning]);
  const scheduledRoutine = getTodaysScheduledRoutine(routines, new Date().getDay());
  const recentRecords = workoutRecords.slice(0, 3);
  const sessionInProgress = activeSession && activeSession.status !== 'completed';

  return (
    <ScreenScroll>
      <ThemedText type="heading">운동</ThemedText>
      <PrimaryButton label={sessionInProgress ? '운동으로 돌아가기' : '운동 시작'} subLabel={sessionInProgress ? '진행 중인 세션이 있어요' : scheduledRoutine ? '오늘 · ' + scheduledRoutine.name : '루틴 없이 바로 시작할 수 있어요'} variant="gold" size="large" onPress={() => router.push(sessionInProgress ? '/session' : '/workout-start')} />
      <Section title="내 루틴">
        {routines.length === 0 ? <View style={styles.emptyBlock}><ThemedText type="small" themeColor="textSecondary">아직 저장한 루틴이 없어요.</ThemedText><Pressable onPress={() => router.push('/routine-edit')} hitSlop={8}><ThemedText type="smallBold" style={{ color: theme.gold }}>+ 첫 루틴 만들기</ThemedText></Pressable></View> : <>{routines.map((routine) => <Pressable key={routine.id} onPress={() => router.push(`/routine-edit?routineId=${routine.id}`)} style={[styles.row, { backgroundColor: theme.backgroundElement }]}><View style={styles.rowText}><ThemedText type="smallBold" numberOfLines={1}>{routine.name}</ThemedText><ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>{routine.exerciseIds.map((id) => getExerciseById(id)?.name ?? id).join(', ')}</ThemedText></View><ThemedText type="smallBold" themeColor="textSecondary">›</ThemedText></Pressable>)}<Pressable onPress={() => router.push('/routine-edit')} hitSlop={8} style={styles.inlineAction}><ThemedText type="captionBold" themeColor="textSecondary">+ 새 루틴 만들기</ThemedText></Pressable></>}
      </Section>
      <Section title="단백이가 배운 것">
        <DanbaekVoiceBubble line={danbaekVoice.line} status={danbaekVoice.status} />
        {learningBoard.length > 0 && <View style={styles.boardRows}>{learningBoard.map((row) => <View key={row.family} style={styles.boardRow}><ThemedText type="small" numberOfLines={1} style={styles.rowText}>{row.label}</ThemedText><ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>{row.stageLabel} · {row.evidenceCount}번 봄</ThemedText></View>)}</View>}
      </Section>
      <Section title="최근 운동">{recentRecords.length === 0 ? <ThemedText type="small" themeColor="textSecondary">아직 기록이 없어요. 위에서 바로 시작해보세요.</ThemedText> : recentRecords.map((record) => <View key={record.id} style={styles.recentRow}><ThemedText type="small" numberOfLines={1} style={styles.rowText}>{record.title}</ThemedText><ThemedText type="caption" themeColor="textSecondary">{WorkoutCategoryLabels[record.category]}{record.durationMinutes ? ` · ${record.durationMinutes}분` : ''} · {record.date}</ThemedText></View>)}</Section>
      <NavRow label="운동 찾기" value="전체 Exercise DB" onPress={() => router.push('/exercise-select')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderRadius:Radius.medium,paddingHorizontal:Spacing.three,paddingVertical:Spacing.two,gap:Spacing.two,minHeight:Layout.compactRowHeight},rowText:{flex:1},recentRow:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:Spacing.two,paddingVertical:2},boardRows:{gap:Spacing.one,paddingTop:Spacing.one},boardRow:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:Spacing.two},emptyBlock:{gap:Spacing.one,paddingVertical:Spacing.one},inlineAction:{paddingVertical:Spacing.one}});
