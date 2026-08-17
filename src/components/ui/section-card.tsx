import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {title && (
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
      )}
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.one,
  },
});
