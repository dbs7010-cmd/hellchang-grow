import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NavRow } from '@/components/ui/nav-row';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { GoldsunPortraitImage } from '@/config/character-assets';
import { StanleyTrainer } from '@/config/trainers';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { getTodayRecords } from '@/data/workout-repository';
import { getGreetingLine } from '@/utils/trainer-dialogue';
import { Image } from 'expo-image';

/**
 * 09 TRAINER. 골드썬-스탠리가 HERO다. 거대한 선글라스 emoji 로고로 되돌리지 않는다 —
 * 실제 반신 아트가 들어올 portrait 슬롯만 확보해두고(GoldsunPortraitImage가 채워지면
 * 레이아웃 변경 없이 그대로 교체된다), 나머지는 compact navigation row로 둔다.
 *
 * 골드썬은 앞으로 단순 챗봇이 아니라 "내 운동 + 내 몸 변화 + 내 목표"를 관리하는 PT가 된다.
 * 그래서 진입점을 상담/루틴/몸 변화/성장 리포트 네 갈래로 유지한다.
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
          {GoldsunPortraitImage ? (
            <Image source={GoldsunPortraitImage} style={styles.portraitImage} contentFit="cover" />
          ) : (
            <ThemedText style={styles.portraitEmoji}>{StanleyTrainer.portraitPlaceholder}</ThemedText>
          )}
        </ThemedView>
        <View style={styles.headerText}>
          <ThemedText type="heading" style={{ color: theme.gold }}>
            {StanleyTrainer.displayName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            내 담당 PT
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
            {stanleyLine}
          </ThemedText>
        </View>
      </View>

      <NavRow label="AI 상담" value="운동 추천 · 질문하기" onPress={() => router.push('/ai-chat')} />
      <NavRow label="루틴 관리" value="내 루틴 보기" onPress={() => router.push('/(tabs)/workout')} />
      <NavRow label="몸 변화" value="체중 · 사진 비교" onPress={() => router.push('/(tabs)/history')} />
      <NavRow label="성장 리포트" value="HELL PASS 진행도" onPress={() => router.push('/pass')} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  /** 실제 반신 아트 비율(약 3:4)을 미리 잡아둔 슬롯. */
  portraitSlot: {
    width: 96,
    height: 128,
    borderRadius: Radius.large,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitEmoji: {
    fontSize: 36,
    opacity: 0.45,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  line: {
    marginTop: Spacing.one,
  },
});
