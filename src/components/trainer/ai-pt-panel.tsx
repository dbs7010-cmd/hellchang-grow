import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { AiQuickActionIds, AiQuickActionLabels } from '@/config/ai-quick-actions';
import { StanleyTrainer } from '@/config/trainers';
import { QuickActionPrompts } from '@/config/trainer-persona';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  AiQuickActionId,
  AiTrainerHistoryEntry,
  AiTrainerMessage,
} from '@/services/trainer/ai-trainer-service';
import { createId } from '@/utils/id';

interface AiPtMessage {
  id: string;
  role: 'user' | 'trainer';
  text: string;
  /** 트레이너 메시지가 실제 AI에서 온 것인지, 기록으로 계산한 것인지 */
  source?: AiTrainerMessage['source'];
}

export interface AiPtPanelProps {
  accessLabel: string;
  /** AI 백엔드가 연결돼 있지 않으면 그 사실을 대화 위에 그대로 알린다. */
  aiConnected: boolean;
  /**
   * 트레이너 화면의 빠른 질문으로 들어온 경우, 화면을 열자마자 그 질문을 한 번 보낸다.
   * 대화 UI/이용권 소모 경로는 사용자가 직접 누른 것과 완전히 동일하다.
   */
  initialQuickAction?: AiQuickActionId;
  onSend: (input: {
    text: string;
    quickActionId?: AiQuickActionId;
    history: AiTrainerHistoryEntry[];
  }) => Promise<AiTrainerMessage | null>;
}

