export const WIDTH = 1160;
export const HEIGHT = 720;
export const ARENA = { left: 28, top: 108, right: 1132, bottom: 694 };

const BONE_SPAWN_OFFSETS = [
  { x: 110, y: -74 }, { x: 167, y: -102 }, { x: 229, y: -93 }, { x: 290, y: -62 },
  { x: 116, y: -7 }, { x: 181, y: -32 }, { x: 246, y: -17 }, { x: 306, y: 4 },
  { x: 108, y: 63 }, { x: 173, y: 40 }, { x: 238, y: 63 }, { x: 303, y: 50 },
];

export const FOOD = {
  bone: { name: '骨头', value: 6, color: 0xe8d8af, tag: '基础食物' },
  salt: { name: '盐结晶', value: 12, color: 0xd9eef0, tag: '盐矿食物' },
  fish: { name: '鱼肉', value: 30, color: 0xe0a879, tag: '池塘食物' },
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
  { id: 'large-bone-1', branch: 'largeBone', level: 1, name: '大骨Ⅰ', desc: '骨堆有 10% 概率产出更大的骨头', cost: 72, requires: { extraPile: 1 } },
  { id: 'large-bone-2', branch: 'largeBone', level: 2, name: '大骨Ⅱ', desc: '骨堆有 15% 概率产出更大的骨头', cost: 128 },
  { id: 'large-bone-3', branch: 'largeBone', level: 3, name: '大骨Ⅲ', desc: '骨堆有 25% 概率产出更大的骨头', cost: 210 },
  { id: 'better-bone-1', branch: 'betterBone', level: 1, name: '更好的骨头Ⅰ', desc: '本局每击败一名冒险者，骨头价值 +1', cost: 86, requires: { extraPile: 1 } },
  { id: 'better-bone-2', branch: 'betterBone', level: 2, name: '更好的骨头Ⅱ', desc: '本局每击败一名冒险者，骨头价值 +3', cost: 150 },
  { id: 'better-bone-3', branch: 'betterBone', level: 3, name: '更好的骨头Ⅲ', desc: '本局每击败一名冒险者，骨头价值 +7', cost: 240 },
  { id: 'dye-1', branch: 'dye', level: 1, name: '染色剂', desc: '解锁蓝、红、绿、黄、紫五种基础颜色', cost: 120 },
  { id: 'evolution-1', branch: 'evolution', level: 1, name: '核心蜕变Ⅰ', desc: '营养与产出成熟后，解除幼体上限，进入凝胶体', cost: 220, requires: { nutrition: 2, production: 2 } },
  { id: 'evolution-2', branch: 'evolution', level: 2, name: '核心蜕变Ⅱ', desc: '解除凝胶体上限，迈向成熟体', cost: 480, requires: { evolution: 1 } },
  { id: 'bonus-production-1', branch: 'bonusProduction', level: 1, name: '买一送一Ⅰ', desc: '骨堆有 5% 概率额外产出一次', cost: 110, requires: { evolution: 1 } },
  { id: 'bonus-production-2', branch: 'bonusProduction', level: 2, name: '买一送一Ⅱ', desc: '骨堆有 10% 概率额外产出一次', cost: 180 },
  { id: 'bonus-production-3', branch: 'bonusProduction', level: 3, name: '买一送一Ⅲ', desc: '骨堆有 20% 概率额外产出一次', cost: 290 },
  { id: 'bone-search-1', branch: 'boneSearch', level: 1, name: '寻骨Ⅰ', desc: '每隔 25 秒可以手动翻动一次骨堆', cost: 105, requires: { evolution: 1 } },
  { id: 'bone-search-2', branch: 'boneSearch', level: 2, name: '寻骨Ⅱ', desc: '每隔 20 秒可以手动翻动一次骨堆', cost: 175 },
  { id: 'bone-search-3', branch: 'boneSearch', level: 3, name: '寻骨Ⅲ', desc: '每隔 12 秒可以手动翻动一次骨堆', cost: 280 },
  { id: 'fused-pile-1', branch: 'fusedPile', level: 1, name: '合成大骨堆Ⅰ', desc: '两处骨堆合为一处，产出时间缩短至原本的 40%', cost: 260, requires: { evolution: 1, extraPile: 1 }, revealedBy: { evolution: 1 } },
  { id: 'new-food-1', branch: 'newFood', level: 1, name: '新食物Ⅰ', desc: '解锁盐矿与池塘两种新的食物来源；进化到第二阶段后才能食用', cost: 260, requires: { evolution: 1 }, revealedBy: { evolution: 1 } },
  { id: 'salt-mine-1', branch: 'saltMine', level: 1, name: '盐矿Ⅰ', desc: '解锁盐矿，快速产生盐结晶', cost: 180, requires: { newFood: 1 }, revealedBy: { newFood: 1 } },
  { id: 'salt-mine-2', branch: 'saltMine', level: 2, name: '盐矿Ⅱ', desc: '盐矿生产间隔缩短', cost: 260 },
  { id: 'salt-mine-3', branch: 'saltMine', level: 3, name: '盐矿Ⅲ', desc: '盐矿有 15% 概率额外产生一枚盐结晶', cost: 420 },
  { id: 'pond-1', branch: 'pond', level: 1, name: '池塘Ⅰ', desc: '解锁池塘，缓慢产生高价值鱼肉', cost: 220, requires: { newFood: 1 }, revealedBy: { newFood: 1 } },
  { id: 'pond-2', branch: 'pond', level: 2, name: '池塘Ⅱ', desc: '鱼肉价值提升至 36', cost: 320 },
  { id: 'pond-3', branch: 'pond', level: 3, name: '池塘Ⅲ', desc: '池塘生产间隔缩短', cost: 480 },
];

