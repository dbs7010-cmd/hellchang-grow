import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { Colors, Layout, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * 웹 미리보기용 탭바. 네이티브 NativeTabs와 같은 규칙을 따른다 —
 * 선택은 Gold 아이콘 + 흰 라벨로만 드러내고, 큰 pill 배경을 쓰지 않는다.
 */
const TABS = [
  { name: 'home', href: '/', icon: '🏠', label: '홈' },
  { name: 'workout', href: '/workout', icon: '🏋', label: '운동' },
  { name: 'trainer', href: '/trainer', icon: '🕶', label: '트레이너' },
  { name: 'history', href: '/history', icon: '📈', label: '히스토리' },
  { name: 'settings', href: '/settings', icon: '⚙️', label: '설정' },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon?: string }) {
  const colors = Colors.dark;
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedText style={[styles.icon, !isFocused && styles.iconMuted]}>{icon}</ThemedText>
      <ThemedText type="caption" style={{ color: isFocused ? colors.text : colors.textSecondary }}>
        {children}
      </ThemedText>
      <View
        style={[styles.activeBar, { backgroundColor: isFocused ? colors.gold : 'transparent' }]}
      />
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const colors = Colors.dark;
  return (
    <View
      {...props}
      style={[styles.tabListContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopWidth: 1,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    minHeight: Layout.compactRowHeight,
  },
  icon: {
    fontSize: 18,
  },
  iconMuted: {
    opacity: 0.45,
  },
  activeBar: {
    marginTop: 2,
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
