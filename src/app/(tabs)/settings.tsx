import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { TextField } from '@/components/ui/text-field';
import { AppConfig } from '@/config/app-config';
import { BodyPresetId, BodyPresetLabels } from '@/config/body-presets';
import { useAppData } from '@/context/app-data-context';
import { toDateString } from '@/utils/date';

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

  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState<string | null>(null);

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

      <SectionCard title="내 정보">
        {profile ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              성별 표현: {profile.genderExpression === 'female' ? '여' : '남'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              체형: {BodyPresetLabels[profile.bodyPresetId as BodyPresetId]}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              체중: {profile.weightKg}kg{profile.heightCm ? ` · 키 ${profile.heightCm}cm` : ''}
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            프로필 정보가 없어요.
          </ThemedText>
        )}
      </SectionCard>

      <SectionCard title="구독 (테스트)">
        <ThemedText type="small" themeColor="textSecondary">
          현재 상태: {subscription.status === 'active' ? '구독 중' : '구독 안 함'}
        </ThemedText>
        {subscription.status === 'active' ? (
          <PrimaryButton label="구독 해지 (테스트)" variant="secondary" onPress={cancelSubscriptionMock} />
        ) : (
          <PrimaryButton label="구독하기 (테스트)" onPress={() => subscribeMock('pro')} />
        )}
      </SectionCard>

      <SectionCard title="추천인">
        <ThemedText type="small" themeColor="textSecondary">
          누적 보너스: {referral.bonusDaysGranted}일
        </ThemedText>
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
      </SectionCard>

      <SectionCard title="오픈 이벤트 패스">
        <ThemedText type="small" themeColor="textSecondary">
          {openEventPass.active
            ? `이용 중 (만료: ${openEventPass.expiresAt ? toDateString(new Date(openEventPass.expiresAt)) : ''})`
            : '아직 활성화되지 않았어요.'}
        </ThemedText>
        {!openEventPass.active && (
          <PrimaryButton
            label={`무료 패스 받기 (${AppConfig.openEventPassDays}일)`}
            variant="secondary"
            onPress={activateOpenEventPass}
          />
        )}
      </SectionCard>

      <SectionCard title="데이터 초기화">
        <ThemedText type="small" themeColor="textSecondary">
          모든 로컬 기록을 지우고 온보딩부터 다시 시작해요. 개발/테스트용이에요.
        </ThemedText>
        <PrimaryButton label="초기화" variant="secondary" onPress={resetAllData} />
      </SectionCard>
    </ScreenScroll>
  );
}
