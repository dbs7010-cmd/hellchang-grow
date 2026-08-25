import assert from 'node:assert/strict';

import {
  availableHomeGymCoins,
  earnedHomeGymCoins,
  getHomeGymItem,
  HOME_GYM_REWARD_PER_WORKOUT,
  HomeGymItemIds,
  STARTER_RACK_COST,
  type HomeGymState,
} from '../src/data/home-gym-repository.ts';

let passed = 0;
function check(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

check('zero workouts earn zero coins', () => {
  assert.equal(earnedHomeGymCoins(0), 0);
});

check('negative workout counts never create debt', () => {
  assert.equal(earnedHomeGymCoins(-4), 0);
});

check('only completed whole workout count is rewarded', () => {
  assert.equal(earnedHomeGymCoins(2.9), 2 * HOME_GYM_REWARD_PER_WORKOUT);
});

check('spent coins reduce only the available balance', () => {
  const state: HomeGymState = { spentCoins: 20, ownedItemIds: [], placedItemIds: [] };
  assert.equal(availableHomeGymCoins(state, 5), 30);
});

check('available balance cannot become negative', () => {
  const state: HomeGymState = { spentCoins: 999, ownedItemIds: [], placedItemIds: [] };
  assert.equal(availableHomeGymCoins(state, 1), 0);
});

check('starter rack catalog and exported cost stay identical', () => {
  const rack = getHomeGymItem(HomeGymItemIds.starterRack);
  assert.equal(rack.name, '덤벨 랙');
  assert.equal(rack.cost, STARTER_RACK_COST);
});

console.log(`\nHOME GYM VERIFY: ${passed} PASS / 0 FAIL`);
