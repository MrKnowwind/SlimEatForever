import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGrowth, canConsume, FOOD, getBattleBoneBonus, getBoneSearchCooldown, getBoneSpawnInterval, getBoneValue, getEvolutionMassCap,
  getBonusProductionChance, getLargeBoneChance,
  chooseBoneSpawnPoint, getBattlePlan, getBattleRacers, getSlimeStage, getVisibleUpgradeNodes, getUpgradeNodeState,
  getWaveConfig, soulReward,
} from './gameLogic.js';

test('骨片营养升级只提高骨片价值且有等级上限', () => {
  assert.equal(getBoneValue({ nutrition: 0 }), 6);
  assert.equal(getBoneValue({ nutrition: 2 }), 10);
  assert.equal(getBoneValue({ nutrition: 10 }), 12);
});

test('大骨概率与战利品骨头加成按技能等级生效', () => {
  assert.equal(getLargeBoneChance({ largeBone: 1 }), 0.1);
  assert.equal(getLargeBoneChance({ largeBone: 2 }), 0.15);
  assert.equal(getLargeBoneChance({ largeBone: 3 }), 0.25);
  assert.equal(getBoneValue({ betterBone: 3 }, { boneBonus: 14 }), 20);
  assert.equal(getBoneValue({ nutrition: 1 }, { large: true }), 12);
  assert.equal(getBattleBoneBonus({ betterBone: 2 }, 3), 9);
});

test('蜕变后的三条新分支按等级提供产出、寻骨与合堆效果', () => {
  assert.equal(getBonusProductionChance({ bonusProduction: 1 }), 0.05);
  assert.equal(getBonusProductionChance({ bonusProduction: 3 }), 0.2);
  assert.equal(getBoneSearchCooldown({ boneSearch: 1 }), 25);
  assert.equal(getBoneSearchCooldown({ boneSearch: 3 }), 12);
  assert.ok(getBoneSpawnInterval(0, { extraPile: 1 }) > getBoneSpawnInterval(0, { fusedPile: 1 }));
});

test('初始史莱姆能吃骨头，但要长大后才能吞下冒险者', () => {
  assert.equal(canConsume(0, 10), true);
  assert.equal(canConsume(0, 90), false);
  assert.equal(canConsume(100, 90), true);
});

test('降低单枚骨片收益后，第一波仍需将进化条推进到四分之三', () => {
  const earlyBones = 8;
  assert.equal(FOOD.bone.value, 6);
  assert.ok(getBoneValue() * earlyBones < getWaveConfig(1).power);
  assert.equal(getWaveConfig(1).power, getEvolutionMassCap() * 0.75);
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
  const squadPlan = getBattlePlan(30, 70, 3);
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
  assert.deepEqual(getBattleRacers(2), ['hunter']);
  assert.deepEqual(getBattleRacers(3), ['guard', 'archer', 'oracle']);
  assert.equal(getWaveConfig(1).title, '迷路的木剑见习者');
  assert.equal(getWaveConfig(2).title, '老练的猎人');
  assert.equal(getWaveConfig(1).duration, 25);
});

test('幼体在核心蜕变前封顶，首波战力位于进化条四分之三处', () => {
  assert.equal(getEvolutionMassCap({ evolution: 0 }), 200);
  assert.equal(getEvolutionMassCap({ evolution: 1 }), 280);
  assert.equal(getWaveConfig(1).power, 150);
});

test('初始形态是无表情微型黏液，首次蜕变后进入现有凝胶体阶段', () => {
  assert.equal(getSlimeStage({ evolution: 0 }), '微型黏液');
  assert.equal(getSlimeStage({ evolution: 1 }), '凝胶体');
});

test('失败时获得魂晶，但首次升级需要积累多局资源', () => {
  assert.ok(soulReward(300, 3) > soulReward(100, 1));
  const firstReward = soulReward(0, 1);
  assert.ok(getVisibleUpgradeNodes().every((node) => node.cost > firstReward * 5));
});

test('蜕变需要营养 II 与产出 II，满足任一前置后会显示条件', () => {
  const roots = getVisibleUpgradeNodes({ nutrition: 0, production: 0, extraPile: 0, evolution: 0 });
  const afterNutrition = getVisibleUpgradeNodes({ nutrition: 1, production: 0, extraPile: 0, evolution: 0 });
  assert.deepEqual(roots.map((node) => node.id), ['nutrition-1', 'production-1', 'extra-pile-1', 'dye-1']);
  assert.ok(afterNutrition.some((node) => node.id === 'nutrition-2'));
  assert.ok(!roots.some((node) => node.id === 'nutrition-2'));
  const evolution = { branch: 'evolution', level: 1, cost: 220, requires: { nutrition: 2, production: 2 } };
  assert.deepEqual(getUpgradeNodeState(evolution, { nutrition: 2, production: 0, soul: 999 }), {
    purchased: false, known: true, unlocked: false, affordable: true,
  });
  assert.equal(getUpgradeNodeState(evolution, { nutrition: 2, production: 2, soul: 999 }).unlocked, true);
  assert.ok(!roots.some((node) => node.id === 'large-bone-1'));
  assert.ok(getVisibleUpgradeNodes({ extraPile: 1 }).some((node) => node.id === 'large-bone-1'));
});

test('已购买的节点即使暂时买不起下一级，也保持已掌握状态', () => {
  const nutritionOne = { branch: 'nutrition', level: 1, cost: 24 };
  assert.deepEqual(getUpgradeNodeState(nutritionOne, { nutrition: 1, soul: 0 }), {
    purchased: true, known: true, unlocked: true, affordable: false,
  });
});
