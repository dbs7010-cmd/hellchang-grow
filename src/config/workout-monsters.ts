import type { MuscleGroup } from '@/types/exercise';
import type { WorkoutMonster } from '@/types/workout-game';

/**
 * 운동별로 별도 미니게임/Stage를 만드는 대신 같은 전투 세계 안에서 상대만 바뀐다.
 * 첫 vertical slice는 대표 운동만 고유 몬스터를 주고 나머지는 부위 몬스터로 안전하게 fallback한다.
 */
const byMuscle: Record<MuscleGroup, WorkoutMonster> = {
  chest: { id: 'chest-iron', name: '철가슴 몬스터', muscleGroup: 'chest', visualKey: 'chest-iron' },
  back: { id: 'back-chain', name: '등짝 괴수', muscleGroup: 'back', visualKey: 'back-chain' },
  shoulders: { id: 'shoulder-press', name: '어깨바위', muscleGroup: 'shoulders', visualKey: 'shoulder-press' },
  arms: { id: 'arm-curl', name: '팔뚝 악귀', muscleGroup: 'arms', visualKey: 'arm-curl' },
  legs: { id: 'leg-golem', name: '하체 골렘', muscleGroup: 'legs', visualKey: 'leg-golem' },
  core: { id: 'core-wall', name: '코어 장벽', muscleGroup: 'core', visualKey: 'core-wall' },
  fullBody: { id: 'full-body-beast', name: '전신 괴수', muscleGroup: 'fullBody', visualKey: 'full-body-beast' },
};

const byExercise: Record<string, WorkoutMonster> = {
  'bench-press': { id: 'bench-monster', name: '벤치 몬스터', muscleGroup: 'chest', visualKey: 'bench-monster' },
  squat: { id: 'squat-monster', name: '스쿼트 몬스터', muscleGroup: 'legs', visualKey: 'squat-monster' },
  deadlift: { id: 'deadlift-monster', name: '데드리프트 몬스터', muscleGroup: 'fullBody', visualKey: 'deadlift-monster' },
  'pull-up': { id: 'pullup-monster', name: '풀업 몬스터', muscleGroup: 'back', visualKey: 'pullup-monster' },
};

export function getWorkoutMonster(exerciseId: string, primaryMuscleGroup: MuscleGroup): WorkoutMonster {
  return byExercise[exerciseId] ?? byMuscle[primaryMuscleGroup];
}
