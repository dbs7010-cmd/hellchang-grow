import { AppConfig } from '@/config/app-config';

export interface NumericRange {
  min: number;
  max: number;
}

/**
 * 한글 목적격 조사(을/를)를 받침에 맞게 붙인다.
 * "키을(를) 확인해주세요" 같은 어색한 문구 대신 "키를 확인해주세요"가 되게 한다.
 */
function withObjectParticle(label: string): string {
  const last = label.charCodeAt(label.length - 1);
  const isHangulSyllable = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangulSyllable) return `${label}을`;
  const hasFinalConsonant = (last - 0xac00) % 28 !== 0;
  return `${label}${hasFinalConsonant ? '을' : '를'}`;
}

/** ok를 판별자로 둬서 호출부에서 값/에러가 확실히 좁혀지게 한다. */
export type RequiredNumberResult = { ok: true; value: number } | { ok: false; error: string };
export type OptionalNumberResult = { ok: true; value?: number } | { ok: false; error: string };

/**
 * 온보딩/설정/히스토리가 공유하는 숫자 입력 검증.
 *
 * 화면마다 다른 범위를 하드코딩하지 않도록 범위는 전부 AppConfig에서 온다.
 * 입력 중에 매번 경고를 띄우지 않도록, 이 함수들은 "다음으로 넘어가려 할 때" 한 번만 쓴다.
 */

/** 필수 숫자 입력. 비어 있거나 범위를 벗어나면 짧은 안내 문구를 돌려준다. */
export function validateRequiredNumber(
  raw: string,
  range: NumericRange,
  label: string
): RequiredNumberResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: `${withObjectParticle(label)} 입력해주세요.` };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, error: `${withObjectParticle(label)} 숫자로 입력해주세요.` };
  if (value < range.min || value > range.max) return { ok: false, error: `${withObjectParticle(label)} 확인해주세요.` };

  return { ok: true, value };
}

/**
 * 선택 숫자 입력. 비어 있으면 값 없이 통과한다 (건너뛰기 가능) —
 * 모른다고 해서 진행이 막히면 안 되기 때문이다. 값이 있으면 범위만 확인한다.
 */
export function validateOptionalNumber(
  raw: string,
  range: NumericRange,
  label: string
): OptionalNumberResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, error: `${withObjectParticle(label)} 숫자로 입력해주세요.` };
  if (value < range.min || value > range.max) return { ok: false, error: `${withObjectParticle(label)} 확인해주세요.` };

  return { ok: true, value };
}

export const HeightRangeCm = AppConfig.profileHeightRangeCm;
export const WeightRangeKg = AppConfig.profileWeightRangeKg;
export const BodyFatPercentRange = AppConfig.bodyFatPercentRange;
export const SkeletalMuscleRangeKg = AppConfig.skeletalMuscleRangeKg;
