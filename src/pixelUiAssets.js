export const PixelTheme = Object.freeze({
  uiScale: 4,
  iconDisplaySize: 48,
  nodeDisplaySize: 104,
  productionPropDisplaySize: Object.freeze({ width: 152, height: 96 }),
  assetFilter: 'nearest',
  outline: 1,
  lineLogicalWidth: 1,
  lightDirection: 'top-left',
});

export const SkillVisualState = Object.freeze({
  OWNED: 'owned',
  AVAILABLE: 'available',
  LOCKED: 'locked',
  UNKNOWN: 'unknown',
});

export const NODE_TEXTURE_BY_STATE = Object.freeze({
  [SkillVisualState.OWNED]: 'node-owned',
  [SkillVisualState.AVAILABLE]: 'node-available',
  [SkillVisualState.LOCKED]: 'node-locked',
  [SkillVisualState.UNKNOWN]: 'node-unknown',
});

export const ICON_TEXTURE_BY_BRANCH = Object.freeze({
  nutrition: 'icon-bone-nutrition',
  production: 'icon-bone-production',
  extraPile: 'icon-second-bone-pile',
  dye: 'icon-dye-flask',
  evolution: 'icon-slime-core',
  largeBone: 'icon-large-bone',
  betterBone: 'icon-improved-bone',
  bonusProduction: 'icon-bonus-production',
  boneSearch: 'icon-bone-search',
  fusedPile: 'icon-fused-bone-pile',
  newFood: 'icon-new-food',
  saltMine: 'icon-salt-mine',
  pond: 'icon-pond',
});

export const PRODUCTION_PROP_TEXTURE_BY_TYPE = Object.freeze({
  salt: 'prop-salt-mine',
  fish: 'prop-pond',
});

export const ITEM_TEXTURE_BY_TYPE = Object.freeze({
  bone: 'item-bone',
  salt: 'item-salt',
  fish: 'item-fish',
});

