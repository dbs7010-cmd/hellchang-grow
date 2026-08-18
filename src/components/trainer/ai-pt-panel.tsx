import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
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
  onQuickAction: (actionId: AiQuickActionId) => Promise<AiTrainerMessage | null>;
  onSendMessage: (text: string) => Promise<AiTrainerMessage | null>;
}

export function AiPtPanel({ accessLabel, onQuickAction, onSendMessage }: AiPtPanelProps) {
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

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;
    appendMessage('user', trimmed);
    setInputText('');
    handleReply(() => onSendMessage(trimmed));
  };

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {accessLabel}
      </ThemedText>

      <View style={styles.chipRow}>
        {AiQuickActionIds.map((actionId) => (
          <Chip
            key={actionId}
            label={AiQuickActionLabels[actionId]}
            onPress={() => handleQuickAction(actionId)}
          />
        ))}
      </View>

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
    <Animated.View style={animatedStyle}>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  messages: {
    gap: Spacing.two,
  },
  bubble: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    maxWidth: '90%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
  },
  inputRow: {
    gap: Spacing.two,
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
