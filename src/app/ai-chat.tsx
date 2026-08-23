import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AiPtPanel } from '@/components/trainer/ai-pt-panel';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SubScreen } from '@/components/ui/sub-screen';
import { AiQuickActionIds } from '@/config/ai-quick-actions';
import { StanleyTrainer } from '@/config/trainers';
import { useAppData } from '@/context/app-data-context';
import { AiQuickActionId } from '@/services/trainer/ai-trainer-service';
import { pickTrainerLine } from '@/utils/trainer-dialogue';

/**
 * 10 AI CHAT. 설정 화면이 아니라 messenger 계층 구조를 쓴다 — 실제 대화 UI는 기존
 * AiPtPanel(트레이너 portrait + bubble + quick action + input)을 그대로 재사용한다.
 *
 * 광고/구독 안내는 "실제로 이용하려는 순간"인 여기에서만 보여주고, 대화가 열린 뒤에는
 * 접근 상태를 caption 한 줄로만 남긴다 — 대화보다 결제 UI가 더 크게 보이지 않게 한다.
 * 키보드 회피/safe area는 SubScreen이 담당한다.
 */
export default function AiChatScreen() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  const initialQuickAction = AiQuickActionIds.includes(action as AiQuickActionId)
    ? (action as AiQuickActionId)
    : undefined;
  const {
    hasSubscriptionAccess,
    hasAiPtAccess,
    trainerUsage,
    aiConnected,
    watchRewardedAd,
    subscribeMock,
    sendPtMessage,
  } = useAppData();

  const [aiPanelOpened, setAiPanelOpened] = useState(hasAiPtAccess);

  const handleWatchAd = async () => {
    await watchRewardedAd();
    setAiPanelOpened(true);
  };

  const handleSubscribe = async () => {
    await subscribeMock('pro');
    setAiPanelOpened(true);
  };

  return (
    <SubScreen title="AI 상담" accent scroll={!aiPanelOpened}>
      {aiPanelOpened ? (
        <AiPtPanel
          accessLabel={
            hasSubscriptionAccess
              ? '구독 중이라 광고 없이 이용할 수 있어요.'
              : `남은 이용 횟수: ${trainerUsage.rewardedPtUsesRemaining}회`
          }
          aiConnected={aiConnected}
          initialQuickAction={initialQuickAction}
          onSend={sendPtMessage}
        />
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {StanleyTrainer.portraitPlaceholder} {pickTrainerLine(StanleyTrainer.dialogueSet.adPitch).text}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            광고를 보면 AI PT를 이용할 수 있어요. 구독과 AI 기능은 똑같아요 — 접근 방식만 달라요.
          </ThemedText>
          <PrimaryButton label="광고 보고 이용하기" variant="gold" onPress={handleWatchAd} />
          {/*
            결제 SDK가 붙기 전까지 출시 빌드에 구독 버튼을 두지 않는다 — 누르면 결제된 것처럼
            보이는 버튼은 거짓말이고, 그 경로가 곧 premium 우회가 된다.
          */}
          {__DEV__ && (
            <>
              <PrimaryButton label="구독하기 (DEV)" variant="secondary" onPress={handleSubscribe} />
              <ThemedText type="caption" themeColor="textSecondary">
                DEV: 광고/결제 SDK 연동 전이라 mock으로 동작해요. mock 구독은 출시 빌드에서
                인정되지 않아요.
              </ThemedText>
            </>
          )}
        </>
      )}
    </SubScreen>
  );
}
