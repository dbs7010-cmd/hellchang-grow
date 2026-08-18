import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface CompactStatProps {
  label: string;
  value: string;
  emphasize?: boolean;
}

/** HUD/결과 화면에서 쓰는 라벨+값 한 줄. 카드로 감싸지 않는다. */
export function CompactStat({ label, value, emphasize }: CompactStatProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText type={emphasize ? 'smallBold' : 'small'}>{value}</ThemedText>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  row: {
    gap: 0,
  },
  label: {
    fontSize: 11,
  },
});
