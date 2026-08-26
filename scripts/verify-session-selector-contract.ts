import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const selector = readFileSync('src/components/session/session-exercise-selector.tsx', 'utf8');
const navigation = readFileSync('src/utils/session-navigation.ts', 'utf8');

let assertions = 0;
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  assertions += 1;
}

ok(selector.includes('운동 선택'), 'selector identifies itself as exercise selection');
ok(selector.includes('순서 상관없이 바로 바꿀 수 있어요'), 'selector explicitly communicates free order');
ok(selector.includes('onSelect(item.id)'), 'every selector item directly selects its exercise entry');
ok(selector.includes('accessibilityState={{ selected: item.selected, disabled }}'), 'selection state is accessible');
ok(selector.includes("item.complete ? ' · 완료' : ''"), 'completed exercise is informational, not removed');
ok(!selector.includes('다음 운동'), 'selector does not prescribe a next exercise');
ok(!selector.includes('이전 운동'), 'selector does not prescribe a previous exercise');
ok(!selector.includes('넘어가기'), 'selector does not frame switching as skipping');
ok(!selector.includes('currentIndex'), 'selector does not depend on routine position');
ok(navigation.includes('session.exercises.map'), 'navigation keeps every routine exercise selectable');
ok(navigation.includes('exercise.id === currentExerciseId'), 'selection follows actual current exercise');
ok(navigation.includes('completedSets >= targetSets'), 'completion is based on actual effective-set progress');
ok(navigation.includes('targetSets !== undefined'), 'unknown targets are not invented');
ok(!navigation.includes('getNextExercise'), 'presentation model has no sequential-next dependency');

console.log(`verify-session-selector-contract: ${assertions} assertions PASS`);
