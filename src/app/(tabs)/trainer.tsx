import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChipRow } from '@/components/ui/chip-row';
import { NavRow } from '@/components/ui/nav-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { AiQuickActionLabels } from '@/config/ai-quick-actions';
import { GoldsunPortraitImage } from '@/config/character-assets';
import { StanleyTrainer } from '@/config/trainers';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getTodayRecords } from '@/data/workout-repository';
import { useTheme } from '@/hooks/use-theme';
import { AiQuickActionId } from '@/services/trainer/ai-trainer-service';
import { getGreetingLine } from '@/utils/trainer-dialogue';

/**
 * 09 TRAINER — "내 담당 PT에게 들어왔다"는 느낌의 화면.
 *
 * 상단 골드썬이 HERO다. 실제 반신 아트가 들어올 자리(GoldsunPortraitImage)를 확보만 해두고,
 * 채워지면 레이아웃 변경 없이 그대로 교체된다.
 *
 * 4개 메뉴가 같은 무게로 보이던 문제를 고쳤다: [AI 상담]이 Primary이고
 * 루틴 관리 / 몸 변화 / 성장 리포트는 그 아래 보조 navigation row다.
 *
 * 빠른 질문은 기존 AI 구조(AiQuickActionIds + mock AI 서비스)에 그대로 연결된다 —
 * 여기서 새로운 가짜 응답을 만들지 않는다. 무료/광고/구독 접근 게이트도 AI 상담 화면의
 * 기존 경로를 그대로 통과한다.
 */

/** 트레이너 화면에 노출하는 빠른 질문. 전체 목록은 AI 상담 화면 안에 있다. */
const HERO_QUICK_ACTIONS: AiQuickActionId[] = ['what_today', 'build_routine', 'ask_form', 'check_diet'];

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

  const openChat = (action?: AiQuickActionId) => {
    router.push(action ? `/ai-chat?action=${action}` : '/ai-chat');
  };

  return (
    <ScreenScroll>
      <View style={styles.hero}>
        <ThemedView type="backgroundSelected" style={[styles.portraitSlot, { borderColor: theme.border }]}>
          {GoldsunPortraitImage ? (
            <Image source={GoldsunPortraitImage} style={styles.portraitImage} contentFit="cover" />
          ) : (
            <ThemedText style={styles.portraitEmoji}>{StanleyTrainer.portraitPlaceholder}</ThemedText>
          )}
        </ThemedView>
        <View style={styles.heroText}>
          <ThemedText type="heading" numberOfLines={1}>
            {StanleyTrainer.displayName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            내 담당 PT
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.heroLine}>
            {stanleyLine}
          </ThemedText>
        </View>
      </View>

      <PrimaryButton
        label="AI 상담"
        subLabel="오늘 뭘 할지 물어보세요"
        variant="gold"
        size="large"
        onPress={() => openChat()}
      />

      <ChipRow bleed>
        {HERO_QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action}
            onPress={() => openChat(action)}
            style={[styles.quickAction, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="caption">{AiQuickActionLabels[action]}</ThemedText>
          </Pressable>
        ))}
      </ChipRow>

      <Section title="내 기록 보기">
        <NavRow label="루틴 관리" value="내 루틴 보기" onPress={() => router.push('/(tabs)/workout')} />
        <NavRow label="몸 변화" value="체중 · 사진 비교" onPress={() => router.push('/(tabs)/history')} />
        <NavRow label="성장 리포트" value="HELL PASS 진행도" onPress={() => router.push('/pass')} />
      </Section>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  /** 실제 반신 아트 비율(3:4)을 미리 잡아둔 슬롯. */
  portraitSlot: {
    width: 96,
    height: 128,
    borderRadius: Radius.large,
    borderWidth: 1,
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
  heroText: {
    flex: 1,
    gap: Spacing.half,
  },
  heroLine: {
    marginTop: Spacing.one,
  },
  quickAction: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: Layout.compactRowHeight - 8,
    justifyContent: 'center',
  },
});
