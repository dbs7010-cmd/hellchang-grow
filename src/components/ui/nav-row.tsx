import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface NavRowProps {
  label: string;
  value?: string;
  onPress: () => void;
}

/** 화면마다 독자적인 카드/버튼을 만들지 않기 위한 공용 compact navigation row. */
export function NavRow({ label, value, onPress }: NavRowProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.text}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {value && (
          <ThemedText type="small" themeColor="textSecondary">
            {value}
          </ThemedText>
        )}
      </View>
      <ThemedText type="smallBold" style={{ color: theme.gold }}>
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.large,
    padding: Spacing.three,
    minHeight: 44,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
