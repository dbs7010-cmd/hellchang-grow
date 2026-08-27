import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HomeColors, Spacing } from '@/constants/theme';

export interface HomeHeadlineStatProps {
  label: string;
  /** 큰 숫자 부분만. 단위는 unit으로 나눠 넣는다 (숫자가 단위에 눌리지 않게). */
  value: string;
  unit?: string;
  /** 값 아래 한 줄. 실제 데이터에서 나온 것만 넣는다 — 없으면 넣지 않는다. */
  note?: string | null;
}

/**
 * 한 묶음에서 가장 큰 값 하나.
 *
 * 홈의 숫자가 전부 14px로 같은 무게였기 때문에, 오늘 무엇이 늘었는지가 보이지 않았다.
 * 묶음마다 주인공 숫자를 하나만 크게 세우고 나머지는 그 옆에서 받쳐 준다.
 * 값은 언제나 이미 계산된 실제 값이며, 여기서 만들거나 반올림하지 않는다.
 */
export function HomeHeadlineStat({ label, value, unit, note }: HomeHeadlineStatProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="caption" style={styles.label} numberOfLines={1}>
        {label}
      </ThemedText>
      <View style={styles.valueRow}>
        <ThemedText style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </ThemedText>
        {unit && (
          <ThemedText type="smallBold" style={styles.unit}>
            {unit}
          </ThemedText>
        )}
      </View>
      {note && (
        <ThemedText type="caption" style={styles.note} numberOfLines={1}>
          {note}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 1,
  },
  label: {
    color: HomeColors.textSecondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  value: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: HomeColors.text,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: HomeColors.textSecondary,
  },
  note: {
    color: HomeColors.textSecondary,
  },
});