export const PIXEL_UI_ASSETS = Object.freeze([
  ...Object.entries(NODE_TEXTURE_BY_STATE).map(([state, key]) => ({
    key,
    url: new URL(`../assets/pixel/ui/nodes/node-${state}.png`, import.meta.url).href,
  })),
  ...Object.entries(ICON_TEXTURE_BY_BRANCH).map(([branch, key]) => ({
    key,
    url: new URL(`../assets/pixel/ui/skill-icons/${branch}.png`, import.meta.url).href,
  })),
  { key: 'icon-unknown', url: new URL('../assets/pixel/ui/skill-icons/unknown.png', import.meta.url).href },
  { key: 'panel-frame', url: new URL('../assets/pixel/ui/panels/panel-frame.png', import.meta.url).href },
  { key: 'button-normal', url: new URL('../assets/pixel/ui/buttons/button-normal.png', import.meta.url).href },
  { key: 'button-hover', url: new URL('../assets/pixel/ui/buttons/button-hover.png', import.meta.url).href },
  { key: 'button-pressed', url: new URL('../assets/pixel/ui/buttons/button-pressed.png', import.meta.url).href },
  { key: 'button-disabled', url: new URL('../assets/pixel/ui/buttons/button-disabled.png', import.meta.url).href },
  { key: 'scene-hud-frame', url: new URL('../assets/pixel/ui/scene/hud-frame.png', import.meta.url).href },
  { key: 'scene-result-panel', url: new URL('../assets/pixel/ui/scene/result-panel.png', import.meta.url).href },
  { key: 'scene-button-confirm', url: new URL('../assets/pixel/ui/scene/button-confirm.png', import.meta.url).href },
  { key: 'scene-button-secondary', url: new URL('../assets/pixel/ui/scene/button-secondary.png', import.meta.url).href },
  { key: 'scene-encounter-crest', url: new URL('../assets/pixel/ui/scene/encounter-crest.png', import.meta.url).href },
  { key: 'scene-timeline-slime', url: new URL('../assets/pixel/ui/scene/timeline-slime.png', import.meta.url).href },
  { key: 'scene-timeline-enemy', url: new URL('../assets/pixel/ui/scene/timeline-enemy.png', import.meta.url).href },
  { key: 'scene-timeline-active', url: new URL('../assets/pixel/ui/scene/timeline-active.png', import.meta.url).href },
  ...['rookie', 'hunter', 'guard', 'archer', 'oracle'].map((role) => ({
    key: `scene-timeline-${role}`,
    url: new URL(`../assets/pixel/ui/scene/timeline-${role}.png`, import.meta.url).href,
  })),
  { key: 'prop-bone-pile', url: new URL('../assets/pixel/props/bone-pile.png', import.meta.url).href },
  { key: 'prop-battle-platform-slime', url: new URL('../assets/pixel/props/battle-platform-slime.png', import.meta.url).href },
  { key: 'prop-battle-platform-enemy', url: new URL('../assets/pixel/props/battle-platform-enemy.png', import.meta.url).href },
  { key: 'prop-battle-platform-slime-v2', url: new URL('../assets/pixel/props/battle-platform-slime-v2.png', import.meta.url).href },
  { key: 'prop-battle-platform-enemy-v2', url: new URL('../assets/pixel/props/battle-platform-enemy-v2.png', import.meta.url).href },
  { key: 'tree-detail-panel', url: new URL('../assets/pixel/ui/tree/detail-panel.png', import.meta.url).href },
  { key: 'tree-detail-panel-v2', url: new URL('../assets/pixel/ui/tree/detail-panel-v2.png', import.meta.url).href },
  { key: 'tree-detail-panel-v3', url: new URL('../assets/pixel/ui/tree/detail-panel-v3.png', import.meta.url).href },
  { key: 'tree-complete-button', url: new URL('../assets/pixel/ui/tree/complete-button.png', import.meta.url).href },
  { key: 'tree-complete-button-v2', url: new URL('../assets/pixel/ui/tree/complete-button-v2.png', import.meta.url).href },
  { key: 'tree-dialog-button', url: new URL('../assets/pixel/ui/tree/dialog-button.png', import.meta.url).href },
  { key: 'effect-slime-impact', url: new URL('../assets/pixel/effects/slime-impact.png', import.meta.url).href },
  { key: 'effect-weapon-slash', url: new URL('../assets/pixel/effects/weapon-slash.png', import.meta.url).href },
  { key: 'scene-dungeon-background', url: new URL('../assets/pixel/backgrounds/dungeon.png', import.meta.url).href },
  { key: 'slime-micro-v2', url: new URL('../assets/pixel/characters/slime-micro-v2.png', import.meta.url).href, frameWidth: 128, frameHeight: 128 },
  { key: 'slime-evolved-v2', url: new URL('../assets/pixel/characters/slime-evolved-v2.png', import.meta.url).href, frameWidth: 128, frameHeight: 128 },
  { key: 'enemy-rookie-v1', url: new URL('../assets/pixel/characters/enemy-rookie-v1.png', import.meta.url).href, frameWidth: 160, frameHeight: 160 },
  { key: 'enemy-hunter-v1', url: new URL('../assets/pixel/characters/enemy-hunter-v1.png', import.meta.url).href, frameWidth: 160, frameHeight: 160 },
  ...Object.entries(ITEM_TEXTURE_BY_TYPE).map(([type, key]) => ({
    key,
    url: new URL(`../assets/pixel/items/${type}.png`, import.meta.url).href,
  })),
  { key: PRODUCTION_PROP_TEXTURE_BY_TYPE.salt, url: new URL('../assets/pixel/props/salt-mine.png', import.meta.url).href },
  { key: PRODUCTION_PROP_TEXTURE_BY_TYPE.fish, url: new URL('../assets/pixel/props/pond.png', import.meta.url).href },
]);

export function resolveSkillVisualState({ current, known, unlocked, affordable }) {
  if (current > 0) return SkillVisualState.OWNED;
  if (!known) return SkillVisualState.UNKNOWN;
  if (unlocked && affordable) return SkillVisualState.AVAILABLE;
  return SkillVisualState.LOCKED;
}
