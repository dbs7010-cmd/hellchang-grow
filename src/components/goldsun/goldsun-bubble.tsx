import { Image } from 'expo-image';
import { ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface GoldsunBubbleProps {
  /**
   * 실제 포트레이트 이미지, 또는 에셋이 없을 때의 이모지 placeholder 문자열.
   * 어느 쪽이든 원형(40)의 크기/위치는 같다 — 이미지는 그 안에서 cover로만 채워진다.
   */
  portrait: string | ImageSourcePropType;
  name: string;
  text: string;
  onPress?: () => void;
}

/**
 * 트레이너 portrait + 말풍선 한마디. 큰 트레이너 카드가 아니라 홈/세션 등에서 작게 재사용한다.
 *
 * 말풍선 안에 "- 이름 -" 서명을 넣지 않는다 — 옆의 portrait가 이미 화자를 말해준다.
 * name은 화면에 그리지 않고 접근성 라벨로만 쓴다.
 */
export function GoldsunBubble({ portrait, name, text, onPress }: GoldsunBubbleProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      hitSlop={8}
      accessibilityLabel={`${name}: ${text}`}>
      <View style={[styles.bubble, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="small" style={styles.bubbleText} numberOfLines={3}>
          {text}
        </ThemedText>
      </View>
      <View style={[styles.portrait, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
        {typeof portrait === 'string' ? (
          <ThemedText style={styles.portraitEmoji}>{portrait}</ThemedText>
        ) : (
          <Image source={portrait} style={styles.portraitImage} contentFit="cover" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // width:'100%' + justifyContent:'flex-end'로 이 컴포넌트 스스로 오른쪽 끝에 맞춘다 —
  // 부모의 alignItems에만 의존하면 실기기에서 portrait가 화면 밖으로 밀려나가는 경우가 있었다.
  // gap을 두지 않고 말풍선이 portrait 아래로 살짝 파고들게 한다 — 따로 떠 있는 프로필
  // 아이콘이 아니라 "말하고 있는 사람 + 그 말"이 한 덩어리로 읽히게 하려는 것.
  // portrait가 뒤에 오므로 겹치는 부분에서 위에 그려진다. 오른쪽 끝 위치는 그대로다.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    width: '100%',
  },
  bubble: {
    flexShrink: 1,
    maxWidth: '76%',
    borderRadius: Radius.medium,
    // portrait와 맞닿는 모서리만 각지게 해서 꼬리처럼 화자를 가리킨다.
    borderBottomRightRadius: Radius.small,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    paddingRight: Spacing.three,
    marginRight: -Spacing.three,
    gap: Spacing.half,
  },
  bubbleText: {
    lineHeight: 18,
  },
  // 말풍선과 같은 테두리 색/두께를 써서 두 조각이 하나의 덩어리로 보이게 한다.
  // gold 링을 두르면 작은 아이콘 하나가 플레이어 캐릭터보다 먼저 눈에 들어왔다.
  portrait: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // 실제 포트레이트가 들어와도 원형 밖으로 새지 않게만 한다. 크기/위치는 그대로다.
    overflow: 'hidden',
  },
  portraitEmoji: {
    fontSize: 18,
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
});
