export const WIDTH = 1160;
export const HEIGHT = 720;
export const ARENA = { left: 28, top: 108, right: 1132, bottom: 694 };

const BONE_SPAWN_OFFSETS = [
  { x: 110, y: -74 }, { x: 167, y: -102 }, { x: 229, y: -93 }, { x: 290, y: -62 },
  { x: 116, y: -7 }, { x: 181, y: -32 }, { x: 246, y: -17 }, { x: 306, y: 4 },
  { x: 108, y: 63 }, { x: 173, y: 40 }, { x: 238, y: 63 }, { x: 303, y: 50 },
];

export const FOOD = {
  bone: { name: '骨头', value: 8, color: 0xe8d8af, tag: '基础食物' },
  adventurer: { name: '冒险者', value: 90, color: 0xe4ad72, tag: '高价值食物' },
};

export const UPGRADE_NODES = [
  { id: 'nutrition-1', branch: 'nutrition', level: 1, name: '骨片营养Ⅰ', desc: '每枚骨片 Mass +2', cost: 24 },
  { id: 'production-1', branch: 'production', level: 1, name: '骨片产出Ⅰ', desc: '骨堆产出间隔 -16%', cost: 30 },
  { id: 'extra-pile-1', branch: 'extraPile', level: 1, name: '第二骨堆', desc: '解锁第二处骨片产地', cost: 180 },
  { id: 'nutrition-2', branch: 'nutrition', level: 2, name: '骨片营养Ⅱ', desc: '每枚骨片再增加 2 Mass', cost: 65 },
  { id: 'production-2', branch: 'production', level: 2, name: '骨片产出Ⅱ', desc: '骨堆产出间隔进一步缩短', cost: 78 },
  { id: 'nutrition-3', branch: 'nutrition', level: 3, name: '骨片营养Ⅲ', desc: '每枚骨片再增加 2 Mass', cost: 145 },
  { id: 'production-3', branch: 'production', level: 3, name: '骨片产出Ⅲ', desc: '骨堆达到最高产出速度', cost: 165 },
];

export function formatNumber(value) {
  return Math.floor(value).toLocaleString('zh-CN');
}

export function emptyMeta() {
  return { soul: 0, nutrition: 0, production: 0, extraPile: 0 };
}

export function getVisibleUpgradeNodes(meta = emptyMeta()) {
  return UPGRADE_NODES.filter((node) => node.level === 1 || (meta[node.branch] || 0) >= node.level - 1);
}

export function getBoneValue(meta = emptyMeta()) {
  return FOOD.bone.value + Math.min(3, meta.nutrition || 0) * 2;
}

export function getMagnetRadius() {
  return 82;
}

export function getBoneSpawnInterval(mass, meta = emptyMeta()) {
  const productionFactor = Math.pow(0.84, Math.min(3, meta.production || 0));
  const pileCount = 1 + Math.min(1, meta.extraPile || 0);
  return Math.max(2300, (5800 * productionFactor) / pileCount);
}

export function chooseBoneSpawnPoint(blockers = [], random = Math.random, source = { x: 142, y: 548, direction: 1 }) {
  const start = Math.min(BONE_SPAWN_OFFSETS.length - 1, Math.floor(random() * BONE_SPAWN_OFFSETS.length));
  for (let offset = 0; offset < BONE_SPAWN_OFFSETS.length; offset += 1) {
    const candidate = BONE_SPAWN_OFFSETS[(start + offset) % BONE_SPAWN_OFFSETS.length];
    const point = { x: source.x + candidate.x * source.direction, y: source.y + candidate.y };
    const isClear = blockers.every((blocker) => (
      Math.hypot(point.x - blocker.x, point.y - blocker.y) >= (blocker.radius || 64)
    ));
    if (isClear) return { ...point };
  }
  return null;
}

export function getWaveConfig(wave) {
  return {
    wave,
    power: Math.round(150 * Math.pow(1.63, wave - 1)),
    duration: Math.max(8, 16 - Math.min(7, wave - 1)),
    title: wave === 1 ? '迷路的木剑见习者' : wave === 2 ? '铁锈佣兵团' : wave === 3 ? '秘法猎杀队' : `第 ${wave} 队 · 王国讨伐军`,
  };
}

export function getBattleRacers(wave) {
  return wave === 1 ? ['rookie'] : ['guard', 'archer', 'oracle'];
}

// Combat is intentionally deterministic: the exploration phase decides whether
// the slime has enough Mass, while the battle phase turns that result into a
// readable sequence of alternating actions.
export function getBattlePlan(mass, enemyPower, wave = 1) {
  const slimeWins = mass >= enemyPower;
  const enemyRoster = getBattleRacers(wave);
  const enemyRacers = wave === 1 ? [enemyRoster[0], enemyRoster[0], enemyRoster[0]] : enemyRoster;
  return {
    slimeWins,
    turns: slimeWins
      ? [
        { actor: 'slime', racer: 'slime', damage: 32 },
        { actor: 'enemy', racer: enemyRacers[0], damage: 22 },
        { actor: 'slime', racer: 'slime', damage: 31 },
        { actor: 'slime', racer: 'slime', damage: 37 },
      ]
      : [
        { actor: 'slime', racer: 'slime', damage: 20 },
        { actor: 'enemy', racer: enemyRacers[0], damage: 25 },
        { actor: 'enemy', racer: enemyRacers[1], damage: 31 },
        { actor: 'enemy', racer: enemyRacers[2], damage: 44 },
      ],
  };
}

export function calculateGrowth(value) {
  return Math.max(1, Math.round(value));
}

export function canConsume(mass, value) {
  const limit = mass < 35 ? 10 : mass < 100 ? 25 : mass < 190 ? 90 : 300;
  return value <= limit;
}

export function soulReward(mass, wave) {
  return Math.max(3, Math.floor(mass / 45) + wave * 3);
}
