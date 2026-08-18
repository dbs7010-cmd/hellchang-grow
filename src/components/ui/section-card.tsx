import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout, Radius, Spacing } from '@/constants/theme';

/**
 * GAME 계열(홈/결과/HELL PASS/골드썬) 패널. 데이터/목록/설정 화면까지 전부 이걸로 감싸지 않는다 —
 * 그런 화면은 Section(배경 위에 바로 얹는 블록)을 쓴다 (CANON 17 카드 남용 해결).
 */
export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {title && (
        <ThemedText type="sectionTitle" style={styles.title}>
          {title}
        </ThemedText>
      )}
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: Layout.cardPadding,
    gap: Layout.rowGap,
  },
  title: {
    marginBottom: Spacing.half,
  },
});
