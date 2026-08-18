import { Colors } from '@/constants/theme';

/**
 * 헬창키우기는 IRON GRAPHITE + WARM GOLD가 고정 비주얼 캐논이다 — 시스템 라이트 모드를
 * 따라가면 "일반적인 흰색 피트니스 앱"처럼 보이게 되므로, 시스템 설정과 무관하게 항상
 * 다크 팔레트(Colors.dark)를 쓴다. Colors.light는 향후 라이트 모드 토글을 지원할 때를
 * 대비해 값만 유지한다.
 */
export function useTheme() {
  return Colors.dark;
}
