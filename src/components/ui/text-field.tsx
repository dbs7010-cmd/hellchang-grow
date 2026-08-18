import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  /**
   * 바깥 컨테이너 스타일. style은 TextInput 자체에 적용되므로, 행(row) 안에서
   * flex:1로 늘리려면 반드시 이쪽을 써야 한다.
   */
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({ label, style, containerStyle, ...rest }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <ThemedText type="small">{label}</ThemedText>}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
