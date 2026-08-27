import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HomeColors, Layout, Spacing } from '@/constants/theme';

export interface HomeSectionProps {
  /** 이 묶음이 무엇에 대한 것인지. 짧은 명사여야 한다 — 문장을 쓰지 않는다. */
  title: string;
  /** 제목 오른쪽의 보조 이동 (예: "전체 기록 ›"). */
  actionLabel?: string;
  onPressAction?: () => void;
  /** 위쪽 구분선. 첫 묶음에는 주지 않는다. */
  divided?: boolean;
  gap?: number;
  children: ReactNode;
}

/**
 * 홈의 묶음 하나.
 *
 * 예전 홈에는 위계가 두 단계뿐이었다 — [운동 시작] 22px, 그리고 **나머지 전부 12~14px**.
 * 체중도, 이번 주 볼륨도, HELL PASS도, 단백세상도 전부 같은 크기로 늘어서서, 화면이
 * "무엇이 중요한가"를 한 번도 말하지 않았다. 정보가 없어서가 아니라 위계가 없어서
 * 미완성처럼 읽혔다.
 *
 * 그래서 홈을 카드 모음이 아니라 **이름이 붙은 묶음의 연속**으로 다시 세운다. 각 묶음은
 * 조용한 머리말 하나와 그 안에서 가장 큰 것 하나를 갖는다. 면(카드)을 늘리지 않고
 * 가는 선과 여백으로만 나눈다 — 홈에 대시보드 위젯을 더 만들지 않기 위해서다.
 */
export function HomeSection({
  title,
  actionLabel,
  onPressAction,
  divided,
  gap = Spacing.two,
  children,
}: HomeSectionProps) {
  return (
    <View style={[styles.section, divided && styles.divided]}>
      <View style={styles.header}>
        <ThemedText type="captionBold" style={styles.title}>
          {title}
        </ThemedText>
        {actionLabel && onPressAction && (
          <Pressable
            onPress={onPressAction}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={styles.action}>
            <ThemedText type="captionBold" style={styles.actionLabel}>
              {actionLabel} ›
            </ThemedText>
          </Pressable>
        )}
      </View>
      <View style={{ gap }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: HomeColors.border,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  /** 머리말은 읽히되 주인공이 되지 않는다 — 자간을 벌려 라벨처럼 보이게 한다. */
  title: {
    color: HomeColors.textSecondary,
    letterSpacing: 0.6,
  },
  action: {
    minHeight: Layout.compactRowHeight,
    justifyContent: 'center',
    paddingLeft: Spacing.two,
  },
  actionLabel: {
    color: HomeColors.goldStrong,
  },
});
