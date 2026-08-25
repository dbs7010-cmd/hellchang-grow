import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SubScreen } from '@/components/ui/sub-screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { buildDanbaekWorldScene } from '@/features/danbaek-world/world-view-model';
import { handOffDanbaekBlock } from '@/services/world/block-handoff';

export default function DanbaekWorldScreen() {
  const { danbaekLearning } = useAppData();
  const scene = buildDanbaekWorldScene(danbaekLearning);
  const handleBlockedAction = () => {
    if (scene.state !== 'blocked') return;
    handOffDanbaekBlock(scene.block);
    router.push('/danbaek-block');
  };
  return <SubScreen title="단백세상" accent>
    <View style={styles.worldCard}>
      <ThemedText type="captionBold" themeColor="gold">자동 모험</ThemedText>
      <View style={styles.path}>{['출발', '밀기 관문', '벤치몬스터'].map((label,index)=>{const cleared=index<scene.clearedStageIds.length;const current=scene.state==='blocked'&&index===scene.clearedStageIds.length;return <View key={label} style={[styles.node,cleared&&styles.nodeCleared,current&&styles.nodeCurrent]}><ThemedText type="caption">{cleared?'✓ ':current?'● ':'○ '}{label}</ThemedText></View>;})}</View>
      <View style={styles.danbaek}><ThemedText type="heading">단백이</ThemedText><ThemedText type="caption" themeColor="textSecondary">{scene.state==='blocked'?'배운 동작을 따라 해보다 멈췄어요.':'배운 동작으로 끝까지 지나갔어요.'}</ThemedText></View>
    </View>
    <View style={styles.resultCard}><ThemedText type="heading">{scene.title}</ThemedText><ThemedText themeColor="textSecondary">{scene.body}</ThemedText>{scene.state==='blocked'?<PrimaryButton label={scene.actionLabel} onPress={handleBlockedAction}/>:<PrimaryButton label="홈으로 돌아가기" onPress={()=>router.back()}/>}</View>
  </SubScreen>;
}

const styles=StyleSheet.create({worldCard:{gap:Spacing.three,padding:Spacing.three,borderRadius:Radius.large,backgroundColor:Colors.dark.backgroundElement,borderWidth:1,borderColor:Colors.dark.border},path:{gap:Spacing.two},node:{padding:Spacing.two,borderRadius:Radius.medium,borderWidth:1,borderColor:Colors.dark.border},nodeCleared:{borderColor:Colors.dark.gold},nodeCurrent:{borderColor:Colors.dark.warmOrange,backgroundColor:Colors.dark.backgroundSelected},danbaek:{minHeight:180,alignItems:'center',justifyContent:'center',gap:Spacing.two},resultCard:{gap:Spacing.three,padding:Spacing.three,borderRadius:Radius.large,backgroundColor:Colors.dark.backgroundElement}});
