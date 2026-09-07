import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGrowth, canConsume, FOOD, getBoneSpawnInterval, getBoneValue,
  chooseBoneSpawnPoint, getBattlePlan, getBattleRacers, getVisibleUpgradeNodes,
  getWaveConfig, soulReward,
} from './gameLogic.js';

test('骨片营养升级只提高骨片价值且有等级上限', () => {
  assert.equal(getBoneValue({ nutrition: 0 }), 8);
  assert.equal(getBoneValue({ nutrition: 2 }), 12);
  assert.equal(getBoneValue({ nutrition: 10 }), 14);
});

test('初始史莱姆能吃骨头，但要长大后才能吞下冒险者', () => {
  assert.equal(canConsume(0, 10), true);
  assert.equal(canConsume(0, 90), false);
  assert.equal(canConsume(100, 90), true);
});

test('零升级史莱姆前几局无法仅靠第一波前的骨头突破门槛', () => {
  const optimisticEarlyBones = 16;
  assert.equal(FOOD.bone.value, 8);
  assert.ok(getBoneValue() * optimisticEarlyBones < getWaveConfig(1).power);
  assert.ok(getBoneValue({ nutrition: 1 }) * optimisticEarlyBones >= getWaveConfig(1).power);
});

test('骨片产出升级与第二骨堆会缩短产出间隔', () => {
  assert.ok(getBoneSpawnInterval(0, { production: 1 }) < getBoneSpawnInterval(0));
  assert.ok(getBoneSpawnInterval(0, { extraPile: 1 }) < getBoneSpawnInterval(0));
});

test('骨头只会落在骨堆附近且避开已占用位置', () => {
  const first = chooseBoneSpawnPoint([], () => 0);
  const second = chooseBoneSpawnPoint([{ ...first, radius: 64 }], () => 0);
  assert.deepEqual(first, { x: 252, y: 474 });
  assert.ok(Math.hypot(second.x - first.x, second.y - first.y) >= 64);
  assert.ok(first.x < 470 && first.y > 430);
});

test('波次战力递增并缩短倒计时', () => {
  assert.ok(getWaveConfig(3).power > getWaveConfig(2).power);
  assert.ok(getWaveConfig(3).duration < getWaveConfig(2).duration);
});

test('战斗行动序列会保留双方行动，并随波次扩展敌方单位', () => {
  const winningPlan = getBattlePlan(100, 70, 1);
  const losingPlan = getBattlePlan(30, 70, 1);
  const squadPlan = getBattlePlan(30, 70, 2);
  assert.equal(winningPlan.slimeWins, true);
  assert.equal(winningPlan.turns.at(-1).actor, 'slime');
  assert.equal(losingPlan.slimeWins, false);
  assert.equal(losingPlan.turns.at(-1).actor, 'enemy');
  assert.ok(winningPlan.turns.some((turn) => turn.actor === 'enemy'));
  assert.deepEqual(
    losingPlan.turns.filter((turn) => turn.actor === 'enemy').map((turn) => turn.racer),
    ['rookie', 'rookie', 'rookie'],
  );
  assert.deepEqual(
    squadPlan.turns.filter((turn) => turn.actor === 'enemy').map((turn) => turn.racer),
    ['guard', 'archer', 'oracle'],
  );
});

test('第一波只有木剑见习者，后续波次才出现完整小队', () => {
  assert.deepEqual(getBattleRacers(1), ['rookie']);
  assert.deepEqual(getBattleRacers(2), ['guard', 'archer', 'oracle']);
  assert.equal(getWaveConfig(1).title, '迷路的木剑见习者');
});

test('失败时获得魂晶，但首次升级需要积累多局资源', () => {
  assert.ok(soulReward(300, 3) > soulReward(100, 1));
  const firstReward = soulReward(0, 1);
  assert.ok(getVisibleUpgradeNodes().every((node) => node.cost > firstReward * 5));
});

test('升级树初始只显示三个根节点，购买前置后才显露后续节点', () => {
  const roots = getVisibleUpgradeNodes({ nutrition: 0, production: 0, extraPile: 0 });
  const afterNutrition = getVisibleUpgradeNodes({ nutrition: 1, production: 0, extraPile: 0 });
  assert.deepEqual(roots.map((node) => node.id), ['nutrition-1', 'production-1', 'extra-pile-1']);
  assert.ok(afterNutrition.some((node) => node.id === 'nutrition-2'));
  assert.ok(!roots.some((node) => node.id === 'nutrition-2'));
});
