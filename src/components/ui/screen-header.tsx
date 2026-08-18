import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenHeaderProps {
  title: string;
  /** 타이틀을 gold로 — HELL PASS / 골드썬처럼 "보상·트레이너" 계열 화면에만 쓴다. */
  accent?: boolean;
  /** 오른쪽 액션 슬롯. 없으면 왼쪽 back과 같은 폭의 빈 공간이 들어가 타이틀이 정확히 가운데 온다. */
  right?: ReactNode;
  onBack?: () => void;
}

const SIDE_WIDTH = 56;

/**
 * 스택으로 열리는 모든 화면(운동 찾기 / 운동 상세 / 루틴 편집 / 알림 / HELL PASS / AI 상담)이
 * 공유하는 단일 헤더. 이전에는 화면마다 "‹ 닫기 + 제목 + width:40 스페이서"를 각자 복사해서
 * 타이틀 크기와 정렬이 화면마다 달랐다.
 */
export function ScreenHeader({ title, accent, right, onBack }: ScreenHeaderProps) {
  const router = useRouter();
  const theme = useTheme();

  // 딥링크/알림으로 이 화면에 바로 들어오면 되돌아갈 스택이 없다 — 그때는 홈으로 보낸다.
  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.header}>
      <Pressable
        onPress={handleBack}
        hitSlop={12}
        style={styles.side}
        accessibilityRole="button"
        accessibilityLabel="뒤로">
        <ThemedText type="smallBold" themeColor="textSecondary">
          ‹ 닫기
        </ThemedText>
      </Pressable>

      <ThemedText type="heading" numberOfLines={1} style={[styles.title, accent && { color: theme.gold }]}>
        {title}
      </ThemedText>

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.compactRowHeight,
    paddingBottom: Spacing.two,
  },
  side: {
    width: SIDE_WIDTH,
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
