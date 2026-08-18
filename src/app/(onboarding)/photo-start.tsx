import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PhotoSlot } from '@/components/ui/photo-slot';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenScroll } from '@/components/ui/screen-scroll';
import { SectionCard } from '@/components/ui/section-card';
import { useOnboardingDraft } from '@/context/onboarding-draft-context';
import { useTheme } from '@/hooks/use-theme';

export default function PhotoStartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { draft, setPhotoUri } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const handlePickPhoto = async () => {
    setError(null);
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('사진 접근 권한이 필요해요. 기기 설정에서 허용한 뒤 다시 시도해주세요.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setPhotoUri(result.assets[0].uri);
    } catch {
      setError('사진을 불러오지 못했어요. 다시 시도해주세요.');
    } finally {
      setPicking(false);
    }
  };

  return (
    <ScreenScroll>
      <SectionCard>
        <ThemedText style={styles.emoji}>📷</ThemedText>
        <ThemedText type="subtitle" style={styles.centerText}>
          내 사진으로 시작하기
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          몸 형태 참고용 사진이에요. 이 사진을 AI로 바꾸는 기능은 아직 준비 중이라, 다음 화면에서
          체형을 직접 골라서 보정해요.
        </ThemedText>
      </SectionCard>

      <PhotoSlot label={draft.photoUri ? '선택한 사진' : '사진 없음'} photoUri={draft.photoUri} />

      {error && (
        <ThemedText type="small" style={{ color: theme.mutedRed }}>
          {error}
        </ThemedText>
      )}

      <PrimaryButton
        label={draft.photoUri ? '다른 사진 선택하기' : '사진 선택하기'}
        onPress={handlePickPhoto}
        disabled={picking}
      />

      {draft.photoUri && (
        <PrimaryButton label="이 사진으로 계속하기" onPress={() => router.push('/gender')} />
      )}

      <PrimaryButton
        label="무료 체형 선택으로 시작하기"
        variant="secondary"
        onPress={() => {
          setPhotoUri(undefined);
          router.push('/gender');
        }}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  emoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
