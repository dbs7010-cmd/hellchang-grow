import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { ChipRow } from '@/components/ui/chip-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { BodyGoalDescriptions, BodyGoalIds, BodyGoalLabels, resolveBodyGoal } from '@/config/body-goals';
import { BodyPresetId, BodyPresetLabels } from '@/config/body-presets';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useTheme } from '@/hooks/use-theme';
import { toDateString } from '@/utils/date';
import { resolveMonetizationVisibility } from '@/utils/monetization-visibility';

type SectionId = 'profile' | 'goal' | 'subscription' | 'referral' | 'event' | 'reset';
const monetizationVisibility = resolveMonetizationVisibility(
  typeof __DEV__ !== 'undefined' && __DEV__
);

/**
 * 16 SETTINGS.
 *
 * 개발용 메뉴처럼 보이던 목록을 세 그룹(내 정보 / 서비스 / 데이터)으로 나눴다.
 * 출시 빌드에서는 "(테스트)", "개발/테스트용" 같은 개발자 문구가 노출되지 않도록
 * __DEV__로 구분한다 — 기능 자체는 그대로 두고 표기만 바꾼다.
 *
 * 실제로 저장된 값만 보여준다. 운동 목표는 여기서 바꾸며, 바뀐 값은 추천/AI PT가 공통으로
 * 참조하는 컨텍스트(utils/recommendation-context.ts)로 흘러간다.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const {
    profile,
    hasSubscriptionAccess,
    referral,
    openEventPass,
    updateProfile,
    subscribeMock,
    cancelSubscriptionMock,
    redeemReferralCode,
    activateOpenEventPass,
    resetAllData,
  } = useAppData();

  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

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
  const bodyGoal = resolveBodyGoal(profile?.bodyGoal);
  // 유료 여부를 이 화면에서 다시 계산하지 않는다 — context의 단일 entitlement 결과를 읽는다.
  const isSubscribed = hasSubscriptionAccess;

  return (
    <ScreenScroll gap={Spacing.three}>
      <ThemedText type="heading">설정</ThemedText>

      <Section title="내 정보" gap={Spacing.one}>
        <SettingsRow
          id="profile"
          label="프로필"
          value={
            profile
              ? `${profile.genderExpression === 'female' ? '여성' : '남성'} · ${profile.weightKg}kg`
              : '정보 없음'
          }
          openSection={openSection}
          onToggle={toggleSection}>
          {profile ? (
            <>
              <InfoLine label="성별" value={profile.genderExpression === 'female' ? '여성' : '남성'} />
              <InfoLine label="키" value={profile.heightCm ? `${profile.heightCm}cm` : '미입력'} />
              <InfoLine label="현재 체중" value={`${profile.weightKg}kg`} />
              <InfoLine label="현재 체형" value={BodyPresetLabels[profile.bodyPresetId as BodyPresetId]} />
              <ThemedText type="caption" themeColor="textSecondary">
                체중·체지방률·사진 기록은 히스토리의 [몸 변화]에서 추가해요.
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              프로필 정보가 없어요.
            </ThemedText>
          )}
        </SettingsRow>

        <SettingsRow
          id="goal"
          label="운동 목표"
          value={BodyGoalLabels[bodyGoal]}
          openSection={openSection}
          onToggle={toggleSection}>
          {/* 성별로 목표를 나누지 않는다 — 모두 같은 세 가지를 쓴다. */}
          <ChipRow wrap>
            {BodyGoalIds.map((goal) => (
              <Chip
                key={goal}
                label={BodyGoalLabels[goal]}
                selected={bodyGoal === goal}
                onPress={() => updateProfile({ bodyGoal: goal })}
              />
            ))}
          </ChipRow>
          <ThemedText type="caption" themeColor="textSecondary">
            {BodyGoalDescriptions[bodyGoal]}
          </ThemedText>
        </SettingsRow>
      </Section>

      <Section title="서비스" gap={Spacing.one}>
        <SettingsRow
          id="subscription"
          label="구독"
          value={isSubscribed ? '구독 중' : '구독 안 함'}
          openSection={openSection}
          onToggle={toggleSection}>
          <ThemedText type="caption" themeColor="textSecondary">
            구독하면 광고 없이 AI PT를 이용할 수 있어요.
          </ThemedText>
          {/*
            결제 SDK가 아직 없다. 그래서 출시 빌드에는 **구독 버튼을 두지 않는다** — 누르면
            결제한 것처럼 보이는 버튼은 거짓말이고, 그 경로가 그대로 premium 우회가 된다.
            아래 mock 조작은 개발 빌드에서만 존재하고, 그것이 남기는 기록조차
            provider: 'dev'로 표시되어 출시 빌드에서는 권리를 만들지 못한다.
          */}
          {__DEV__ ? (
            <>
              {isSubscribed ? (
                <PrimaryButton label="구독 해지" variant="secondary" onPress={cancelSubscriptionMock} />
              ) : (
                <PrimaryButton label="구독하기" variant="secondary" onPress={() => subscribeMock('pro')} />
              )}
              <ThemedText type="caption" themeColor="textSecondary">
                DEV: 결제 연동 전이라 mock 구독으로 동작해요. 이 구독은 출시 빌드에서 인정되지 않아요.
              </ThemedText>
            </>
          ) : (
            <ThemedText type="caption" themeColor="textSecondary">
              결제 준비 중이에요. 지금은 광고를 보면 AI PT를 이용할 수 있어요.
            </ThemedText>
          )}
        </SettingsRow>

        {monetizationVisibility.referral && (
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
                <PrimaryButton label="등록" variant="secondary" onPress={handleRedeemReferral} />
              </>
            )}
          </SettingsRow>
        )}

        {monetizationVisibility.openEventPass && (
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
        )}
      </Section>

      <Section title="데이터" gap={Spacing.one}>
        <SettingsRow
          id="reset"
          label="데이터 초기화"
          value=""
          openSection={openSection}
          onToggle={(id) => {
            setConfirmReset(false);
            toggleSection(id);
          }}>
          <ThemedText type="small" themeColor="textSecondary">
            기기에 저장된 모든 기록(운동·체중·사진·루틴)을 지우고 처음부터 다시 시작해요. 되돌릴 수
            없어요.
          </ThemedText>
          {/* 되돌릴 수 없는 동작이므로 일반 메뉴보다 약하게 두고, 반드시 한 단계 더 확인한다. */}
          {confirmReset ? (
            <View style={styles.inlineRow}>
              <PrimaryButton
                label="취소"
                variant="secondary"
                style={styles.flexItem}
                onPress={() => setConfirmReset(false)}
              />
              <Pressable onPress={resetAllData} style={[styles.destructive, { borderColor: theme.mutedRed }]}>
                <ThemedText type="smallBold" style={{ color: theme.mutedRed }}>
                  모두 지우기
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmReset(true)} hitSlop={8} style={styles.destructiveLink}>
              <ThemedText type="captionBold" style={{ color: theme.mutedRed }}>
                초기화하기
              </ThemedText>
            </Pressable>
          )}
        </SettingsRow>
      </Section>
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
        <ThemedText type="smallBold" themeColor="textSecondary">
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
  inlineRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  flexItem: {
    flex: 1,
  },
  destructive: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.medium,
    minHeight: Layout.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveLink: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
});
