import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { AiQuickActionIds, AiQuickActionLabels } from '@/config/ai-quick-actions';
import { StanleyTrainer } from '@/config/trainers';
import { Radius, Spacing } from '@/constants/theme';
import { AiQuickActionId, AiTrainerMessage } from '@/services/trainer/ai-trainer-service';
import { createId } from '@/utils/id';

interface AiPtMessage {
  id: string;
  role: 'user' | 'trainer';
  text: string;
}

export interface AiPtPanelProps {
  accessLabel: string;
  /**
   * 트레이너 화면의 빠른 질문으로 들어온 경우, 화면을 열자마자 그 질문을 한 번 보낸다.
   * 대화 UI/이용권 소모 경로는 사용자가 직접 누른 것과 완전히 동일하다.
   */
  initialQuickAction?: AiQuickActionId;
  onQuickAction: (actionId: AiQuickActionId) => Promise<AiTrainerMessage | null>;
  onSendMessage: (text: string) => Promise<AiTrainerMessage | null>;
}

export function AiPtPanel({ accessLabel, initialQuickAction, onQuickAction, onSendMessage }: AiPtPanelProps) {
  const [messages, setMessages] = useState<AiPtMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const appendMessage = (role: AiPtMessage['role'], text: string) => {
    setMessages((prev) => [...prev, { id: createId('ai-msg'), role, text }]);
  };

  const handleReply = async (getReply: () => Promise<AiTrainerMessage | null>) => {
    setLoading(true);
    try {
      const reply = await getReply();
      appendMessage('trainer', reply?.text ?? '이용권이 부족해요. 광고를 보거나 구독하면 다시 이용할 수 있어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (actionId: AiQuickActionId) => {
    appendMessage('user', AiQuickActionLabels[actionId]);
    handleReply(() => onQuickAction(actionId));
  };

  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!initialQuickAction || autoSentRef.current) return;
    autoSentRef.current = true;
    handleQuickAction(initialQuickAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuickAction]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;
    appendMessage('user', trimmed);
    setInputText('');
    handleReply(() => onSendMessage(trimmed));
  };

  return (
    <View style={styles.container}>
      <ThemedText type="caption" themeColor="textSecondary">
        {accessLabel}
      </ThemedText>

      <ChipRow bleed>
        {AiQuickActionIds.map((actionId) => (
          <Chip
            key={actionId}
            label={AiQuickActionLabels[actionId]}
            onPress={() => handleQuickAction(actionId)}
          />
        ))}
      </ChipRow>

      {messages.length > 0 && (
        <View style={styles.messages}>
          {messages.map((message) => (
            <MessageBubble key={message.id} role={message.role} text={message.text} />
          ))}
        </View>
      )}

      {loading && <TypingIndicator />}

      <View style={styles.inputRow}>
        <TextField
          value={inputText}
          onChangeText={setInputText}
          placeholder="직접 물어보기"
          containerStyle={styles.inputField}
          onSubmitEditing={handleSend}
        />
        <PrimaryButton label="전송" variant="secondary" onPress={handleSend} disabled={loading} />
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

/** "골드썬이 보고 있습니다..." — 흰 ChatGPT 느낌의 로딩 대신 쓰는 은은한 3-dot. */
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
    gap: Spacing.three,
  },
  messages: {
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
