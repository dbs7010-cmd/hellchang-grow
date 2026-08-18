import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { BodyPresetId, BodyPresetLabels } from '@/config/body-presets';
import { Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { toDateString } from '@/utils/date';

type SectionId = 'subscription' | 'referral' | 'event' | 'reset';

/**
 * 16 SCREEN 중 "16 SETTINGS". SectionCard가 5개 연달아 쌓이던 이전 구조를 폐기하고,
 * CANON의 "compact row + chevron" 아코디언 패턴으로 바꿨다 — row를 탭하면 그 아래에만
 * 상세 조작 영역이 펼쳐지고, 다른 row를 열면 접힌다. 도메인 로직(subscribeMock,
 * redeemReferralCode, activateOpenEventPass, resetAllData)은 그대로 재사용한다.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const {
    profile,
    subscription,
    referral,
    openEventPass,
    subscribeMock,
    cancelSubscriptionMock,
    redeemReferralCode,
    activateOpenEventPass,
    resetAllData,
  } = useAppData();

  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState<string | null>(null);

  const toggleSection = (id: SectionId) => setOpenSection((prev) => (prev === id ? null : id));

  const handleRedeemReferral = async () => {
    const result = await redeemReferralCode(referralCode);
    if (result.success) {
      setReferralMessage(`등록 완료! 무료 패스 +${result.bonusDaysGranted}일 지급됐어요.`);
      setReferralCode('');
    } else if (result.reason === 'already_redeemed') {
      setReferralMessage('이미 추천인 코드를 등록했어요.');
    } else {
      setReferralMessage('코드를 입력해주세요.');
    }
  };

  const alreadyRedeemed = Boolean(referral.referredByCode);

  return (
    <ScreenScroll>
      <ThemedText type="heading">내 정보 / 설정</ThemedText>

      <View style={[styles.infoRow, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">내 정보</ThemedText>
        {profile ? (
          <ThemedText type="small" themeColor="textSecondary">
            {profile.genderExpression === 'female' ? '여' : '남'} ·{' '}
            {BodyPresetLabels[profile.bodyPresetId as BodyPresetId]} · {profile.weightKg}kg
            {profile.heightCm ? ` · 키 ${profile.heightCm}cm` : ''}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            프로필 정보가 없어요.
          </ThemedText>
        )}
      </View>

      <SettingsRow
        id="subscription"
        label="구독 (테스트)"
        value={subscription.status === 'active' ? '구독 중' : '구독 안 함'}
        openSection={openSection}
        onToggle={toggleSection}>
        {subscription.status === 'active' ? (
          <PrimaryButton label="구독 해지 (테스트)" variant="secondary" onPress={cancelSubscriptionMock} />
        ) : (
          <PrimaryButton label="구독하기 (테스트)" onPress={() => subscribeMock('pro')} />
        )}
      </SettingsRow>

      <SettingsRow
        id="referral"
        label="추천인"
        value={`보너스 ${referral.bonusDaysGranted}일`}
        openSection={openSection}
        onToggle={toggleSection}>
        {alreadyRedeemed ? (
          <ThemedText type="small" themeColor="textSecondary">
            등록된 코드: {referral.referredByCode} (중복 등록은 보너스가 지급되지 않아요)
          </ThemedText>
        ) : (
          <>
            <TextField
              label="추천인 코드"
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="코드 입력"
            />
            {referralMessage && (
              <ThemedText type="small" themeColor="textSecondary">
                {referralMessage}
              </ThemedText>
            )}
            <PrimaryButton label="등록" onPress={handleRedeemReferral} />
          </>
        )}
      </SettingsRow>

      <SettingsRow
        id="event"
        label="오픈 이벤트 패스"
        value={
          openEventPass.active
            ? `이용 중 · ~${openEventPass.expiresAt ? toDateString(new Date(openEventPass.expiresAt)) : ''}`
            : '미활성'
        }
        openSection={openSection}
        onToggle={toggleSection}>
        {openEventPass.active ? (
          <ThemedText type="small" themeColor="textSecondary">
            이미 이용 중이에요.
          </ThemedText>
        ) : (
          <PrimaryButton
            label={`무료 패스 받기 (${AppConfig.openEventPassDays}일)`}
            variant="secondary"
            onPress={activateOpenEventPass}
          />
        )}
      </SettingsRow>

      <SettingsRow
        id="reset"
        label="데이터 초기화"
        value="개발/테스트용"
        openSection={openSection}
        onToggle={toggleSection}>
        <ThemedText type="small" themeColor="textSecondary">
          모든 로컬 기록을 지우고 온보딩부터 다시 시작해요.
        </ThemedText>
        <PrimaryButton label="초기화" variant="secondary" onPress={resetAllData} />
      </SettingsRow>
    </ScreenScroll>
  );
}

function SettingsRow({
  id,
  label,
  value,
  openSection,
  onToggle,
  children,
}: {
  id: SectionId;
  label: string;
  value: string;
  openSection: SectionId | null;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isOpen = openSection === id;

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Pressable onPress={() => onToggle(id)} style={styles.rowHeader}>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {value}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={{ color: theme.gold }}>
          {isOpen ? '⌄' : '›'}
        </ThemedText>
      </Pressable>
      {isOpen && <View style={styles.rowBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  row: {
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    minHeight: 44,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
});
