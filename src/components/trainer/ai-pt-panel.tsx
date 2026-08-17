import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { AiQuickActionIds, AiQuickActionLabels } from '@/config/ai-quick-actions';
import { Spacing } from '@/constants/theme';
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
            <ThemedView
              key={message.id}
              type={message.role === 'user' ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.bubble, message.role === 'user' && styles.bubbleUser]}>
              <ThemedText type="small">{message.text}</ThemedText>
            </ThemedView>
          ))}
        </View>
      )}

      {loading && (
        <ThemedText type="small" themeColor="textSecondary">
          생각 중...
        </ThemedText>
      )}

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
    borderRadius: Spacing.three,
    padding: Spacing.three,
    maxWidth: '90%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
  },
  inputRow: {
    gap: Spacing.two,
  },
});
