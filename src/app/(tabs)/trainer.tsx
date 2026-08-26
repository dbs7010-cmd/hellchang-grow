import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DanbaekVoiceBubble } from '@/components/character/danbaek-voice-bubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChipRow } from '@/components/ui/chip-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { AiQuickActionLabels } from '@/config/ai-quick-actions';
import { StanleyPortraitImage } from '@/config/character-assets';
import { StanleyTrainer } from '@/config/trainers';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { getTodayRecords } from '@/data/workout-repository';
import { useTheme } from '@/hooks/use-theme';
import { AiQuickActionId } from '@/services/trainer/ai-trainer-service';
import { buildDanbaekVoice } from '@/utils/danbaek-learning-presence';
import { buildTrainerBriefSections } from '@/utils/trainer-brief';
import { getGreetingLine } from '@/utils/trainer-dialogue';

/**
 * 09 TRAINER — 담당 PT에게 상태를 확인하고 바로 상담/운동으로 이어지는 화면.
 *
 * 다른 탭으로 가는 중복 링크는 두지 않는다. 루틴은 운동 탭, 몸 변화는 히스토리,
 * 성장 리포트는 HOME/HELL PASS에서 확인한다. 이 화면의 역할은 코칭으로 제한한다.
 */

/** 트레이너 화면에 노출하는 빠른 질문. 전체 목록은 AI 상담 화면 안에 있다. */
const HERO_QUICK_ACTIONS: AiQuickActionId[] = ['what_today', 'build_routine', 'ask_form', 'check_diet'];

export default function TrainerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { workoutRecords, streak, ptContext, activeSession, danbaekLearning } = useAppData();
  const hasRecordedToday = getTodayRecords(workoutRecords).length > 0;
  const sessionInProgress = activeSession && activeSession.status !== 'completed';

  const [stanleyLine] = useState(
    () =>
      getGreetingLine(StanleyTrainer.dialogueSet, {
        hasRecordedToday,
        currentStreakDays: streak.currentStreakDays,
      }).text
  );

  const brief = useMemo(() => buildTrainerBriefSections(ptContext), [ptContext]);
  const danbaekVoice = useMemo(() => buildDanbaekVoice(danbaekLearning), [danbaekLearning]);

  const openChat = (action?: AiQuickActionId) => {
    router.push(action ? `/ai-chat?action=${action}` : '/ai-chat');
  };

  return (
    <ScreenScroll>
      <View style={styles.hero}>
        <ThemedView type="backgroundSelected" style={[styles.portraitSlot, { borderColor: theme.border }]}>
          {StanleyPortraitImage ? (
            <Image source={StanleyPortraitImage} style={styles.portraitImage} contentFit="cover" />
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

      {/*
        PT가 말하는 순서 그대로다: 지금 상태 → 오늘 중요한 한 가지 → 근거.
        예전에는 여러 줄이 같은 크기로 쌓여 무엇부터 읽을지 알 수 없었다.
      */}
      <Section title="오늘 상태">
        <ThemedView type="backgroundElement" style={[styles.briefCard, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">{brief.status}</ThemedText>
          <ThemedText type="small" style={{ color: theme.gold }}>
            {brief.focus}
          </ThemedText>
          {brief.records.map((line) => (
            <ThemedText key={line} type="caption" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
        </ThemedView>
      </Section>

      {/*
        단백이는 스탠리 카드 **밖에서** 말한다. 안에 넣으면 전문 코칭과 단백이 반응이
        한 목소리로 섞여, 누가 나를 가르치는지가 화면에서 흐려진다.
      */}
      <DanbaekVoiceBubble
        line={danbaekVoice.line}
        status={danbaekVoice.status}
        onPress={() => router.push('/(tabs)/workout')}
      />

      <PrimaryButton
        label="AI 상담"
        subLabel="운동 · 자세 · 식단을 스탠리에게 물어보세요"
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

      <PrimaryButton
        label={sessionInProgress ? '운동 계속하기' : '이대로 운동 시작'}
        subLabel={sessionInProgress ? '진행 중인 세션이 있어요' : '운동 선택 화면으로 이동'}
        variant="secondary"
        onPress={() => router.push(sessionInProgress ? '/session' : '/workout-start')}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
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
  briefCard: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
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
