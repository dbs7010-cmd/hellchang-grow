import type { WorkoutExercise, WorkoutRecord } from '@/types/workout';
import { countCompletedSets, effectiveSetDetails } from '@/utils/workout-stats';

export type GymBattleEnemyId = 'bench-monster' | 'squat-golem' | 'deadlift-beast' | 'pullup-phantom';

export interface GymBattleEnemy {
  id: GymBattleEnemyId;
  name: string;
  attackName: string;
  hp: number;
  match: readonly string[];
}

export interface GymBattleProgress {
  enemy: GymBattleEnemy;
  damage: number;
  remainingHp: number;
  defeated: boolean;
  attacks: number;
  latestDamage: number;
  latestExerciseName: string | null;
}

/**
 * 운동과 게임을 별개로 만들지 않는다. 실제 저장된 운동 기록만 적에게 피해를 준다.
 * V1 vertical slice는 대표 복합운동 네 개만 연다. 다른 운동은 기존 성장/기록에는 정상 반영되지만
 * 전투에는 아직 들어오지 않는다.
 */
export const GymBattleEnemies: readonly GymBattleEnemy[] = Object.freeze([
  Object.freeze({ id: 'bench-monster', name: '벤치 몬스터', attackName: '벤치 프레스', hp: 120, match: ['벤치프레스', '벤치 프레스', 'bench press'] }),
  Object.freeze({ id: 'squat-golem', name: '스쿼트 골렘', attackName: '스쿼트', hp: 140, match: ['스쿼트', 'squat'] }),
  Object.freeze({ id: 'deadlift-beast', name: '데드리프트 비스트', attackName: '데드리프트', hp: 160, match: ['데드리프트', 'deadlift'] }),
  Object.freeze({ id: 'pullup-phantom', name: '풀업 팬텀', attackName: '풀업', hp: 100, match: ['풀업', '턱걸이', 'pull up', 'pull-up'] }),
]);

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function battleEnemyForExercise(exercise: WorkoutExercise): GymBattleEnemy | null {
  const haystack = normalize(`${exercise.exerciseId ?? ''} ${exercise.name}`);
  return GymBattleEnemies.find((enemy) => enemy.match.some((term) => haystack.includes(normalize(term)))) ?? null;
}

/**
 * 한 운동의 피해량. 유효 세트가 기본 피해를 만들고, 실제 중량 볼륨은 제곱근으로만 보너스를 준다.
 * 맨몸 풀업도 세트 피해가 있으므로 0이 되지 않고, 고중량만 선형으로 압도하지 않는다.
 */
export function battleDamageForExercise(exercise: WorkoutExercise): number {
  const sets = effectiveSetDetails(exercise);
  const completedSets = sets ? sets.length : Math.max(0, exercise.sets ?? 0);
  if (completedSets <= 0) return 0;

  const volume = sets
    ? sets.reduce((sum, set) => sum + Math.max(0, set.weightKg ?? 0) * Math.max(0, set.reps ?? 0), 0)
    : Math.max(0, exercise.weightKg ?? 0) * Math.max(0, exercise.reps ?? 0) * completedSets;

  return completedSets * 4 + Math.floor(Math.sqrt(volume / 50));
}

/** 저장된 완료 기록 전체에서 각 몬스터 진행도를 재구성한다. 별도 battle 저장값이 없어 중복 지급이 없다. */
export function buildGymBattleProgress(records: WorkoutRecord[]): GymBattleProgress[] {
  const state = new Map<GymBattleEnemyId, GymBattleProgress>();
  for (const enemy of GymBattleEnemies) {
    state.set(enemy.id, {
      enemy,
      damage: 0,
      remainingHp: enemy.hp,
      defeated: false,
      attacks: 0,
      latestDamage: 0,
      latestExerciseName: null,
    });
  }

  const ordered = [...records]
    .filter((record) => record.completed && countCompletedSets(record) > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const record of ordered) {
    for (const exercise of record.exercises ?? []) {
      const enemy = battleEnemyForExercise(exercise);
      if (!enemy) continue;
      const damage = battleDamageForExercise(exercise);
      if (damage <= 0) continue;
      const current = state.get(enemy.id)!;
      const totalDamage = current.damage + damage;
      state.set(enemy.id, {
        ...current,
        damage: totalDamage,
        remainingHp: Math.max(0, enemy.hp - totalDamage),
        defeated: totalDamage >= enemy.hp,
        attacks: current.attacks + 1,
        latestDamage: damage,
        latestExerciseName: exercise.name,
      });
    }
  }

  return GymBattleEnemies.map((enemy) => state.get(enemy.id)!);
}

/** 홈에는 가장 최근에 공격한 적을 우선 보여 주고, 아직 전투가 없으면 벤치 몬스터를 연다. */
export function selectFeaturedBattle(progress: GymBattleProgress[]): GymBattleProgress {
  const active = progress.filter((entry) => entry.attacks > 0 && !entry.defeated);
  if (active.length > 0) return active[active.length - 1];
  const unbeaten = progress.find((entry) => !entry.defeated);
  return unbeaten ?? progress[0];
}
