import { localGrowthEngine } from '@/services/growth/local-growth-engine';
import type { GrowthEngine } from '@/services/growth/growth-engine';

/**
 * 앱이 실제로 쓰는 GrowthEngine 구현을 고르는 단 하나의 자리
 * (services/trainer/index.ts와 같은 패턴). 화면/Context는 구현을 직접 import하지 않는다.
 */
export const growthEngine: GrowthEngine = localGrowthEngine;

export type { GrowthEngine } from '@/services/growth/growth-engine';