export function formatNumber(value) {
  return Math.floor(value).toLocaleString('zh-CN');
}

export function emptyMeta() {
  return {
    soul: 0, nutrition: 0, production: 0, extraPile: 0, largeBone: 0, betterBone: 0,
    dye: 0, dyeColor: 'blue', evolution: 0, bonusProduction: 0, boneSearch: 0, fusedPile: 0,
    newFood: 0, saltMine: 0, pond: 0,
  };
}

export function getVisibleUpgradeNodes(meta = emptyMeta()) {
  return UPGRADE_NODES.filter((node) => getUpgradeNodeState(node, meta).known);
}

export function getLargeBoneChance(meta = emptyMeta()) {
  return [0, 0.10, 0.15, 0.25][Math.min(3, meta.largeBone || 0)] || 0;
}

export function getBonusProductionChance(meta = emptyMeta()) {
  return [0, 0.05, 0.10, 0.20][Math.min(3, meta.bonusProduction || 0)] || 0;
}

export function getBoneSearchCooldown(meta = emptyMeta()) {
  return [Infinity, 25, 20, 12][Math.min(3, meta.boneSearch || 0)] || Infinity;
}

export function getBattleBoneBonus(meta = emptyMeta(), enemyCount = 0) {
  const bonus = [0, 1, 3, 7][Math.min(3, meta.betterBone || 0)] || 0;
  return Math.max(0, enemyCount) * bonus;
}

export function getBoneValue(meta = emptyMeta(), run = {}) {
  const base = FOOD.bone.value + Math.min(3, meta.nutrition || 0) * 2;
  const largeBonus = run.large ? Math.round(base * 0.5) : 0;
  return base + largeBonus + (run.boneBonus || 0);
}

export function getFoodValue(type, meta = emptyMeta()) {
  if (type === 'fish') return meta.pond >= 2 ? 36 : FOOD.fish.value;
  if (type === 'salt') return FOOD.salt.value;
  return FOOD[type]?.value || 0;
}

