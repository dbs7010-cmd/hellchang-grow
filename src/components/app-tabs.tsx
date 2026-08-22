import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors, HomeColors } from '@/constants/theme';

/**
 * Bottom navigation.
 *
 * 선택 상태는 "크고 흐릿한 pill"이 아니라 Gold 아이콘 + 흰 라벨로만 드러낸다 —
 * 탭바가 화면 콘텐츠보다 강하게 보이면 안 된다. 비선택은 muted gray.
 * Android Material의 커다란 선택 indicator(pill)는 disableIndicator로 끈다.
 * 시스템 내비게이션 영역과의 간섭은 NativeTabs가 처리한다.
 */
export default function AppTabs() {
  const isHome = usePathname() === '/';
  const colors = isHome ? HomeColors : Colors.dark;
  const defaultColor = isHome ? HomeColors.navMuted : colors.textSecondary;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      disableIndicator
      iconColor={{ default: defaultColor, selected: colors.gold }}
      labelStyle={{
        default: { color: defaultColor },
        selected: { color: colors.gold },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="workout">
        <NativeTabs.Trigger.Label>운동</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dumbbell" md="fitness_center" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trainer">
        <NativeTabs.Trigger.Label>트레이너</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>히스토리</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>설정</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
