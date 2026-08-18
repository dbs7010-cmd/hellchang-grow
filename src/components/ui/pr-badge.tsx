import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 작은 "NEW PR" 뱃지. 히스토리/알림 등에서 재사용한다. */
export function PRBadge() {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.gold }]}>
      <ThemedText type="small" style={styles.text}>
        NEW PR
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  text: {
    color: '#1B1D20',
    fontSize: 11,
    fontWeight: '700',
  },
});
