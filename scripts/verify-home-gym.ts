import {
  availableHomeGymCoins,
  earnedHomeGymCoins,
  getHomeGymItem,
  HOME_GYM_REWARD_PER_WORKOUT,
  HomeGymItemIds,
  STARTER_RACK_COST,
  type HomeGymState,
} from '@/data/home-gym-repository';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
  if (pass) passed += 1;
  else {
    failed += 1;
    console.error('  expected:', expected);
    console.error('  actual:  ', actual);
  }
}

check('zero workouts earn zero coins', earnedHomeGymCoins(0), 0);
check('negative workout counts never create debt', earnedHomeGymCoins(-4), 0);
check(
  'only completed whole workout count is rewarded',
  earnedHomeGymCoins(2.9),
  2 * HOME_GYM_REWARD_PER_WORKOUT
);

const spentState: HomeGymState = { spentCoins: 20, ownedItemIds: [], placedItemIds: [] };
check('spent coins reduce only the available balance', availableHomeGymCoins(spentState, 5), 30);

const overspentState: HomeGymState = { spentCoins: 999, ownedItemIds: [], placedItemIds: [] };
check('available balance cannot become negative', availableHomeGymCoins(overspentState, 1), 0);

const rack = getHomeGymItem(HomeGymItemIds.starterRack);
check('starter rack name is canonical', rack.name, '덤벨 랙');
check('starter rack catalog and exported cost stay identical', rack.cost, STARTER_RACK_COST);

console.log(`\nHOME GYM VERIFY: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;