export function AiPtPanel({ accessLabel, aiConnected, initialQuickAction, onSend }: AiPtPanelProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<AiPtMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 실패한 요청 그대로 다시 보낼 수 있게 마지막 요청을 들고 있는다 (재시도 버튼 노출 조건). */
  const [lastRequest, setLastRequest] = useState<{ text: string; quickActionId?: AiQuickActionId } | null>(
    null
  );
  /**
   * 실패 이유가 "이용권이 없어서"인가.
   *
   * 이 경우와 통신/서버 실패는 사용자가 할 수 있는 일이 다르다. 예전에는 둘을 같은 오류로
   * 묶어서 [다시 시도]를 띄웠는데, 이용권이 0이면 그 버튼은 눌러도 **절대 성공할 수 없다** —
   * 눌러도 아무 일이 없는 버튼이었다. 게다가 안내는 "광고를 보거나 구독하면"이라고 했지만
   * 이 화면에는 광고 버튼이 없다(광고/구독은 대화가 열리기 전 화면에 있다).
   */
  const [outOfUses, setOutOfUses] = useState(false);
  /** 전송 중 중복 요청 차단 — 버튼 disabled보다 앞선 방어선이다. */
  const sendingRef = useRef(false);

  const send = async (text: string, quickActionId?: AiQuickActionId, appendUserBubble = true) => {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;
    setError(null);
    setOutOfUses(false);
    setLastRequest({ text: trimmed, quickActionId });

    const history: AiTrainerHistoryEntry[] = messages.map((message) => ({
      role: message.role,
      text: message.text,
    }));

    if (appendUserBubble) {
      const label = quickActionId ? AiQuickActionLabels[quickActionId] : trimmed;
      setMessages((prev) => [...prev, { id: createId('ai-msg'), role: 'user', text: label }]);
    }

    setLoading(true);
    try {
      const reply = await onSend({ text: trimmed, quickActionId, history });
      if (!reply) {
        // 여기서 할 수 있는 일을 그대로 말한다. 지금까지 한 대화는 그대로 남는다.
        setOutOfUses(true);
        setError('이용권을 다 썼어요. [‹ 닫기]로 나갔다가 AI 상담을 다시 열면 광고를 보고 이어서 물어볼 수 있어요.');
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: createId('ai-msg'), role: 'trainer', text: reply.text, source: reply.source },
      ]);
    } catch (caught) {
      // 대화는 그대로 두고 오류만 알린다 — 실패했다고 지금까지 한 이야기를 날리지 않는다.
      setError(caught instanceof Error ? caught.message : '답변을 받지 못했어요.');
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const handleQuickAction = (actionId: AiQuickActionId) => {
    send(QuickActionPrompts[actionId], actionId);
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText('');
    send(trimmed);
  };

  const handleRetry = () => {
    if (!lastRequest) return;
    // 사용자 말풍선은 이미 있으므로 다시 붙이지 않는다.
    send(lastRequest.text, lastRequest.quickActionId, false);
  };

  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!initialQuickAction || autoSentRef.current) return;
    autoSentRef.current = true;
    handleQuickAction(initialQuickAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuickAction]);

  return (
    <View style={styles.container}>
      <ThemedText type="caption" themeColor="textSecondary">
        {accessLabel}
      </ThemedText>

      {!aiConnected && (
        <ThemedView type="backgroundElement" style={[styles.notice, { borderColor: theme.border }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            AI가 아직 연결되지 않았어요. 지금은 스탠리가 저장된 운동 기록만 보고 답해요 — 기록에
            없는 내용은 지어내지 않아요.
          </ThemedText>
        </ThemedView>
      )}

      <ChipRow bleed>
        {AiQuickActionIds.map((actionId) => (
          <Chip
            key={actionId}
            label={AiQuickActionLabels[actionId]}
            disabled={loading}
            onPress={() => handleQuickAction(actionId)}
          />
        ))}
      </ChipRow>

      {/* 대화만 가운데에서 스크롤된다 — 답변이 길어져도 아래 입력창이 화면 밖으로 밀려나지 않는다. */}
      <ScrollView
        style={styles.conversation}
        contentContainerStyle={styles.conversationContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/*
          대화가 시작되기 전의 화면. 예전에는 여기가 그냥 빈 공간이라, 이용권까지 쓰고
          들어온 사용자가 "열리긴 한 건가?" 싶은 화면을 마주했다.
        */}
        {messages.length === 0 && !loading && (
          <View style={styles.emptyConversation}>
            <EmptyState
              icon={StanleyTrainer.portraitPlaceholder}
              line={`${StanleyTrainer.displayName}에게 물어볼 차례예요.`}
              hint="위의 빠른 질문을 누르거나, 아래에 직접 적어서 보내요."
            />
          </View>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} role={message.role} text={message.text} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <ThemedView type="backgroundElement" style={[styles.notice, { borderColor: theme.mutedRed }]}>
            <ThemedText type="caption" themeColor="textSecondary">
              {error}
            </ThemedText>
            {/* 다시 눌러도 성공할 수 없는 상황(이용권 0)에서는 재시도를 내보내지 않는다. */}
            {lastRequest && !outOfUses && (
              <PrimaryButton label="다시 시도" variant="secondary" onPress={handleRetry} disabled={loading} />
            )}
          </ThemedView>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextField
          value={inputText}
          onChangeText={setInputText}
          placeholder="직접 물어보기"
          containerStyle={styles.inputField}
          onSubmitEditing={handleSend}
        />
        <PrimaryButton
          label="전송"
          variant="secondary"
          onPress={handleSend}
          disabled={loading || inputText.trim().length === 0}
        />
      </View>
    </View>
  );
}

/** 새 메시지가 fade + 6px rise로 나타난다 (일반 흰 챗봇 UI 느낌을 피하기 위한 최소한의 모션). */
function MessageBubble({ role, text }: { role: 'user' | 'trainer'; text: string }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220 });
    translateY.value = withTiming(0, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.bubbleRow, role === 'user' && styles.bubbleRowUser, animatedStyle]}>
      {role === 'trainer' && <ThemedText style={styles.bubblePortrait}>{StanleyTrainer.portraitPlaceholder}</ThemedText>}
      <ThemedView
        type={role === 'user' ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.bubble, role === 'user' && styles.bubbleUser]}>
        <ThemedText type="small">{text}</ThemedText>
      </ThemedView>
    </Animated.View>
  );
}

/** "스탠리가 보고 있습니다…" — 흰 ChatGPT 느낌의 로딩 대신 쓰는 은은한 표시. */
function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <ThemedText style={styles.typingPortrait}>{StanleyTrainer.portraitPlaceholder}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {StanleyTrainer.displayName}이 보고 있습니다{'…'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
  },
  conversation: {
    flex: 1,
  },
  /** 빈 대화 안내는 화면을 채우는 것이 아니라 위쪽에 조용히 놓인다. */
  emptyConversation: {
    paddingTop: Spacing.two,
  },
  conversationContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubblePortrait: {
    fontSize: 18,
  },
  bubble: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    maxWidth: '80%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inputField: {
    flex: 1,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  typingPortrait: {
    fontSize: 16,
  },
});
