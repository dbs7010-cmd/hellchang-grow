import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { BodyPresetId, BodyPresetLabels } from '@/config/body-presets';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { toDateString } from '@/utils/date';

type SectionId = 'profile' | 'subscription' | 'referral' | 'event' | 'reset';

/**
 * 16 SETTINGS. 설정은 재미있을 필요가 없는 화면이다 — compact row + 아코디언만 쓴다.
 * 도메인 로직(subscribeMock, redeemReferralCode, activateOpenEventPass, resetAllData)은
 * 그대로 재사용한다.
 *
 * [내 정보]는 실제로 저장된 프로필 값(성별 표현 / 현재 체형 / 키 / 체중)만 라벨-값 행으로
 * 펼친다. 목표 체형 / Body Goal 행은 도메인이 생기면 이 목록에 그대로 추가하면 되고,
 * 지금은 없는 값을 지어내지 않는다.
 */
export default function SettingsScreen() {
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
    <ScreenScroll gap={Spacing.two}>
      <ThemedText type="heading">설정</ThemedText>

      <SettingsRow
        id="profile"
        label="내 정보"
        value={profile ? `${profile.weightKg}kg${profile.heightCm ? ` · ${profile.heightCm}cm` : ''}` : '정보 없음'}
        openSection={openSection}
        onToggle={toggleSection}>
        {profile ? (
          <>
            <InfoLine label="성별 표현" value={profile.genderExpression === 'female' ? '여성' : '남성'} />
            <InfoLine label="현재 체형" value={BodyPresetLabels[profile.bodyPresetId as BodyPresetId]} />
            <InfoLine label="키" value={profile.heightCm ? `${profile.heightCm}cm` : '미입력'} />
            <InfoLine label="체중" value={`${profile.weightKg}kg`} />
            <ThemedText type="caption" themeColor="textSecondary">
              체중/사진 기록은 히스토리의 BODY GROWTH에서 추가해요.
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            프로필 정보가 없어요.
          </ThemedText>
        )}
      </SettingsRow>

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
              <ThemedText type="caption" themeColor="textSecondary">
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
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
        <ThemedText type="smallBold" style={styles.rowLabel}>
          {label}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.rowValue}>
          {value}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.gold }}>
          {isOpen ? '⌄' : '›'}
        </ThemedText>
      </Pressable>
      {isOpen && <View style={styles.rowBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  /** 라벨과 값을 한 줄에 둬서 설정 목록이 세로로 두 배가 되지 않게 한다. */
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: Layout.compactRowHeight,
  },
  rowLabel: {
    flexShrink: 0,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  rowBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
