import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SectionProps {
  title?: string;
  /** 제목 오른쪽의 보조 액션 (예: "더보기 >") */
  actionLabel?: string;
  onPressAction?: () => void;
  gap?: number;
  children: ReactNode;
}

/**
 * 카드가 아닌 섹션. UI 문법 분리(카드 남용 해결)를 위해:
 *  - GAME(홈/결과/HELL PASS/골드썬)만 SectionCard로 "패널"처럼 띄운다.
 *  - DATA/NAVIGATION/LIST/SETTINGS는 이 Section을 써서 배경 위에 바로 얹는다.
 */
export function Section({ title, actionLabel, onPressAction, gap = Layout.rowGap, children }: SectionProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { gap }]}>
      {(title || actionLabel) && (
        <View style={styles.header}>
          {title ? <ThemedText type="sectionTitle">{title}</ThemedText> : <View />}
          {actionLabel && onPressAction && (
            <Pressable onPress={onPressAction} hitSlop={8}>
              <ThemedText type="captionBold" style={{ color: theme.gold }}>
                {actionLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
