import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Section } from '@/components/ui/section';
import { SubScreen } from '@/components/ui/sub-screen';
import { StanleyPortraitImage } from '@/config/character-assets';
import { Exercises } from '@/config/exercises';
import { StanleyTrainer } from '@/config/trainers';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { clearPendingDanbaekBlock, getPendingDanbaekBlock, subscribeToDanbaekBlock } from '@/services/world/block-handoff';
import { buildBlockPresentation, describeBlockCandidate } from '@/utils/danbaek-block-presentation';
import type { QuickStartExercise } from '@/utils/workout-start';

export default function DanbaekBlockScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { workoutRecords, startWorkoutSession, activeSession } = useAppData();
  const block = useSyncExternalStore(subscribeToDanbaekBlock, getPendingDanbaekBlock, getPendingDanbaekBlock);
  const presentation = useMemo(() => block ? buildBlockPresentation({ block, exerciseDb: Exercises, records: workoutRecords }) : null, [block, workoutRecords]);

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');
  const handleClose = () => { clearPendingDanbaekBlock(); goBack(); };
  const handleStart = async (exercise: QuickStartExercise) => {
    if (activeSession && activeSession.status !== 'completed') { router.replace('/session'); return; }
    await startWorkoutSession('strength', { primaryMuscleGroup: presentation?.muscleGroup, initialExercises: [exercise] });
    clearPendingDanbaekBlock();
    router.replace('/session');
  };

  if (!block || !presentation) return <SubScreen title="단백이가 막힌 곳"><ThemedText type="small" themeColor="textSecondary">지금 설명할 막힘이 없어요. 단백세상에서 막히면 스탠리가 알려 줍니다.</ThemedText><PrimaryButton label="닫기" variant="secondary" onPress={goBack} /></SubScreen>;

  return <SubScreen title="단백이가 막힌 곳" accent>
    <View style={styles.stanleyRow}>
      <ThemedView type="backgroundSelected" style={[styles.portraitSlot, { borderColor: theme.border }]}>{StanleyPortraitImage ? <Image source={StanleyPortraitImage} style={styles.portraitImage} contentFit="cover" /> : <ThemedText style={styles.portraitEmoji}>{StanleyTrainer.portraitPlaceholder}</ThemedText>}</ThemedView>
      <View style={styles.stanleyText}><ThemedText type="smallBold">{StanleyTrainer.displayName}</ThemedText>{presentation.stanleyLines.map((line) => <ThemedText key={line} type="small" themeColor="textSecondary">{line}</ThemedText>)}</View>
    </View>
    <Section title="막힌 이유"><ThemedView type="backgroundElement" style={[styles.factCard, { borderColor: theme.border }]}><FactRow label="필요한 동작" value={presentation.familyLabel} />{presentation.requiredStageLabel && <FactRow label="필요한 정도" value={presentation.requiredStageLabel} />}{presentation.requiredExercise && <FactRow label="요구 운동" value={presentation.requiredExercise.name} />}</ThemedView></Section>
    {presentation.exercises.length > 0 ? <Section title="지금 할 수 있는 운동">{presentation.exercises.map((exercise, index) => <Pressable key={exercise.exerciseId} onPress={() => handleStart(exercise)} accessibilityRole="button" accessibilityLabel={`${exercise.exerciseName}으로 운동 시작`} style={[styles.candidate, { backgroundColor: theme.backgroundElement }]}><View style={styles.candidateText}><ThemedText type="smallBold" numberOfLines={1}>{exercise.exerciseName}</ThemedText><ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>{describeBlockCandidate(presentation, exercise)}</ThemedText></View><ThemedText type="captionBold" style={{ color: theme.gold }}>{index === 0 ? '이 운동으로 시작 ›' : '시작 ›'}</ThemedText></Pressable>)}</Section> : <Section title="지금 할 수 있는 운동"><ThemedView type="backgroundElement" style={[styles.factCard, { borderColor: theme.border }]}><ThemedText type="small">{presentation.emptyLine}</ThemedText><ThemedText type="caption" themeColor="textSecondary">오늘 하고 싶은 운동으로 시작하셔도 됩니다.</ThemedText></ThemedView><PrimaryButton label="운동 고르러 가기" variant="secondary" onPress={() => { clearPendingDanbaekBlock(); router.replace('/workout-start'); }} /></Section>}
    <PrimaryButton label="나중에 하기" variant="secondary" onPress={handleClose} />
  </SubScreen>;
}

function FactRow({ label, value }: { label: string; value: string }) { return <View style={styles.factRow}><ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText><ThemedText type="smallBold" numberOfLines={1} style={styles.factValue}>{value}</ThemedText></View>; }

const styles = StyleSheet.create({ stanleyRow:{flexDirection:'row',alignItems:'flex-start',gap:Spacing.three},portraitSlot:{width:72,height:96,borderRadius:Radius.large,borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},portraitImage:{width:'100%',height:'100%'},portraitEmoji:{fontSize:28,opacity:.45},stanleyText:{flex:1,gap:Spacing.one},factCard:{borderWidth:1,borderRadius:Radius.medium,padding:Spacing.three,gap:Spacing.one},factRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:Spacing.two},factValue:{flexShrink:1},candidate:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:Radius.large,padding:Spacing.three,minHeight:Layout.compactRowHeight,gap:Spacing.two},candidateText:{flex:1,gap:Spacing.half} });
