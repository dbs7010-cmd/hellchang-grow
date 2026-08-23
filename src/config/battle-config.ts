/**
 * GYM BATTLE 진행 규칙의 숫자. **바뀔 가능성이 높은 값은 로직이 아니라 여기 한 곳에만 둔다** —
 * app-config / growth-config가 이미 쓰는 방식 그대로다.
 *
 * v1의 목표는 밸런싱이 아니라 "이해 가능하고 결정적인 진행 규칙"이다. 숫자를 바꾸면
 * `scripts/verify-battle-core.ts`가 규칙이 깨졌는지 바로 알려 준다.
 */
export const BattleConfig = {
  power: {
    /**
     * 유효 세트 하나가 만드는 전투력.
     *
     * 세트를 기본 축으로 두는 이유는 **맨몸 운동도 정상적인 전투력이 나와야** 하기 때문이다.
     * 0kg × 10회를 세 세트 한 사람도 볼륨이 0일 뿐 실제로 운동했고, 그 노력이 전투에서
     * 0이 되면 안 된다.
     */
    perEffectiveSet: 2,
    /**
     * 볼륨을 전투력으로 바꿀 때의 기준 단위(kg). `sqrt(volume / unit)`로 환산한다.
     *
     * 제곱근을 쓰는 것은 **중량만 높은 사용자가 선형으로 앞서 나가지 않게** 하기 위해서다.
     * 볼륨이 4배가 되어야 이 항이 2배가 되므로, 무겁게 드는 쪽이 유리하되 압도하지는 않는다.
     */
    volumeUnitKg: 100,
    /**
     * 실제로 운동했다면 최소한 이만큼은 적을 때린다. 피로도가 아무리 높아도 여기 아래로
     * 내려가지 않는다 — "운동했는데 전투력 0"은 만들지 않는다.
     */
    minimumWhenTrained: 1,
  },

  /**
   * 피로도 구간별 전투력 배수. 높을수록 효율이 떨어지지만 **막지는 않는다** —
   * 최대 감소가 30%이고, 그마저 위의 최소 전투력이 받쳐 준다.
   * 구간은 위에서부터 검사하므로 threshold 내림차순으로 둔다.
   */
  fatiguePenalty: [
    { fatigueAtLeast: 90, multiplier: 0.7 },
    { fatigueAtLeast: 70, multiplier: 0.8 },
    { fatigueAtLeast: 40, multiplier: 0.9 },
    { fatigueAtLeast: 0, multiplier: 1 },
  ],

  recovery: {
    /**
     * 시간당 회복하는 피로도. **아직 앱 lifecycle에 연결하지 않는다** — 순수 함수와 정책만
     * 정의해 두고, 언제 얼마가 흘렀는지는 호출부가 넘긴다(resolver는 시계를 읽지 않는다).
     */
    fatiguePerHour: 2,
  },

  reward: {
    /** 적에게 준 피해 1당 전투 재화. Workout XP/SP와 완전히 별개의 게임 재화다. */
    coinsPerDamage: 1,
  },

  economy: {
    /**
     * 누적 재화 상한. 경제 시스템을 만드는 값이 아니라 **overflow 안전장치**다 —
     * 손상된 저장값이나 비정상 입력이 재화를 무한대로 밀어 올리지 못하게 막는 바닥선.
     */
    maxCoins: 9_999_999,
    /**
     * 보관하는 해금 토큰 개수 상한. 토큰은 stage당 하나뿐이라 실제로 닿을 일이 없고,
     * 손상된 저장값이 배열을 무한히 키우는 것만 막는다.
     */
    maxUnlockTokens: 200,
  },
} as const;
