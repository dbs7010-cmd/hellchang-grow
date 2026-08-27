import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DanbaekVoiceBubble } from '@/components/character/danbaek-voice-bubble';
import { PlayerCharacter } from '@/components/character/player-character';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SubScreen } from '@/components/ui/sub-screen';
import { WorldCliff, WorldCliffHeight } from '@/components/world/world-cliff';
import { WorldGate, WorldGateHeight } from '@/components/world/world-gate';
import { WorldStonePath, WorldStonePathHeight } from '@/components/world/world-stone-path';
import { WorldWindRidge, WorldWindRidgeHeight } from '@/components/world/world-wind-ridge';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import {
  DanbaekWorldFirstContact,
  DanbaekWorldStageScenes,
} from '@/features/danbaek-world/proof-stages';
import {
  buildDanbaekWorldScene,
  describeNextGoal,
  type DanbaekWorldJourneyNode,
} from '@/features/danbaek-world/world-view-model';
import { useTheme } from '@/hooks/use-theme';
import { handOffDanbaekBlock } from '@/services/world/block-handoff';
import {
  clearWorldReturn,
  observeWorldVisit,
} from '@/services/world/world-visit';

const CharacterHeight = 196;
const StageHeight = 236;

/**
 * 단백세상 첫 구간.
 *
 * 이 화면이 보여줘야 하는 건 상태가 아니라 **상황**이다. 순서가 곧 이야기다:
 *   지금 어디까지 왔는가(지도) → 눈앞에서 무슨 일이 벌어지는가(문 앞의 단백이)
 *   → 단백이가 뭐라고 하는가 → 그래서 지금 뭘 하면 되는가(고정 CTA)
 *
 * 판정은 여기서 하지 않는다. 무엇이 막혔고 무엇이 열렸는지는 언제나 실제 운동 기록에서
 * 계산된 `danbaekLearning`으로 `buildDanbaekWorldScene()`이 정한다 — 화면은 그리기만 한다.
 */
