import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlayerCharacter } from '@/components/character/player-character';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SubScreen } from '@/components/ui/sub-screen';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { buildDanbaekWorldScene } from '@/features/danbaek-world/world-view-model';
import { handOffDanbaekBlock } from '@/services/world/block-handoff';

export default function DanbaekWorldScreen() {
  const router = useRouter();
  const { danbaekLearning, characterAppearance } = useAppData();
  const scene = useMemo(() => buildDanbaekWorldScene(danbaekLearning), [danbaekLearning]);

  const handleTeach = () => {
    if (scene.state !== 'blocked') return;
    handOffDanbaekBlock(scene.block);
    router.push('/danbaek-block');
  };

  return (
    <SubScreen title="단백세상" accent>
      <View style={styles.stage}>
        <ThemedText type="captionBold" themeColor="gold">첫 번째 길</ThemedText>
        <View style={styles.path}>
          <View style={styles.node}><ThemedText type="caption">✓ 출발</ThemedText></View>
          <View style={[styles.node, styles.nodeCurrent]}>
            <ThemedText type="caption">{scene.state === 'cleared' ? '✓ 열린 문' : '● 막힌 문'}</ThemedText>
          </View>
          <View style={styles.node}><ThemedText type="caption">○ 다음 길 · 당기기</ThemedText></View>
        </View>

        <PlayerCharacter appearance={characterAppearance} slot="home" height={210} idle />
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {scene.state === 'blocked'
            ? '단백이가 문을 밀어 보지만 꿈쩍하지 않아요.'
            : '단백이가 배운 동작으로 문을 밀어 열었어요!'}
        </ThemedText>
      </View>

      <View style={styles.storyCard}>
        <ThemedText type="heading">{scene.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{scene.body}</ThemedText>
        {scene.state === 'blocked' ? (
          <PrimaryButton label={scene.actionLabel} variant="gold" size="large" onPress={handleTeach} />
        ) : (
          <ThemedText type="smallBold" themeColor="gold">다음 목표 · 당기는 길을 준비 중</ThemedText>
        )}
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', gap: Spacing.two },
  path: { width: '100%', gap: Spacing.one },
  node: { padding: Spacing.two, borderRadius: Radius.medium, borderWidth: 1, borderColor: '#3A3A3A' },
  nodeCurrent: { borderColor: '#D8A928' },
  centerText: { textAlign: 'center' },
  storyCard: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large, backgroundColor: '#191919' },
});
