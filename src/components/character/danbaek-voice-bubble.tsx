import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function DanbaekVoiceBubble({ line, status }: { line: string; status?: string | null }) {
  const theme = useTheme();
  return <View style={[styles.bubble,{backgroundColor:theme.backgroundElement,borderColor:theme.border}]}><ThemedText type="smallBold">“{line}”</ThemedText>{status?<ThemedText type="caption" themeColor="textSecondary">{status}</ThemedText>:null}</View>;
}
const styles=StyleSheet.create({bubble:{alignSelf:'center',maxWidth:280,borderWidth:1,borderRadius:Radius.large,paddingHorizontal:Spacing.three,paddingVertical:Spacing.two,gap:Spacing.half}});
