import { StyleSheet, View } from 'react-native';

import { PassProgress } from '@/components/ui/pass-progress';
import { CompactStat, StatRow } from '@/components/ui/stat-row';
import { Spacing } from '@/constants/theme';

export interface GrowthHudProps {
  passLevel: number;
  passXpIntoLevel: number;
  passXpForLevel: number;
  passProgress: number;
  weightKg?: number;
  bodyFatPercent?: number;
  workoutCount: number;
}

/**
 * 캐릭터 왼쪽의 얇은 성장 HUD. 카드로 쌓지 않는다.
 * 표시 항목은 실제 저장된 데이터가 있는 것만 보여준다 (없는 지표를 지어내지 않는다).
 */
export function GrowthHud({
  passLevel,
  passXpIntoLevel,
  passXpForLevel,
  passProgress,
  weightKg,
  bodyFatPercent,
  workoutCount,
}: GrowthHudProps) {
  return (
    <View style={styles.container}>
      <PassProgress
        level={passLevel}
        xpIntoLevel={passXpIntoLevel}
        xpForLevel={passXpForLevel}
        progress={passProgress}
      />
      <StatRow>
        {weightKg !== undefined && <CompactStat label="체중" value={`${weightKg}kg`} />}
        {bodyFatPercent !== undefined && <CompactStat label="체지방률" value={`${bodyFatPercent}%`} />}
        <CompactStat label="운동 기록" value={`${workoutCount}회`} />
      </StatRow>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    maxWidth: 150,
  },
});
