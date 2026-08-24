export interface MonetizationVisibility {
  referral: boolean;
  openEventPass: boolean;
}

/** 실제 provider/혜택이 없는 V1 검증 기능은 개발 빌드에서만 노출한다. */
export function resolveMonetizationVisibility(isDev: boolean): MonetizationVisibility {
  return {
    referral: isDev,
    openEventPass: isDev,
  };
}
