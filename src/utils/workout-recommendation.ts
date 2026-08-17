import type { ExerciseDefinition, MuscleGroup } from '@/types/exercise';
import type { WorkoutRecord } from '@/types/workout';

/**
 * [오늘 뭐 하지?] 추천형 진입을 위한 deterministic mock 추천이다 (실제 LLM 호출 없음).
 * 최근 기록에서 가장 오래 전에(또는 한 번도) 하지 않은 부위를 추천한다.
 * 향후 AI PT 추천으로 교체할 수 있도록, 화면은 이 함수의 반환값(MuscleGroup)만 사용한다.
 *
 * records는 최신순으로 정렬돼 있다고 가정한다(workout-repository의 저장 순서와 동일).
 */
export function recommendMuscleGroup(
  records: WorkoutRecord[],
  exerciseDb: ExerciseDefinition[],
  muscleGroups: MuscleGroup[]
): MuscleGroup {
  const idToGroup = new Map(exerciseDb.map((exercise) => [exercise.id, exercise.primaryMuscleGroup]));
  const lastSeenIndex = new Map<MuscleGroup, number>();

  records.forEach((record, index) => {
    for (const exercise of record.exercises ?? []) {
      const group = exercise.exerciseId ? idToGroup.get(exercise.exerciseId) : undefined;
      if (group && !lastSeenIndex.has(group)) {
        lastSeenIndex.set(group, index);
      }
    }
  });

  let best = muscleGroups[0];
  let bestIndex = -1;
  for (const group of muscleGroups) {
    const index = lastSeenIndex.get(group) ?? Infinity;
    if (index > bestIndex) {
      bestIndex = index;
      best = group;
    }
  }
  return best;
}
