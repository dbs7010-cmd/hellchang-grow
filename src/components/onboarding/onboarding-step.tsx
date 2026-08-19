import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 온보딩 단계 수 (시작 화면 제외). 진행 표시가 이 값을 기준으로 그려진다. */
export const OnboardingStepCount = 4;

export interface OnboardingStepProps {
  /** 1부터 시작하는 단계 번호. 시작 화면처럼 진행 표시가 필요 없으면 생략한다. */
  step?: number;
  title: string;
  subtitle?: string;
  /** 스크롤 영역 밖에 고정되는 하단 CTA — 키보드가 올라와도 가려지지 않는다. */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * 온보딩 공통 셸.
 *
 * 새 디자인 시스템을 만들지 않는다 — HOME CANON(검은 배경 / Gold accent / 큰 타이포 /
 * compact) 그대로이고, 간격·색·타이포는 전부 기존 theme token과 typography role을 쓴다.
 *
 * 구조는 "진행 표시 → 큰 제목 → 선택 영역 → 하단 고정 CTA"로 고정한다:
 *  - CTA가 항상 화면 아래에 있어서 Galaxy 412x915에서 스크롤 없이 닿는다 (한 손 조작)
 *  - 숫자 키보드가 올라와도 CTA를 가리지 않는다
 */
export function OnboardingStep({ step, title, subtitle, footer, children }: OnboardingStepProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.two }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <View style={styles.inner}>
          {step !== undefined && (
            <View style={styles.progressRow}>
              {router.canGoBack() ? (
                <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="이전 단계">
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    ‹
                  </ThemedText>
                </Pressable>
              ) : (
                <View style={styles.backSpacer} />
              )}
              <View style={styles.progressTrack}>
                {Array.from({ length: OnboardingStepCount }, (_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressSegment,
                      { backgroundColor: index < step ? theme.gold : theme.backgroundSelected },
                    ]}
                  />
                ))}
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {step}/{OnboardingStepCount}
              </ThemedText>
            </View>
          )}

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.titleBlock}>
              <ThemedText type="subtitle">{title}</ThemedText>
              {subtitle && (
                <ThemedText type="small" themeColor="textSecondary">
                  {subtitle}
                </ThemedText>
              )}
            </View>
            {children}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/**
 * 온보딩에서 고르는 큰 선택 카드. 한 화면에 3~4개가 들어가도록 compact하게 유지한다.
 * 선택 상태는 Gold 테두리로만 드러낸다 — 배경을 통째로 gold로 칠하지 않는다.
 */
export function OnboardingChoice({
  icon,
  label,
  description,
  selected,
  onPress,
}: {
  icon?: string;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.gold : 'transparent',
        },
      ]}>
      {icon && <ThemedText style={styles.choiceIcon}>{icon}</ThemedText>}
      <View style={styles.choiceText}>
        <ThemedText type="smallBold" style={selected ? { color: theme.gold } : undefined}>
          {label}
        </ThemedText>
        {description && (
          <ThemedText type="caption" themeColor="textSecondary">
            {description}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenPaddingX,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Layout.compactRowHeight,
  },
  backSpacer: {
    width: 8,
  },
  progressTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  content: {
    flexGrow: 1,
    gap: Layout.sectionGap,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  titleBlock: {
    gap: Spacing.one,
  },
  footer: {
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  choiceIcon: {
    fontSize: 22,
  },
  choiceText: {
    flex: 1,
    gap: 1,
  },
});
