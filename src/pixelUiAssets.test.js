import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ICON_TEXTURE_BY_BRANCH, ITEM_TEXTURE_BY_TYPE, NODE_TEXTURE_BY_STATE, PIXEL_UI_ASSETS, PixelTheme, PRODUCTION_PROP_TEXTURE_BY_TYPE,
  SkillVisualState, resolveSkillVisualState,
} from './pixelUiAssets.js';

test('进化树视觉状态统一映射到四套固定节点资产', () => {
  assert.deepEqual(Object.values(SkillVisualState), ['owned', 'available', 'locked', 'unknown']);
  assert.deepEqual(Object.keys(NODE_TEXTURE_BY_STATE), Object.values(SkillVisualState));
  assert.equal(resolveSkillVisualState({ current: 1, purchased: true, known: true, unlocked: true, affordable: false }), 'owned');
  assert.equal(resolveSkillVisualState({ current: 1, purchased: false, known: true, unlocked: true, affordable: true }), 'available');
  assert.equal(resolveSkillVisualState({ current: 0, known: true, unlocked: true, affordable: true }), 'available');
  assert.equal(resolveSkillVisualState({ current: 0, known: true, unlocked: false, affordable: true }), 'locked');
  assert.equal(resolveSkillVisualState({ current: 0, known: false, unlocked: false, affordable: false }), 'unknown');
});

test('ImageGen 正式美术保留源图细节，只统一显示尺寸', () => {
  assert.deepEqual(PixelTheme, {
    uiScale: 4,
    iconDisplaySize: 48,
    nodeDisplaySize: 104,
    productionPropDisplaySize: Object.freeze({ width: 152, height: 96 }),
    assetFilter: 'linear',
    outline: 1,
    lineLogicalWidth: 1,
    lightDirection: 'top-left',
  });
});

test('每个正式纹理键都唯一且指向 PNG 资产', () => {
  const keys = PIXEL_UI_ASSETS.map(({ key }) => key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(PIXEL_UI_ASSETS.every(({ url }) => url.endsWith('.png')));
});

test('主场景结算界面使用固定绘制组件', () => {
  const keys = new Set(PIXEL_UI_ASSETS.map(({ key }) => key));
  assert.deepEqual(
    ['scene-hud-frame', 'scene-result-panel', 'scene-button-confirm', 'scene-button-secondary']
      .map((key) => keys.has(key)),
    [true, true, true, true],
  );
});

test('骨堆与骨片、盐晶、鱼均指向固定精灵', () => {
  assert.deepEqual(ITEM_TEXTURE_BY_TYPE, {
    bone: 'item-bone',
    salt: 'item-salt',
    fish: 'item-fish',
  });
  assert.ok(PIXEL_UI_ASSETS.some(({ key }) => key === 'prop-bone-pile'));
});

test('新食物分支与场景产出容器都有固定资产映射', () => {
  assert.equal(ICON_TEXTURE_BY_BRANCH.newFood, 'icon-new-food');
  assert.equal(ICON_TEXTURE_BY_BRANCH.saltMine, 'icon-salt-mine');
  assert.equal(ICON_TEXTURE_BY_BRANCH.pond, 'icon-pond');
  assert.deepEqual(PRODUCTION_PROP_TEXTURE_BY_TYPE, {
    salt: 'prop-salt-mine',
    fish: 'prop-pond',
  });
});
