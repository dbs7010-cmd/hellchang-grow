import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NavRow } from '@/components/ui/nav-row';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { StanleyTrainer } from '@/config/trainers';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { getTodayRecords } from '@/data/workout-repository';
import { getGreetingLine } from '@/utils/trainer-dialogue';

/**
 * 16 SCREEN 중 "09 PT". 골드썬-스탠리가 HERO다. 예전의 emoji를 "완성된 로고"처럼
 * 크게 쓰던 방식을 버리고, 실제 반신 아트가 들어올 자리(portrait-ratio slot)를
 * 옅은 색으로 확보만 해둔다. AI 상담/성장 리포트 등은 compact navigation row로 옮기고,
 * 광고/구독 안내는 AI CHAT(paywall 단계)로 옮겨 이 화면을 차지하지 않게 했다.
 */
export default function TrainerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { workoutRecords, streak } = useAppData();
  const hasRecordedToday = getTodayRecords(workoutRecords).length > 0;

  const [stanleyLine] = useState(
    () =>
      getGreetingLine(StanleyTrainer.dialogueSet, {
        hasRecordedToday,
        currentStreakDays: streak.currentStreakDays,
      }).text
  );

  return (
    <ScreenScroll>
      <View style={styles.header}>
        <ThemedView type="backgroundSelected" style={[styles.portraitSlot, { borderColor: theme.border }]}>
          <ThemedText style={styles.portraitEmoji}>{StanleyTrainer.portraitPlaceholder}</ThemedText>
        </ThemedView>
        <ThemedText type="heading" style={{ color: theme.gold }}>
          {StanleyTrainer.displayName}
        </ThemedText>
      </View>

      <SectionCard>
        <ThemedText type="small" themeColor="textSecondary">
          {stanleyLine}
        </ThemedText>
      </SectionCard>

      <NavRow label="AI 상담" value="운동 추천 · 질문하기" onPress={() => router.push('/ai-chat')} />
      <NavRow label="루틴 관리" value="내 루틴 보기" onPress={() => router.push('/(tabs)/workout')} />
      <NavRow label="체형 분석" value="체중 · 사진 비교" onPress={() => router.push('/(tabs)/history')} />
      <NavRow label="성장 리포트" value="HELL PASS 진행도" onPress={() => router.push('/pass')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  portraitSlot: {
    width: 128,
    height: 168,
    borderRadius: Radius.large,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 40,
    opacity: 0.45,
  },
});
