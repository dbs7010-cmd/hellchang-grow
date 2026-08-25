import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SubScreen } from '@/components/ui/sub-screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DANBAEK_CONTRACT_VERSION, type DanbaekLearningProfile } from '@/types/danbaek-contract';
import { buildDanbaekWorldScene } from '@/features/danbaek-world/world-view-model';

const proofProfiles: Record<'before' | 'push' | 'bench', DanbaekLearningProfile> = {
  before: {
    contractVersion: DANBAEK_CONTRACT_VERSION,
    generatedAt: '2026-08-26T00:00:00.000Z',
    capabilities: [{ movementFamily: 'push_horizontal', learningStage: 'imitating', evidenceCount: 2, lastObservedAt: null, representativeExerciseIds: ['bench-press'] }],
  },
  push: {
    contractVersion: DANBAEK_CONTRACT_VERSION,
    generatedAt: '2026-08-26T00:00:00.000Z',
    capabilities: [{ movementFamily: 'push_horizontal', learningStage: 'learned', evidenceCount: 3, lastObservedAt: null, representativeExerciseIds: ['push-up'] }],
  },
  bench: {
    contractVersion: DANBAEK_CONTRACT_VERSION,
    generatedAt: '2026-08-26T00:00:00.000Z',
    capabilities: [{ movementFamily: 'push_horizontal', learningStage: 'learned', evidenceCount: 4, lastObservedAt: null, representativeExerciseIds: ['push-up', 'bench-press'] }],
  },
};

/**
 * WORLD vertical-slice proof UI. The selector simulates APP-owned snapshots only;
 * it never writes learning. Integration replaces proofProfiles with the APP adapter.
 */
export default function DanbaekWorldScreen() {
  const [profileKey, setProfileKey] = useState<keyof typeof proofProfiles>('before');
  const scene = useMemo(() => buildDanbaekWorldScene(proofProfiles[profileKey]), [profileKey]);

  return (
    <SubScreen title="단백세상" accent>
      <View style={styles.worldCard}>
        <ThemedText type="eyebrow" themeColor="gold">자동 모험 · PROOF</ThemedText>
        <View style={styles.path}>
          {['출발', '밀기 관문', '벤치몬스터'].map((label, index) => {
            const cleared = index < scene.clearedStageIds.length;
            const current = scene.state === 'blocked' && index === scene.clearedStageIds.length;
            return (
              <View key={label} style={[styles.node, cleared && styles.nodeCleared, current && styles.nodeCurrent]}>
                <ThemedText type="caption">{cleared ? '✓ ' : current ? '● ' : '○ '}{label}</ThemedText>
              </View>
            );
          })}
        </View>
        <View style={styles.danbaekPlaceholder}>
          <ThemedText type="heading">단백이</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {scene.state === 'blocked' ? '배운 동작을 따라 해보다 멈췄어요.' : '배운 동작으로 끝까지 지나갔어요.'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.resultCard}>
        <ThemedText type="heading">{scene.title}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">{scene.body}</ThemedText>
        {scene.state === 'blocked' ? (
          <PrimaryButton
            label={scene.actionLabel}
            onPress={() => router.push({ pathname: '/ai-chat', params: { movementFamily: scene.recommendedMovementFamily, exerciseId: scene.specificExerciseId ?? undefined, source: 'danbaek-world-block' } })}
          />
        ) : null}
      </View>

      <View style={styles.proofControls}>
        <ThemedText type="caption" themeColor="textSecondary">개발 검증용 학습 스냅샷 — WORLD는 이 값을 변경하지 않습니다.</ThemedText>
        <View style={styles.controlRow}>
          {([
            ['before', '배우는 중'],
            ['push', '밀기 배움'],
            ['bench', '벤치 배움'],
          ] as const).map(([key, label]) => (
            <Pressable key={key} onPress={() => setProfileKey(key)} style={[styles.control, profileKey === key && styles.controlActive]}>
              <ThemedText type="caption">{label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  worldCard: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large, backgroundColor: Colors.dark.backgroundElement, borderWidth: 1, borderColor: Colors.dark.border },
  path: { gap: Spacing.two },
  node: { padding: Spacing.two, borderRadius: Radius.medium, borderWidth: 1, borderColor: Colors.dark.border },
  nodeCleared: { borderColor: Colors.dark.gold },
  nodeCurrent: { borderColor: Colors.dark.warmOrange, backgroundColor: Colors.dark.backgroundSelected },
  danbaekPlaceholder: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  resultCard: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large, backgroundColor: Colors.dark.backgroundElement },
  proofControls: { gap: Spacing.two },
  controlRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  control: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.dark.border },
  controlActive: { borderColor: Colors.dark.gold, backgroundColor: Colors.dark.backgroundSelected },
});