export function getFoodSpawnInterval(type, meta = emptyMeta()) {
  if (type === 'salt') return [Infinity, 3600, 3000, 2600][Math.min(3, meta.saltMine || 0)] || Infinity;
  if (type === 'fish') return [Infinity, 9800, 9000, 7200][Math.min(3, meta.pond || 0)] || Infinity;
  return getBoneSpawnInterval(0, meta);
}

export function getFoodBonusChance(type, meta = emptyMeta()) {
  return type === 'salt' && (meta.saltMine || 0) >= 3 ? 0.15 : 0;
}

export function getEvolutionMassCap(meta = emptyMeta()) {
  if ((meta.evolution || 0) >= 2) return 500;
  if ((meta.evolution || 0) >= 1) return 280;
  return 200;
}

export function getSlimeStage(meta = emptyMeta()) {
  if ((meta.evolution || 0) >= 2) return '成熟体';
  if ((meta.evolution || 0) >= 1) return '凝胶体';
  return '微型黏液';
}

export function getUpgradeBranchMax(branch) {
  return Math.max(...UPGRADE_NODES.filter((node) => node.branch === branch).map((node) => node.level));
}

export function getUpgradeNodeState(node, meta = emptyMeta()) {
  const current = meta[node.branch] || 0;
  const requirements = node.requires || (node.level === 1 ? {} : { [node.branch]: node.level - 1 });
  const requirementValues = Object.entries(requirements);
  const purchased = current >= node.level;
  const unlocked = purchased || requirementValues.every(([branch, level]) => (meta[branch] || 0) >= level);
  const revealRequirements = Object.entries(node.revealedBy || requirements);
  const known = purchased || requirementValues.length === 0 || revealRequirements.some(([branch, level]) => (meta[branch] || 0) >= level);
  return {
    purchased,
    known,
    unlocked,
    affordable: meta.soul >= node.cost,
  };
}

export function getMagnetRadius() {
  return 82;
}

export function getBoneSpawnInterval(mass, meta = emptyMeta()) {
  const productionFactor = Math.pow(0.84, Math.min(3, meta.production || 0));
  const fusedFactor = meta.fusedPile ? 0.4 : 1;
  const pileCount = meta.fusedPile ? 1 : 1 + Math.min(1, meta.extraPile || 0);
  return Math.max(meta.fusedPile ? 1400 : 2300, (5800 * productionFactor * fusedFactor) / pileCount);
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
    power: wave === 1 ? 150 : Math.round(150 * Math.pow(1.45, wave - 1)),
    duration: wave === 1 ? 25 : Math.max(8, 16 - Math.min(7, wave - 1)),
    title: wave === 1 ? '迷路的木剑见习者' : wave === 2 ? '老练的猎人' : wave === 3 ? '秘法猎杀队' : `第 ${wave} 队 · 王国讨伐军`,
  };
}

export function getBattleRacers(wave) {
  return wave === 1 ? ['rookie'] : wave === 2 ? ['hunter'] : ['guard', 'archer', 'oracle'];
}

// Combat is intentionally deterministic: the exploration phase decides whether
// the slime has enough Mass, while the battle phase turns that result into a
// readable sequence of alternating actions.
export function getBattlePlan(mass, enemyPower, wave = 1) {
  const slimeWins = mass >= enemyPower;
  const enemyRoster = getBattleRacers(wave);
  const enemyRacers = wave <= 2 ? [enemyRoster[0], enemyRoster[0], enemyRoster[0]] : enemyRoster;
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

export function canConsume(mass, value, meta = emptyMeta(), foodType = 'bone') {
  if ((foodType === 'salt' || foodType === 'fish') && (meta.evolution || 0) < 2) return false;
  const limit = mass < 35 ? 10 : mass < 100 ? 25 : mass < 190 ? 90 : 300;
  return value <= limit;
}

export function soulReward(mass, wave) {
  return Math.max(3, Math.floor(mass / 45) + wave * 3);
}