export default function DanbaekWorldScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { danbaekLearning, characterAppearance } = useAppData();
  const scene = useMemo(() => buildDanbaekWorldScene(danbaekLearning), [danbaekLearning]);

  /**
   * "내가 운동하고 왔더니 열렸다"는 이 화면의 핵심 순간인데, 매번 지금 상태만 그리면
   * 그냥 열린 문이 있는 화면일 뿐이라 **바뀌었다는 사실이 보이지 않는다.** 그래서 지난
   * 방문과 비교해서 방금 열린 경우에만 한 번 알려준다. 기억은 메모리에만 있고 판정에는
   * 쓰이지 않는다.
   */
  // 이 화면을 여는 순간 딱 한 번 판단한다. 부트스트랩이 끝나기 전에는 라우터가 어떤 화면도
  // 그리지 않으므로(resolveBootstrapScreen), 여기서 보는 학습 기록은 이미 실제 값이다.
  const [visit] = useState(
    () =>
      observeWorldVisit({
        stageId: scene.stageId,
        outcome: scene.state === 'cleared' ? 'cleared' : 'blocked',
        clearedStageIds: scene.clearedStageIds,
      })
  );

  /*
    처음 들어온 사람에게는 "문이 안 열린다"보다 여기가 어디인지가 먼저다. 인사는 한 번만
    하고, 닫으면 그 자리에서 바로 원래 화면이다 — 흐름을 막지 않는다.
  */
  const [showFirstContact, setShowFirstContact] = useState(visit.firstVisit);
  const firstPathUnlocked = scene.clearedStageIds.includes('push-door');
  const firstContact = firstPathUnlocked
    ? DanbaekWorldFirstContact.alreadyUnlocked
    : DanbaekWorldFirstContact.locked;
  const clearedReveal = visit.justClearedStageId
    ? DanbaekWorldStageScenes[visit.justClearedStageId]
    : null;

  useEffect(() => {
    // 돌아왔으니 결과 화면의 "돌아가기"는 더 이상 필요 없다.
    clearWorldReturn();
  }, []);

  const handleTeach = () => {
    if (scene.state !== 'blocked') return;
    handOffDanbaekBlock(scene.block);
    router.push('/danbaek-block');
  };

  return (
    <SubScreen
      title="단백세상"
      accent
      footer={
        scene.state === 'blocked' ? (
          <PrimaryButton
            label={scene.actionLabel}
            variant="gold"
            size="large"
            onPress={handleTeach}
          />
        ) : null
      }>
      {showFirstContact && (
        <ThemedView
          type="backgroundElement"
          style={[styles.firstContact, { borderColor: theme.gold }]}>
          <ThemedText type="smallBold" style={{ color: theme.gold }}>
            {firstContact.title}
          </ThemedText>
          {firstContact.lines.map((line) => (
            <ThemedText key={line} type="small" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
          <PrimaryButton
            label={DanbaekWorldFirstContact.dismissLabel}
            variant="secondary"
            onPress={() => setShowFirstContact(false)}
          />
        </ThemedView>
      )}

      <JourneyRail pathTitle={scene.pathTitle} nodes={scene.journey} />

      {clearedReveal && (
        <ThemedView
          type="backgroundElement"
          style={[styles.reveal, { borderColor: theme.gold }]}>
          <ThemedText type="smallBold" style={{ color: theme.gold }}>
            {clearedReveal.clearedTitle}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            방금 한 운동을 단백이가 보고 따라 했어요.
          </ThemedText>
        </ThemedView>
      )}

      {/* 장애물은 배경이고 주인공은 언제나 앞에 서 있는 단백이다. */}
      <View style={styles.stage}>
        <View
          style={
            scene.obstacle === 'cliff'
              ? styles.cliffSlot
              : scene.obstacle === 'stones'
                ? styles.stonesSlot
                : scene.obstacle === 'wind'
                  ? styles.windSlot
                  : styles.gateSlot
          }>
          {scene.obstacle === 'cliff' ? (
            <WorldCliff state={scene.state === 'blocked' ? 'blocked' : 'cleared'} />
          ) : scene.obstacle === 'stones' ? (
            <WorldStonePath state={scene.state === 'blocked' ? 'blocked' : 'cleared'} />
          ) : scene.obstacle === 'wind' ? (
            <WorldWindRidge state={scene.state === 'blocked' ? 'blocked' : 'cleared'} />
          ) : (
            <WorldGate state={scene.gate} />
          )}
        </View>
        <PlayerCharacter
          appearance={characterAppearance}
          slot="home"
          height={CharacterHeight}
          idle
        />
      </View>

      <ThemedText type="small" style={styles.sceneLine}>
        {scene.sceneLine}
      </ThemedText>

      <DanbaekVoiceBubble
        line={
          visit.justCleared && scene.state === 'cleared'
            ? clearedReveal?.returnedLine ?? scene.returnedLine
            : scene.danbaekLine
        }
        status={scene.statusLine}
      />

      {scene.state === 'blocked' ? (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {scene.whyLine}
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.nextRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.nextLabel}>
              다음 · {scene.nextGoal.label}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {describeNextGoal()}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {scene.nextGoal.teaser}
          </ThemedText>
        </ThemedView>
      )}
    </SubScreen>
  );
}

/**
 * 지도 한 줄.
 *
 * 예전에는 칸마다 테두리 박스를 세로로 쌓아서 개발자 상태표처럼 보였고, 세로 공간도 세 배로
 * 썼다. 여기서는 지나온 길과 남은 길이 한 줄에서 이어진다.
 */
function JourneyRail({
  pathTitle,
  nodes,
}: {
  pathTitle: string;
  nodes: DanbaekWorldJourneyNode[];
}) {
  const theme = useTheme();

  return (
    <View style={styles.rail}>
      <ThemedText type="captionBold" style={{ color: theme.gold }}>
        {pathTitle}
      </ThemedText>
      <View style={styles.railRow}>
        {nodes.map((node, index) => (
          <View key={node.id} style={styles.railNode}>
            {index > 0 && (
              <View
                style={[
                  styles.railLine,
                  { backgroundColor: node.state === 'ahead' ? theme.border : theme.gold },
                ]}
              />
            )}
            <View style={styles.railNodeText}>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{
                  color:
                    node.state === 'current'
                      ? theme.gold
                      : node.state === 'done'
                        ? theme.text
                        : theme.textSecondary,
                }}>
                {node.state === 'done' ? '✓ ' : node.state === 'current' ? '● ' : '· '}
                {node.label}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: Spacing.one,
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: Spacing.one,
  },
  railNode: {
    flexDirection: 'row',
    alignItems: 'center',
    flexBasis: '50%',
  },
  railLine: {
    width: Spacing.three,
    height: 1,
    marginHorizontal: Spacing.half,
  },
  railNodeText: {
    flex: 1,
    flexShrink: 1,
  },
  /** 첫 인사. 한 번만 보이고, 닫으면 바로 원래 화면이다. */
  firstContact: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Layout.cardPadding,
    gap: Spacing.two,
  },
  reveal: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Layout.cardPadding,
    gap: Spacing.half,
  },
  stage: {
    height: StageHeight,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  /** 문은 중앙에서 왼쪽으로 비켜 서 있어서 단백이가 그 앞을 가리지 않는다. */
  gateSlot: {
    position: 'absolute',
    top: StageHeight - WorldGateHeight,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingRight: 110,
  },
  cliffSlot: {
    position: 'absolute',
    top: StageHeight - WorldCliffHeight,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingLeft: 104,
  },
  stonesSlot: {
    position: 'absolute',
    top: StageHeight - WorldStonePathHeight,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingLeft: 72,
  },
  windSlot: {
    position: 'absolute',
    top: StageHeight - WorldWindRidgeHeight,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sceneLine: {
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Layout.cardPadding,
    gap: Spacing.two,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nextLabel: {
    flexShrink: 1,
  },
});
