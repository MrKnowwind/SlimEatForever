import * as Phaser from 'phaser';
import {
  ICON_TEXTURE_BY_BRANCH, ITEM_TEXTURE_BY_TYPE, NODE_TEXTURE_BY_STATE, PixelTheme, PRODUCTION_PROP_TEXTURE_BY_TYPE,
} from './pixelUiAssets.js';

export const PixelMetrics = Object.freeze({ UNIT: 4, OUTLINE: 4, UI_BORDER: 4 });

export const PixelPalette = Object.freeze({
  ink: 0x091016, void: 0x05080c, cave: 0x101b22, wall: 0x1a292f,
  wallDark: 0x142127, stone: 0x293a3e, stoneLight: 0x3b5151,
  edge: 0x4b6260, floor: 0x1d2d31, floorLight: 0x2d4142,
  moss: 0x426957, mossLight: 0x6f9970, cyan: 0x70cfc3,
  gold: 0xe7bf69, bone: 0xe9d6a8, boneLight: 0xfff0c8,
  boneShade: 0x9a805b, red: 0xd66d62, redDark: 0x5b332f,
  skin: 0xd89a72, wood: 0x9a6138, cloth: 0x6a5147, white: 0xeaf2dc,
});

const css = (color, alpha = 1) => {
  const value = color.toString(16).padStart(6, '0');
  if (alpha === 1) return `#${value}`;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const rect = (ctx, x, y, w, h, color, alpha = 1) => {
  ctx.fillStyle = typeof color === 'number' ? css(color, alpha) : color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const textureKey = (prefix, parts) => `${prefix}-${parts.map((part) => String(part).replace(/[^a-z0-9]/gi, '')).join('-')}`;

export function canvasTexture(scene, key, width, height, paint) {
  if (!scene.textures.exists(key)) {
    const canvas = scene.textures.createCanvas(key, width, height).getSourceImage();
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    paint(ctx);
    scene.textures.get(key).refresh();
  }
  scene.textures.get(key).setFilter?.(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

function imageFrom(scene, key, width, height, paint) {
  return scene.add.image(0, 0, canvasTexture(scene, key, width, height, paint));
}

function fitAsset(scene, key, maxWidth, maxHeight) {
  const source = scene.textures.get(key).getSourceImage();
  const scale = Math.min(maxWidth / source.width, maxHeight / source.height);
  return scene.add.image(0, 0, key).setScale(scale);
}

const shadowMasks = {
  small: [[5, 4], [2, 10], [0, 14], [2, 10], [5, 4]],
  medium: [[7, 8], [3, 16], [0, 22], [3, 16], [7, 8]],
  large: [[10, 10], [4, 22], [0, 30], [4, 22], [10, 10]],
};

export const PixelShadows = Object.freeze({
  create(scene, size = 'medium', alpha = 0.56) {
    const mask = shadowMasks[size] || shadowMasks.medium;
    const unit = PixelMetrics.UNIT;
    const cells = Math.max(...mask.map(([left, width]) => left + width));
    const key = `pixel-shadow-${size}-v1`;
    return imageFrom(scene, key, cells * unit, mask.length * unit, (ctx) => {
      mask.forEach(([left, width], row) => rect(ctx, left * unit, row * unit, width * unit, unit, PixelPalette.void));
    }).setAlpha(alpha);
  },
});

const wallTiles = Object.freeze([
  { w: 56, h: 20, color: PixelPalette.wall },
  { w: 64, h: 20, color: PixelPalette.wallDark, chip: 'br' },
  { w: 48, h: 24, color: PixelPalette.wall, crack: true },
  { w: 68, h: 20, color: PixelPalette.stone, chip: 'tl' },
  { w: 52, h: 20, color: PixelPalette.wallDark, moss: true },
]);

const floorTiles = Object.freeze([
  { w: 136, h: 52, color: 0x26393b, shape: 0 },
  { w: 112, h: 60, color: 0x293b3d, shape: 1, crack: true },
  { w: 152, h: 48, color: 0x1a292e, shape: 2, chip: 'br' },
  { w: 124, h: 56, color: 0x243638, shape: 3, moss: true },
]);

function paintTile(ctx, x, y, tile, quiet = false) {
  const border = PixelMetrics.OUTLINE;
  rect(ctx, x, y, tile.w, tile.h, PixelPalette.void, quiet ? 0.34 : 0.72);
  rect(ctx, x + border, y + border, tile.w - border * 2, tile.h - border * 2, tile.color, quiet ? 0.62 : 1);
  if (!quiet) rect(ctx, x + border * 2, y + border * 2, tile.w - border * 4, border, PixelPalette.edge, 0.2);
  if (tile.chip === 'br') rect(ctx, x + tile.w - 16, y + tile.h - 12, 12, 8, PixelPalette.cave);
  if (tile.chip === 'tl') rect(ctx, x + border, y + border, 12, 8, PixelPalette.cave);
  if (tile.crack) {
    rect(ctx, x + Math.floor(tile.w * 0.62), y + 12, 4, 12, PixelPalette.void, 0.7);
    rect(ctx, x + Math.floor(tile.w * 0.62) - 8, y + 20, 12, 4, PixelPalette.void, 0.7);
  }
  if (tile.moss) rect(ctx, x + 12, y + tile.h - 8, 24, 4, PixelPalette.moss, 0.68);
}

function paintFloorTile(ctx, x, y, tile) {
  const topInset = [12, 8, 20, 16][tile.shape];
  const lowerInset = [8, 16, 12, 4][tile.shape];
  const sideShift = [0, 4, -4, 4][tile.shape];
  rect(ctx, x + topInset, y, tile.w - topInset * 2, 4, PixelPalette.edge, 0.24);
  rect(ctx, x + 8 + sideShift, y + 4, tile.w - 20, 4, tile.color, 0.82);
  rect(ctx, x + 4, y + 8, tile.w - 12, tile.h - 20, tile.color, 0.74);
  rect(ctx, x + lowerInset, y + tile.h - 12, tile.w - lowerInset * 2 - 4, 8, tile.color, 0.58);
  rect(ctx, x + lowerInset + 12, y + tile.h - 4, tile.w - lowerInset * 2 - 28, 4, PixelPalette.void, 0.22);
  if (tile.shape === 1) {
    rect(ctx, x + 4, y + 12, 4, 16, PixelPalette.floor);
    rect(ctx, x + tile.w - 12, y + tile.h - 24, 8, 12, PixelPalette.floor);
  }
  if (tile.shape === 2) {
    rect(ctx, x + tile.w - 24, y + 4, 16, 4, PixelPalette.floor);
    rect(ctx, x + 4, y + tile.h - 20, 12, 8, PixelPalette.floor);
  }
  if (tile.crack) {
    rect(ctx, x + Math.floor(tile.w * 0.58), y + 16, 4, 8, PixelPalette.void, 0.58);
    rect(ctx, x + Math.floor(tile.w * 0.58) - 8, y + 24, 12, 4, PixelPalette.void, 0.58);
    rect(ctx, x + Math.floor(tile.w * 0.58) - 8, y + 28, 4, 8, PixelPalette.void, 0.58);
  }
  if (tile.chip === 'br') {
    rect(ctx, x + tile.w - 24, y + tile.h - 16, 16, 8, PixelPalette.floor);
    rect(ctx, x + tile.w - 16, y + tile.h - 20, 8, 4, PixelPalette.floor);
  }
  if (tile.moss) {
    rect(ctx, x + 20, y + tile.h - 16, 24, 4, PixelPalette.moss, 0.45);
    rect(ctx, x + 28, y + tile.h - 12, 8, 4, PixelPalette.moss, 0.45);
  }
}

export const DungeonTiles = Object.freeze({ wall: wallTiles, floor: floorTiles });

const wallLayout = Object.freeze([
  [52, 128, 0], [164, 124, 3], [294, 138, 1], [820, 128, 2], [946, 124, 0], [1054, 142, 4],
  [78, 210, 4], [228, 196, 2], [892, 208, 1], [1036, 222, 3],
  [46, 296, 1], [178, 310, 0], [312, 286, 4], [806, 300, 3], [952, 286, 2], [1064, 318, 0],
]);

const floorLayout = Object.freeze([
  [44, 410, 0], [218, 402, 2], [420, 418, 1], [616, 404, 3], [798, 414, 0], [986, 402, 1],
  [92, 500, 3], [286, 514, 1], [480, 496, 0], [680, 516, 2], [874, 500, 1], [1032, 520, 3],
  [40, 610, 2], [230, 596, 0], [430, 618, 3], [646, 602, 1], [836, 620, 0], [1020, 598, 2],
]);

export function createDungeon(scene, width, height) {
  const key = `dungeon-room-${width}x${height}-v6`;
  return imageFrom(scene, key, width, height, (ctx) => {
    rect(ctx, 0, 0, width, height, PixelPalette.void);
    rect(ctx, 28, 104, width - 56, 286, PixelPalette.cave);
    rect(ctx, 28, 390, width - 56, height - 430, PixelPalette.floor);
    wallLayout.forEach(([x, y, variant]) => paintTile(ctx, x, y, wallTiles[variant], true));
    floorLayout.forEach(([x, y, variant]) => paintFloorTile(ctx, x, y, floorTiles[variant]));
    const cx = Math.floor(width / 2);
    [[-40, 154, 80, 20], [-68, 174, 136, 20], [-92, 194, 184, 24], [-108, 218, 216, 172]].forEach(([ox, y, w, h]) => rect(ctx, cx + ox, y, w, h, PixelPalette.void));
    [[-136, 218, 28, 172], [108, 218, 28, 172], [-124, 194, 32, 24], [92, 194, 32, 24], [-104, 174, 36, 24], [68, 174, 36, 24], [-72, 154, 36, 24], [36, 154, 36, 24], [-36, 138, 72, 24]].forEach(([ox, y, w, h], index) => {
      rect(ctx, cx + ox, y, w, h, PixelPalette.void);
      rect(ctx, cx + ox + 4, y + 4, w - 8, h - 8, index % 3 === 0 ? PixelPalette.stoneLight : PixelPalette.stone);
    });
    for (let y = 230, row = 0; y < 388; y += 36, row += 1) {
      const shade = row % 3 === 1 ? PixelPalette.wallDark : PixelPalette.stone;
      rect(ctx, cx - 132, y, 20, 28, shade);
      rect(ctx, cx + 112, y + (row % 2) * 4, 20, 28, shade);
    }
    rect(ctx, cx - 128, 252, 4, 20, PixelPalette.void, 0.75);
    rect(ctx, cx - 140, 268, 16, 4, PixelPalette.void, 0.75);
    rect(ctx, cx + 120, 312, 4, 20, PixelPalette.void, 0.75);
    rect(ctx, cx + 120, 328, 16, 4, PixelPalette.void, 0.75);
    rect(ctx, cx - 116, 344, 20, 4, PixelPalette.moss, 0.55);
    rect(ctx, cx + 100, 278, 16, 4, PixelPalette.mossLight, 0.32);
  }).setOrigin(0).setDepth(0);
}

export function makeBattleBackdrop(scene, width, height) {
  const root = scene.add.container(0, 0);
  const cover = scene.add.rectangle(width / 2, height / 2, width, height, 0x071016, 1);
  const layer = (x, y, alpha) => scene.add.image(width / 2 + x, height / 2 + y, 'scene-dungeon-background')
    .setDisplaySize(width + 8, height + 8)
    .setTint(0x687b83)
    .setAlpha(alpha);
  const backgroundLayers = [layer(0, 0, 0.62), layer(-4, 0, 0.11), layer(4, 0, 0.11), layer(0, -4, 0.08), layer(0, 4, 0.08)];
  const shade = scene.add.rectangle(width / 2, height / 2, width, height, 0x071016, 0.28);
  root.add([cover, ...backgroundLayers, shade]);
  return root;
}

export const DungeonProps = Object.freeze({
  bonePile(scene, direction = 1) {
    const root = scene.add.container(0, 0);
    const shadow = PixelShadows.create(scene, 'medium', 0.42).setPosition(0, 28);
    const art = scene.add.image(0, 0, 'prop-bone-pile').setScale(0.225);
    art.pixelBaseScaleX = 0.225;
    art.pixelBaseScaleY = 0.225;
    if (direction < 0) art.setFlipX(true);
    root.add([shadow, art]);
    return { root, artGroup: art };

    {
    const art = imageFrom(scene, 'bone-pile-v8', 152, 88, (ctx) => {
      rect(ctx, 24, 68, 104, 4, PixelPalette.void, 0.5);
      rect(ctx, 40, 72, 72, 4, PixelPalette.void, 0.25);
      [[28, 60, 16, 8], [48, 64, 24, 8], [82, 60, 28, 8], [114, 64, 10, 4]].forEach(([x, y, w, h], index) => rect(ctx, x, y, w, h, index % 2 ? PixelPalette.cave : PixelPalette.wallDark));
      const bone = (x, y, rise = 0, flip = false) => {
        const steps = [0, 0, rise, rise, rise * 2];
        const cells = steps.map((dy, index) => [x + index * 6, y + (flip ? -dy : dy)]);
        cells.forEach(([cx, cy]) => rect(ctx, cx, cy, 10, 10, PixelPalette.boneShade));
        cells.forEach(([cx, cy]) => rect(ctx, cx + 2, cy + 2, 6, 6, PixelPalette.bone));
        const [sx, sy] = cells[0];
        const [ex, ey] = cells[cells.length - 1];
        [[sx - 4, sy - 2], [sx - 2, sy + 6], [ex + 6, ey - 2], [ex + 4, ey + 6]].forEach(([cx, cy]) => {
          rect(ctx, cx, cy, 8, 8, PixelPalette.boneShade);
          rect(ctx, cx + 2, cy + 2, 4, 4, PixelPalette.boneLight);
        });
      };
      bone(24, 46, 4, true);
      bone(76, 43, 4, false);
      bone(49, 54, 4, false);
      bone(91, 62, 0, true);
      bone(24, 65, 0, false);
      rect(ctx, 64, 46, 8, 4, PixelPalette.boneLight);
      rect(ctx, 108, 54, 6, 4, PixelPalette.boneLight);
    });
    const root = scene.add.container(0, 0);
    const shadow = PixelShadows.create(scene, 'medium', 0.42).setPosition(0, 28);
    art.setScale(direction, 1);
    root.add([shadow, art]);
    return { root, artGroup: art };
    }
  },
  productionSource(scene, type, direction = 1) {
    const texture = PRODUCTION_PROP_TEXTURE_BY_TYPE[type];
    if (!texture) return this.bonePile(scene, direction);
    const root = scene.add.container(0, 0);
    const shadow = PixelShadows.create(scene, 'medium', 0.38).setPosition(0, 32);
    const { width, height } = PixelTheme.productionPropDisplaySize;
    const art = scene.add.image(0, 0, texture).setDisplaySize(width, height);
    art.pixelBaseScaleX = art.scaleX;
    art.pixelBaseScaleY = art.scaleY;
    if (direction < 0) art.setFlipX(true);
    root.add([shadow, art]);
    return { root, artGroup: art };
  },
  groundPatch(scene, side = 'slime') {
    return fitAsset(scene, `prop-battle-platform-${side}-v2`, 232, 76);

    /* Legacy runtime-painted platform retained temporarily during asset migration. */
    const key = `ground-patch-${side}-v3`;
    return imageFrom(scene, key, 196, 52, (ctx) => {
      const base = side === 'slime' ? PixelPalette.stone : 0x3a2a2e;
      const accent = side === 'slime' ? PixelPalette.cyan : PixelPalette.redDark;
      [[36, 8, 124, 4], [20, 12, 156, 8], [8, 20, 180, 16], [24, 36, 148, 8], [48, 44, 100, 4]].forEach(([x, y, w, h]) => rect(ctx, x, y, w, h, base));
      rect(ctx, 52, 16, 40, 4, accent, 0.85);
      rect(ctx, 88, 20, 4, 12, accent, 0.85);
      rect(ctx, 126, 30, 24, 4, PixelPalette.void, 0.55);
      if (side === 'enemy') { rect(ctx, 58, 14, 4, 18, PixelPalette.red, 0.45); rect(ctx, 50, 26, 16, 4, PixelPalette.red, 0.45); rect(ctx, 158, 30, 12, 4, PixelPalette.wood, 0.8); }
    });
  },
});

export const ItemSprites = Object.freeze({
  create(scene, type = 'bone') {
    const assetKey = ITEM_TEXTURE_BY_TYPE[type];
    if (assetKey) {
      const root = scene.add.container(0, 0);
      const shadow = PixelShadows.create(scene, 'small', 0.42).setPosition(0, 17);
      const glow = fitAsset(scene, assetKey, 62, 62).setTint(PixelPalette.white).setAlpha(0.28).setVisible(false);
      const image = fitAsset(scene, assetKey, 56, 56);
      root.add([shadow, glow, image]);
      root.pixelGlow = glow;
      return root;
    }
    const key = `item-${type}-v6`;
    const image = imageFrom(scene, key, 56, 56, (ctx) => {
      if (type === 'adventurer') {
        rect(ctx, 12, 22, 28, 24, PixelPalette.ink); rect(ctx, 16, 24, 20, 16, PixelPalette.cloth);
        rect(ctx, 20, 10, 16, 16, PixelPalette.skin); rect(ctx, 18, 6, 20, 8, 0x4a332e);
        rect(ctx, 41, 10, 4, 36, PixelPalette.ink); rect(ctx, 45, 8, 4, 34, PixelPalette.wood);
        rect(ctx, 16, 29, 12, 4, PixelPalette.gold);
      } else if (type === 'salt') {
        rect(ctx, 20, 12, 16, 8, PixelPalette.ink); rect(ctx, 12, 20, 32, 24, PixelPalette.ink);
        rect(ctx, 20, 16, 16, 8, 0xf7ffff); rect(ctx, 16, 24, 24, 16, 0xd9eef0); rect(ctx, 24, 20, 8, 8, 0xffffff);
        rect(ctx, 16, 40, 24, 4, 0x82a9b4);
      } else if (type === 'fish') {
        rect(ctx, 12, 24, 32, 20, PixelPalette.ink); rect(ctx, 8, 28, 12, 12, PixelPalette.ink);
        rect(ctx, 16, 28, 24, 12, 0x62b8d2); rect(ctx, 8, 32, 8, 8, 0x3b83a3);
        rect(ctx, 24, 24, 8, 4, 0xa9e8ef); rect(ctx, 36, 28, 4, 4, PixelPalette.ink); rect(ctx, 40, 36, 8, 8, 0x2c6f91);
      } else {
        const unit = 4;
        const cells = [
          [2, 5], [3, 5], [2, 8], [3, 8], [3, 6], [3, 7],
          [4, 6], [4, 7], [5, 6], [5, 7], [6, 6], [6, 7],
          [7, 6], [7, 7], [8, 6], [8, 7], [9, 6], [9, 7],
          [10, 6], [10, 7], [11, 5], [12, 5], [11, 8], [12, 8],
        ];
        const body = new Set(cells.map(([x, y]) => `${x},${y}`));
        const outline = new Set();
        cells.forEach(([x, y]) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => {
          if (!body.has(`${nx},${ny}`)) outline.add(`${nx},${ny}`);
        }));
        outline.forEach((value) => {
          const [x, y] = value.split(',').map(Number);
          rect(ctx, x * unit, y * unit, unit, unit, PixelPalette.gold);
        });
        cells.forEach(([x, y]) => rect(ctx, x * unit, y * unit, unit, unit, y === 7 || y === 8 ? PixelPalette.boneShade : PixelPalette.bone));
        [[3, 5], [4, 6], [5, 6], [6, 6], [7, 6], [11, 5]].forEach(([x, y]) => rect(ctx, x * unit, y * unit, unit, unit, PixelPalette.boneLight));
      }
    });
    const root = scene.add.container(0, 0);
    const shadow = PixelShadows.create(scene, 'small', 0.42).setPosition(0, 17);
    const glow = scene.add.image(0, 0, key).setTint(PixelPalette.white).setAlpha(0.28).setScale(1.12).setVisible(false);
    root.add([shadow, glow, image]);
    root.pixelGlow = glow;
    return root;
  },
});

const enemyColors = Object.freeze({
  rookie: { hair: 0x4a332e, cloth: 0x75533e, trim: 0xd7ad68, skin: 0xd89a72, weapon: 0x9a6138 },
  hunter: { hair: 0x3b3029, cloth: 0x41584f, trim: 0xc7a265, skin: 0xc9916f, weapon: 0x9b6a3d },
  archer: { hair: 0x263f43, cloth: 0x526f69, trim: 0xd7cc7a, skin: 0xd89a72, weapon: 0xc79650 },
  guard: { hair: 0x393b48, cloth: 0x784b43, trim: 0xd8ad84, skin: 0xc98e69, weapon: 0xcfd9d2 },
  oracle: { hair: 0x312742, cloth: 0x645477, trim: 0xd1b3e7, skin: 0xd7a77f, weapon: 0xbde7dd },
});

export const EnemySprites = Object.freeze({
  create(scene, role = 'rookie', scale = 1) {
    const p = enemyColors[role];
    const image = imageFrom(scene, `enemy-${role}-v7`, 64, 88, (ctx) => {
      rect(ctx, 14, 58, 16, 22, PixelPalette.ink); rect(ctx, 34, 58, 16, 22, PixelPalette.ink); rect(ctx, 18, 58, 8, 16, 0x2d3038); rect(ctx, 38, 58, 8, 16, 0x2d3038);
      rect(ctx, 10, 34, 44, 32, PixelPalette.ink); rect(ctx, 14, 34, 36, 28, p.cloth); rect(ctx, 18, 48, 28, 10, p.trim);
      rect(ctx, 6, 38, 12, 22, PixelPalette.ink); rect(ctx, 10, 40, 8, 16, p.skin); rect(ctx, 46, 38, 12, 22, PixelPalette.ink); rect(ctx, 46, 40, 8, 16, p.skin);
      rect(ctx, 12, 10, 40, 30, PixelPalette.ink); rect(ctx, 16, 14, 32, 22, p.skin); rect(ctx, 12, 8, 36, 12, p.hair); rect(ctx, 12, 16, 8, 16, p.hair); rect(ctx, 44, 12, 8, 20, p.hair);
      rect(ctx, 22, 24, 4, 4, PixelPalette.ink); rect(ctx, 38, 24, 4, 4, PixelPalette.ink); rect(ctx, 28, 32, 8, 4, 0x8a5548); rect(ctx, 18, 14, 12, 4, 0x6b4938);
      if (role === 'hunter') {
        rect(ctx, 0, 24, 8, 40, PixelPalette.ink); rect(ctx, 4, 18, 8, 12, PixelPalette.ink); rect(ctx, 4, 58, 8, 12, PixelPalette.ink);
        rect(ctx, 4, 26, 4, 34, p.weapon); rect(ctx, 8, 20, 4, 10, p.weapon); rect(ctx, 8, 56, 4, 10, p.weapon);
        rect(ctx, 14, 20, 2, 44, PixelPalette.boneLight, 0.8);
        rect(ctx, 48, 30, 8, 24, PixelPalette.ink); rect(ctx, 50, 32, 4, 20, p.weapon);
      }
      if (role === 'guard') { rect(ctx, 4, 34, 16, 30, PixelPalette.ink); rect(ctx, 8, 38, 8, 22, 0x64818a); rect(ctx, 16, 6, 32, 8, p.weapon); }
      if (role === 'archer') { rect(ctx, 54, 16, 4, 52, p.weapon); rect(ctx, 50, 16, 4, 8, PixelPalette.ink); rect(ctx, 50, 60, 4, 8, PixelPalette.ink); }
      if (role === 'oracle') { rect(ctx, 48, 4, 12, 12, 0xe4ffff); rect(ctx, 52, 0, 4, 20, p.weapon); }
    });
    const weapon = imageFrom(scene, `enemy-weapon-${role}-v5`, 28, 72, (ctx) => {
      if (role === 'hunter') {
        rect(ctx, 8, 6, 8, 4, PixelPalette.ink); rect(ctx, 4, 10, 8, 8, PixelPalette.ink);
        rect(ctx, 2, 18, 8, 32, PixelPalette.ink); rect(ctx, 4, 50, 8, 10, PixelPalette.ink);
        rect(ctx, 10, 10, 4, 8, p.weapon); rect(ctx, 6, 18, 4, 32, p.weapon); rect(ctx, 6, 50, 4, 8, p.weapon);
        rect(ctx, 14, 10, 2, 48, PixelPalette.boneLight, 0.75);
        rect(ctx, 14, 4, 10, 4, PixelPalette.ink); rect(ctx, 20, 6, 4, 4, PixelPalette.ink);
        rect(ctx, 14, 4, 8, 2, p.weapon); rect(ctx, 20, 8, 4, 2, p.weapon);
        return;
      }
      // 剑尖在上、护手在下、短握柄贴近手掌；避免剑身与握柄混成一根木棍。
      rect(ctx, 12, 0, 4, 4, PixelPalette.ink);
      rect(ctx, 10, 4, 8, 40, PixelPalette.ink); rect(ctx, 12, 4, 4, 40, p.weapon);
      rect(ctx, 16, 8, 2, 30, PixelPalette.wood);
      rect(ctx, 4, 42, 20, 8, PixelPalette.ink); rect(ctx, 6, 44, 16, 4, p.weapon);
      rect(ctx, 10, 50, 8, 18, PixelPalette.ink); rect(ctx, 12, 50, 4, 14, 0x70452d);
      rect(ctx, 8, 64, 12, 4, PixelPalette.ink); rect(ctx, 10, 64, 8, 4, PixelPalette.gold);
    }).setOrigin(0.35, 0.92);
    // 战斗中的冒险者面向左侧，木剑应握在靠近史莱姆的左手。
    const weaponPivot = scene.add.container(-16, -20);
    weaponPivot.add(weapon);
    const root = scene.add.container(0, 0).setScale(scale);
    root.add([image.setOrigin(0.5, 0.82), weaponPivot]);
    root.weapon = weapon;
    root.weaponPivot = weaponPivot;
    return root;
  },
});

function paintOutlinedIcon(ctx, cells, colors, offsetX = 28, offsetY = 28, unit = 4) {
  const body = new Map(cells.map(([x, y, tone = 'main']) => [`${x},${y}`, tone]));
  const outline = new Set();
  body.forEach((tone, key) => {
    const [x, y] = key.split(',').map(Number);
    [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => {
      if (!body.has(`${nx},${ny}`)) outline.add(`${nx},${ny}`);
    });
  });
  outline.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    rect(ctx, offsetX + x * unit, offsetY + y * unit, unit, unit, colors.outline);
  });
  body.forEach((tone, key) => {
    const [x, y] = key.split(',').map(Number);
    rect(ctx, offsetX + x * unit, offsetY + y * unit, unit, unit, colors[tone] || colors.main);
  });
}

function diagonalBone(offsetX = 0, offsetY = 0, reverse = false) {
  const cells = [];
  for (let step = 0; step < 7; step += 1) {
    const x = offsetX + 3 + step;
    const y = offsetY + (reverse ? 3 + step : 9 - step);
    cells.push([x, y], [x, y + 1, step > 4 ? 'light' : step < 2 ? 'dark' : 'main']);
  }
  const ends = reverse
    ? [[2, 2], [3, 2], [2, 3], [9, 10], [10, 10], [10, 9]]
    : [[2, 9], [2, 10], [3, 10], [9, 2], [10, 2], [10, 3]];
  ends.forEach(([x, y], index) => cells.push([offsetX + x, offsetY + y, index === 1 || index === 4 ? 'light' : 'main']));
  return cells;
}

function paintSkillIcon(ctx, branch, colors, question = false) {
  if (question) {
    paintOutlinedIcon(ctx, [
      [4, 2], [5, 1], [6, 1], [7, 2], [7, 3], [6, 4], [5, 4], [5, 5], [5, 6, 'dark'], [5, 9],
    ], colors, 32, 30, 5);
    return;
  }

  let cells = [];
  if (branch === 'nutrition') {
    cells = diagonalBone();
  } else if (branch === 'production') {
    for (let y = 2; y <= 10; y += 1) cells.push([6, y, y === 2 ? 'light' : 'main']);
    for (let x = 2; x <= 10; x += 1) cells.push([x, 6, x < 4 ? 'light' : 'main']);
  } else if (branch === 'extraPile') {
    for (let x = 2; x <= 11; x += 1) cells.push([x, 10, x < 5 ? 'light' : 'dark']);
    for (let x = 3; x <= 10; x += 1) cells.push([x, 9]);
    [[4, 5], [5, 4], [6, 4], [7, 4], [8, 5], [4, 6], [5, 6, 'dark'], [6, 6], [7, 6, 'dark'], [8, 6], [5, 7], [6, 7, 'dark'], [7, 7]].forEach((cell) => cells.push(cell));
  } else if (branch === 'dye') {
    [[5, 2, 'light'], [6, 2], [7, 2], [5, 3], [6, 3], [7, 3], [4, 5, 'light'], [5, 4], [6, 4], [7, 4], [8, 5], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6, 'dark'], [9, 6, 'dark'], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7, 'accent'], [8, 7, 'accent'], [9, 7, 'dark'], [4, 8], [5, 8], [6, 8, 'accent'], [7, 8, 'accent'], [8, 8, 'dark'], [5, 9], [6, 9, 'dark'], [7, 9, 'dark']].forEach((cell) => cells.push(cell));
  } else if (branch === 'evolution') {
    [[6, 1, 'light'], [5, 2, 'light'], [6, 2], [7, 2], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4, 'dark'], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5, 'dark'], [10, 5, 'dark'], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6, 'dark'], [9, 6, 'dark'], [10, 6, 'dark'], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7, 'dark'], [9, 7, 'dark'], [4, 8], [5, 8], [6, 8], [7, 8, 'dark'], [8, 8, 'dark']].forEach((cell) => cells.push(cell));
  } else if (branch === 'largeBone') {
    cells = diagonalBone().flatMap(([x, y, tone]) => [[x, y, tone], [x + 1, y, tone]]);
  } else if (branch === 'betterBone') {
    cells = diagonalBone();
    [[9, 7, 'accent'], [10, 6, 'accent'], [11, 5, 'accent'], [10, 5, 'accent'], [11, 4, 'accent']].forEach((cell) => cells.push(cell));
  } else if (branch === 'bonusProduction') {
    cells = [...diagonalBone(-2, 2), ...diagonalBone(2, -2)];
  } else if (branch === 'boneSearch') {
    for (let y = 2; y <= 8; y += 1) cells.push([6, y, y === 2 ? 'light' : 'main']);
    [[4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [4, 9], [5, 9], [6, 9, 'dark'], [7, 9, 'dark'], [8, 9, 'dark'], [5, 10, 'dark'], [6, 10, 'dark'], [7, 10, 'dark']].forEach((cell) => cells.push(cell));
  } else if (branch === 'fusedPile') {
    for (let y = 8; y <= 10; y += 1) for (let x = 2 + (10 - y); x <= 11 - (10 - y); x += 1) cells.push([x, y, y === 10 ? 'dark' : 'main']);
    [[5, 4, 'light'], [6, 3], [7, 3], [8, 4], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [4, 6], [5, 6, 'dark'], [6, 6], [7, 6, 'dark'], [8, 6], [9, 6], [5, 7], [6, 7, 'dark'], [7, 7, 'dark'], [8, 7]].forEach((cell) => cells.push(cell));
  } else if (branch === 'newFood') {
    cells = [[4, 4, 'light'], [5, 3], [6, 3], [7, 4], [4, 5], [5, 5], [6, 5, 'accent'], [7, 5], [8, 5], [5, 6], [6, 6, 'dark'], [7, 6], [6, 7], [5, 8, 'light'], [6, 8], [7, 8]];
  } else if (branch === 'saltMine') {
    cells = [[6, 2, 'light'], [5, 3, 'light'], [6, 3], [7, 3], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [4, 5], [5, 5, 'dark'], [6, 5], [7, 5, 'dark'], [8, 5], [5, 6], [6, 6, 'light'], [7, 6], [6, 7, 'dark']];
  } else if (branch === 'pond') {
    cells = [[3, 5], [4, 4, 'light'], [5, 4], [6, 5], [7, 5], [8, 4, 'light'], [9, 5], [4, 6], [5, 6], [6, 6, 'dark'], [7, 6], [8, 6], [5, 7], [6, 7], [7, 7, 'dark'], [6, 8, 'accent'], [7, 8]];
  }
  paintOutlinedIcon(ctx, cells, colors);
}

export const PixelUI = Object.freeze({
  panel(scene, x, y, width, height, edge = PixelPalette.edge, fillColor = PixelPalette.ink, alpha = 0.96) {
    const key = textureKey('ui-panel-v4', [width, height, edge, fillColor]);
    return imageFrom(scene, key, width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, edge); rect(ctx, PixelMetrics.UI_BORDER, PixelMetrics.UI_BORDER, width - 8, height - 8, fillColor, alpha); rect(ctx, 12, 8, width - 24, 4, PixelPalette.white, 0.07);
    }).setPosition(x, y);
  },
  treePanel(scene, x, y, width, height) {
    return fitAsset(scene, 'panel-frame', width, height)
      .setPosition(x, y);
  },
  treeDetailPanel(scene, x, y, width, height) {
    const source = scene.textures.get('tree-detail-panel-v3').getSourceImage();
    const scale = width / source.width;
    return scene.add.nineslice(
      x, y, 'tree-detail-panel-v3', undefined,
      source.width, height / scale,
      90, 90, 90, 90,
    ).setScale(scale);
  },
  resultPanel(scene, x, y, width, height) {
    // The generated frame has a few transparent pixels heavier on the left;
    // offset the sprite slightly so its visible medallion/frame center follows the UI centerline.
    return fitAsset(scene, 'scene-result-panel', width, height).setPosition(x - 30, y);
  },
  resultButton(scene, variant, width, height) {
    const key = variant === 'confirm' ? 'scene-button-confirm' : 'scene-button-secondary';
    return fitAsset(scene, key, width, height);
  },
  bar(scene, x, y, width, height, color) {
    const background = imageFrom(scene, textureKey('ui-bar-bg-v3', [width, height]), width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, PixelPalette.void); rect(ctx, 4, 4, width - 8, height - 8, PixelPalette.wallDark);
    }).setPosition(x, y);
    const fillImage = imageFrom(scene, textureKey('ui-bar-fill-v3', [width, height, color]), width - 8, Math.max(4, height - 8), (ctx) => {
      rect(ctx, 0, 0, width - 8, Math.max(4, height - 8), color); rect(ctx, 0, 0, width - 8, 2, PixelPalette.white, 0.18);
    }).setPosition(x - width / 2 + 4, y).setOrigin(0, 0.5);
    return { background, fill: fillImage, maxWidth: width - 8 };
  },
  skillNode(scene, branch = 'nutrition', state = 'locked', question = false) {
    const visualState = question ? 'unknown' : state === 'ready' ? 'available' : state;
    const root = scene.add.container(0, 0)
      .setSize(PixelTheme.nodeDisplaySize, PixelTheme.nodeDisplaySize);
    const shell = fitAsset(scene, NODE_TEXTURE_BY_STATE[visualState] || NODE_TEXTURE_BY_STATE.locked,
      PixelTheme.nodeDisplaySize, PixelTheme.nodeDisplaySize);
    const iconKey = visualState === 'unknown' ? 'icon-unknown' : ICON_TEXTURE_BY_BRANCH[branch] || 'icon-unknown';
    const icon = fitAsset(scene, iconKey, PixelTheme.iconDisplaySize, PixelTheme.iconDisplaySize)
      // The flask's visual mass sits below its transparent bottle neck;
      // lift only this icon so its perceived center matches the other nodes.
      .setPosition(branch === 'dye' ? -5 : 0, branch === 'dye' ? -4 : 0);
    if (visualState === 'locked') icon.setAlpha(0.82).setTint(0xb8c5c5);
    root.add([shell, icon]);
    return root;

    /* Legacy runtime-painted node kept temporarily below for diff safety; unreachable after asset migration. */
    const stateColors = {
      owned: [0x183a39, 0x85e0aa, 0x102b2b, 0xd9f7d7],
      ready: [0x5a4325, 0xf1c65f, 0x2b261d, 0xffedb5],
      locked: [0x243842, 0x7897a4, 0x142630, 0xa9c2c8],
    };
    const [rimDark, rimLight, fill, detail] = stateColors[state] || stateColors.locked;
    const key = textureKey('skill-node-v14', [branch, state, question]);
    return imageFrom(scene, key, 112, 112, (ctx) => {
      const rows = [24, 40, 56, 72, 88, 96, 104, 104, 104, 104, 104, 104, 104, 104, 104, 104, 104, 104, 96, 88, 72, 56, 40, 24];
      rows.forEach((width, row) => rect(ctx, (112 - width) / 2 + 4, row * 4 + 12, width, 4, 0x07111a, 0.62));
      rows.forEach((width, row) => rect(ctx, (112 - width) / 2, row * 4 + 4, width, 4, rimDark));
      rows.slice(1, -1).forEach((width, index) => rect(ctx, (112 - width + 12) / 2, index * 4 + 8, width - 12, 4, fill));
      rect(ctx, 28, 16, 28, 4, rimLight, 0.72);
      rect(ctx, 20, 28, 4, 20, rimLight, 0.72);
      const mutedIcon = state === 'locked';
      const themedMain = branch === 'dye' ? 0x8969cb
        : branch === 'evolution' ? 0x55bfe3
          : branch === 'production' ? 0x9be5bb
            : branch === 'saltMine' ? 0xd9eef0
              : branch === 'pond' ? 0x62b8d2
                : branch === 'newFood' ? 0x8bd8c5 : PixelPalette.bone;
      const themedLight = branch === 'dye' ? 0xc8aff0
        : branch === 'evolution' ? 0xbcecf5
          : branch === 'saltMine' ? 0xffffff
            : branch === 'pond' ? 0xa9e8ef
              : branch === 'newFood' ? 0xc7f4dd : PixelPalette.boneLight;
      const themedDark = branch === 'dye' ? 0x584497
        : branch === 'evolution' ? 0x397fae
          : branch === 'saltMine' ? 0x82a9b4
            : branch === 'pond' ? 0x2c6f91
              : branch === 'newFood' ? 0x397f72 : PixelPalette.boneShade;
      paintSkillIcon(ctx, branch, {
        outline: 0x07121c,
        main: mutedIcon ? detail : themedMain,
        light: mutedIcon ? rimLight : themedLight,
        dark: mutedIcon ? rimDark : themedDark,
        accent: mutedIcon ? rimLight : branch === 'dye' ? 0xa981df : 0x7bd9bb,
      }, question);
      return;
      if (false) {
      if (question) {
        rect(ctx, 42, 34, 28, 8, 0x0a1720); rect(ctx, 62, 38, 12, 20, 0x0a1720);
        rect(ctx, 50, 52, 20, 12, 0x0a1720); rect(ctx, 46, 60, 12, 16, 0x0a1720); rect(ctx, 46, 82, 12, 10, 0x0a1720);
        rect(ctx, 46, 38, 20, 4, detail); rect(ctx, 66, 42, 4, 12, detail);
        rect(ctx, 54, 56, 12, 4, detail); rect(ctx, 50, 62, 4, 12, detail); rect(ctx, 50, 84, 4, 6, detail);
        return;
      }
      const muted = state === 'locked';
      const iconOutline = 0x07121c;
      const boneDark = muted ? rimDark : PixelPalette.boneShade;
      const boneMain = muted ? detail : PixelPalette.bone;
      const boneLight = muted ? rimLight : PixelPalette.boneLight;
      if (branch === 'nutrition') {
        [[34, 72], [38, 68], [42, 64], [46, 60], [50, 56], [54, 52], [58, 48], [62, 44], [66, 40]].forEach(([x, y]) => rect(ctx, x, y, 12, 12, iconOutline));
        [[30, 68], [34, 76], [70, 34], [76, 40]].forEach(([x, y]) => rect(ctx, x, y, 12, 12, iconOutline));
        [[38, 70], [42, 66], [46, 62], [50, 58], [54, 54], [58, 50], [62, 46], [66, 42]].forEach(([x, y]) => rect(ctx, x, y, 8, 8, boneMain));
        [[32, 70], [36, 78], [70, 36], [78, 42]].forEach(([x, y]) => rect(ctx, x, y, 8, 8, boneMain));
        rect(ctx, 66, 40, 8, 4, boneLight);
      } else if (branch === 'production') {
        rect(ctx, 50, 32, 16, 56, iconOutline); rect(ctx, 30, 52, 56, 16, iconOutline);
        rect(ctx, 54, 36, 8, 48, detail); rect(ctx, 34, 56, 48, 8, detail);
      } else if (branch === 'extraPile') {
        rect(ctx, 26, 70, 64, 12, iconOutline); rect(ctx, 34, 58, 48, 16, iconOutline);
        rect(ctx, 42, 40, 32, 26, iconOutline); rect(ctx, 38, 46, 40, 14, iconOutline);
        rect(ctx, 30, 72, 56, 6, boneDark); rect(ctx, 38, 60, 40, 10, boneMain);
        rect(ctx, 46, 42, 24, 20, boneMain); rect(ctx, 42, 48, 32, 10, boneMain);
        rect(ctx, 48, 50, 6, 6, iconOutline); rect(ctx, 64, 50, 6, 6, iconOutline); rect(ctx, 56, 58, 8, 4, iconOutline);
        rect(ctx, 48, 42, 12, 4, boneLight);
      } else if (branch === 'largeBone') {
        rect(ctx, 24, 58, 20, 20, iconOutline); rect(ctx, 68, 34, 20, 20, iconOutline);
        [[38, 62], [46, 54], [54, 46], [62, 38]].forEach(([x, y]) => rect(ctx, x, y, 20, 20, iconOutline));
        rect(ctx, 28, 62, 14, 12, boneMain); rect(ctx, 72, 38, 12, 12, boneMain);
        [[42, 62], [50, 54], [58, 46], [66, 38]].forEach(([x, y]) => rect(ctx, x, y, 12, 12, boneMain));
        rect(ctx, 68, 40, 10, 4, boneLight);
      } else if (branch === 'betterBone') {
        rect(ctx, 26, 62, 18, 18, iconOutline); rect(ctx, 70, 34, 18, 18, iconOutline);
        [[38, 62], [46, 54], [54, 46], [62, 38]].forEach(([x, y]) => rect(ctx, x, y, 18, 18, iconOutline));
        [[30, 66], [42, 64], [50, 56], [58, 48], [66, 40], [74, 38]].forEach(([x, y]) => rect(ctx, x, y, 10, 10, boneMain));
        rect(ctx, 74, 36, 8, 4, boneLight); rect(ctx, 84, 26, 4, 14, detail); rect(ctx, 78, 32, 16, 4, detail);
      } else if (branch === 'dye') {
        const dyeBase = muted ? detail : 0x8d72d8;
        const dyeLight = muted ? rimLight : 0xd2b7ff;
        rect(ctx, 48, 30, 20, 12, iconOutline); rect(ctx, 42, 42, 32, 42, iconOutline);
        rect(ctx, 46, 46, 24, 34, dyeBase); rect(ctx, 50, 34, 16, 10, dyeBase);
        rect(ctx, 50, 48, 8, 20, dyeLight); rect(ctx, 58, 72, 8, 6, 0x6545a8);
      } else if (branch === 'bonusProduction') {
        rect(ctx, 24, 62, 40, 16, iconOutline); rect(ctx, 48, 38, 40, 16, iconOutline);
        rect(ctx, 28, 66, 32, 8, boneMain); rect(ctx, 52, 42, 32, 8, boneMain);
        rect(ctx, 74, 58, 8, 26, iconOutline); rect(ctx, 66, 66, 24, 8, iconOutline);
        rect(ctx, 76, 60, 4, 22, detail); rect(ctx, 68, 68, 20, 4, detail);
      } else if (branch === 'boneSearch') {
        rect(ctx, 50, 28, 16, 52, iconOutline); rect(ctx, 36, 70, 36, 16, iconOutline);
        rect(ctx, 54, 32, 8, 42, boneMain); rect(ctx, 42, 74, 24, 8, boneMain);
        rect(ctx, 68, 34, 22, 8, iconOutline); rect(ctx, 82, 30, 10, 16, detail);
      } else if (branch === 'fusedPile') {
        rect(ctx, 20, 68, 76, 16, iconOutline); rect(ctx, 28, 54, 60, 18, iconOutline); rect(ctx, 40, 38, 36, 20, iconOutline);
        rect(ctx, 24, 72, 68, 8, boneDark); rect(ctx, 32, 58, 52, 10, boneMain); rect(ctx, 44, 42, 28, 14, boneMain);
        rect(ctx, 48, 44, 14, 4, boneLight);
      } else {
        rect(ctx, 44, 36, 28, 12, iconOutline); rect(ctx, 36, 46, 44, 38, iconOutline); rect(ctx, 44, 82, 28, 8, iconOutline);
        rect(ctx, 48, 40, 20, 8, detail); rect(ctx, 40, 50, 36, 30, detail); rect(ctx, 48, 80, 20, 6, rimDark);
        rect(ctx, 44, 52, 8, 12, PixelPalette.white, muted ? 0.3 : 0.76);
      }
      }
    });
  },
  tierBadge(scene, tier, state = 'locked') {
    const colors = state === 'owned' ? [0x23483e, 0xc6efcc] : state === 'available' ? [0x6c512d, 0xffe6a0] : [0x31454b, 0xc1d0cc];
    return imageFrom(scene, textureKey('skill-tier-v2', [tier, state]), 28, 20, (ctx) => {
      rect(ctx, 4, 0, 20, 4, colors[0]); rect(ctx, 0, 4, 28, 12, colors[0]); rect(ctx, 4, 16, 20, 4, colors[0]);
      rect(ctx, 4, 4, 20, 8, colors[1], 0.2);
    });
  },
  treeBackdrop(scene, width, height) {
    return PixelUI.treePanel(scene, 0, 0, width, height);
    /* Legacy runtime-painted backdrop is unreachable after asset migration. */
    return imageFrom(scene, textureKey('tree-backdrop-v4', [width, height]), width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, 0x07111b);
      rect(ctx, 4, 4, width - 8, height - 8, 0x284957);
      rect(ctx, 8, 8, width - 16, height - 16, 0x0a1723);
      rect(ctx, 12, 12, width - 24, height - 24, 0x102130);
      rect(ctx, 16, 16, width - 32, height - 32, 0x0c1925);
      rect(ctx, 20, 20, width - 40, 4, 0x4b7580, 0.42);
      rect(ctx, 20, height - 24, width - 40, 4, 0x203f4e, 0.62);
      for (let y = 28; y < height - 28; y += 8) {
        const alpha = 0.018 + (y / height) * 0.025;
        rect(ctx, 24, y, width - 48, 4, y % 16 === 0 ? 0x173044 : 0x0a1520, alpha);
      }
      for (let x = 88; x < width - 60; x += 148) rect(ctx, x, 112, 2, height - 214, 0x4d8290, 0.075);
      for (let y = 170; y < height - 72; y += 116) rect(ctx, 58, y, width - 116, 2, 0x4d8290, 0.065);
      const cx = Math.round(width / 2);
      const cy = Math.round(height / 2 + 34);
      [184, 116].forEach((radius, index) => {
        const color = index === 0 ? 0x315866 : 0x3d6d75;
        for (let step = 0; step <= radius; step += 4) {
          const offset = radius - step;
          [[cx + step, cy + offset], [cx - step, cy + offset], [cx + step, cy - offset], [cx - step, cy - offset]]
            .forEach(([x, y]) => rect(ctx, x - 2, y - 2, 4, 4, color, index === 0 ? 0.085 : 0.07));
        }
      });
      rect(ctx, cx - 4, cy - 20, 8, 40, 0x3d6d75, 0.09); rect(ctx, cx - 20, cy - 4, 40, 8, 0x3d6d75, 0.09);
      [42, width - 74].forEach((x) => {
        rect(ctx, x, 166, 32, 196, 0x102635, 0.66); rect(ctx, x + 4, 170, 24, 150, 0x173142, 0.52);
        rect(ctx, x + 8, 188, 16, 4, 0x42697a, 0.22); rect(ctx, x + 14, 190, 4, 64, 0x42697a, 0.18);
        rect(ctx, x + 8, 320, 16, 8, 0x173142); rect(ctx, x + 12, 328, 8, 16, 0x173142);
      });
      [[0, 0], [width - 28, 0], [0, height - 28], [width - 28, height - 28]].forEach(([x, y]) => {
        rect(ctx, x, y, 28, 8, 0x315a68); rect(ctx, x, y, 8, 28, 0x315a68);
        rect(ctx, x + 8, y + 8, 8, 8, 0x77a3a5, 0.38);
      });
    });
  },
  treeHeader(scene, width = 1024, height = 88) {
    return PixelUI.treePanel(scene, 0, 0, width, height);
    /* Legacy runtime-painted header is unreachable after asset migration. */
    return imageFrom(scene, textureKey('tree-header-v4', [width, height]), width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, 0x0c1925);
      rect(ctx, 0, height - 4, width, 4, 0x315664, 0.72);
      rect(ctx, 148, 43, 258, 2, 0x4f7780, 0.3); rect(ctx, width - 406, 43, 258, 2, 0x4f7780, 0.3);
      [[414, 43], [width - 414, 43]].forEach(([x, y]) => {
        rect(ctx, x - 4, y - 4, 8, 8, 0x355864); rect(ctx, x - 2, y - 6, 4, 12, 0x6b9290, 0.52);
      });
    });
  },
  treeCover(scene, width, height) {
    return imageFrom(scene, textureKey('tree-cover-v1', [width, height]), width, height, (ctx) => rect(ctx, 0, 0, width, height, 0x0c1925));
  },
  treeFooter(scene, width = 1024, height = 96) {
    return PixelUI.treePanel(scene, 0, 0, width, height);
    /* Legacy runtime-painted footer is unreachable after asset migration. */
    return imageFrom(scene, textureKey('tree-footer-v1', [width, height]), width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, 0x0c1925);
      rect(ctx, 0, 0, width, 4, 0x284958, 0.82);
      rect(ctx, 120, 8, width - 240, 2, 0x4d7880, 0.18);
      rect(ctx, 16, height - 8, width - 32, 4, 0x07111b, 0.5);
    });
  },
  resourceBadge(scene, width = 128) {
    return imageFrom(scene, textureKey('tree-resource-v5', [width]), width, 44, (ctx) => {
      rect(ctx, 8, 0, width - 16, 4, 0x355965); rect(ctx, 4, 4, width - 8, 36, 0x355965); rect(ctx, 8, 40, width - 16, 4, 0x18323d);
      rect(ctx, 10, 6, width - 20, 30, 0x0b1d2a); rect(ctx, 14, 8, width - 28, 2, 0x759698, 0.24);
      rect(ctx, 20, 8, 12, 4, 0x8d5a2b); rect(ctx, 16, 12, 20, 4, 0xb87832);
      rect(ctx, 12, 16, 28, 12, 0xc98b38); rect(ctx, 16, 28, 20, 4, 0x8d5a2b);
      rect(ctx, 20, 12, 12, 16, 0xf0bd50); rect(ctx, 20, 12, 8, 8, 0xffdf7e);
    });
  },
  soulCrystal(scene, size = 48) {
    return fitAsset(scene, 'tree-soul-crystal-v1', size, size);
  },
  treeButton(scene, width = 224, height = 40, variant = 'dialog') {
    if (variant === 'complete') {
      return fitAsset(scene, 'tree-complete-button-v5', width, height);
    }
    return fitAsset(scene, 'tree-dialog-button', width, height);
    /* Legacy runtime-painted button is unreachable after asset migration. */
    return imageFrom(scene, textureKey('tree-button-v3', [width, height]), width, height, (ctx) => {
      rect(ctx, 12, 0, width - 24, 4, 0x8bd4a5); rect(ctx, 4, 8, width - 8, height - 16, 0x8bd4a5); rect(ctx, 12, height - 4, width - 24, 4, 0x396d5f);
      rect(ctx, 8, 8, width - 16, height - 16, 0x173f38); rect(ctx, 14, 12, width - 28, 4, 0xa8e4b6, 0.28);
      rect(ctx, 20, height - 12, width - 40, 4, 0x0b2727, 0.62);
      rect(ctx, 22, height / 2 - 2, 4, 4, 0x83caa0); rect(ctx, width - 26, height / 2 - 2, 4, 4, 0x83caa0);
    });
  },
  zoomButton(scene, label = '+') {
    return imageFrom(scene, textureKey('tree-zoom-v1', [label]), 36, 32, (ctx) => {
      rect(ctx, 4, 0, 28, 4, 0x365966); rect(ctx, 0, 4, 36, 24, 0x365966); rect(ctx, 4, 28, 28, 4, 0x18323e);
      rect(ctx, 4, 4, 28, 24, 0x102632); rect(ctx, 8, 8, 20, 4, 0x6d9898, 0.3);
      rect(ctx, 10, 14, 16, 4, 0xc1ddd6);
      if (label === '+') rect(ctx, 16, 8, 4, 16, 0xc1ddd6);
    });
  },
  junction(scene) {
    return imageFrom(scene, 'tree-junction-v1', 12, 12, (ctx) => {
      rect(ctx, 0, 0, 12, 12, 0x183038); rect(ctx, 2, 2, 8, 8, 0x7bc4aa); rect(ctx, 4, 4, 4, 4, 0xb7e5ca);
    });
  },
  timeline(scene, width = 808) {
    return imageFrom(scene, `timeline-track-${width}-v3`, width, 12, (ctx) => {
      rect(ctx, 0, 0, width, 12, PixelPalette.void); rect(ctx, 4, 4, width - 8, 4, 0x294148); for (let x = 24; x < width - 16; x += 36) rect(ctx, x, 4, 4, 4, PixelPalette.edge, 0.68);
    });
  },
  timelineIcon(scene, type = 'slime') {
    return fitAsset(scene, `scene-timeline-${type}`, 26, 26);

    /* Legacy runtime-painted timeline icon retained temporarily during asset migration. */
    return imageFrom(scene, `timeline-icon-${type}-v4`, 16, 16, (ctx) => {
      if (type === 'slime') {
        rect(ctx, 2, 5, 12, 8, 0x55c8ee); rect(ctx, 4, 3, 8, 10, 0x8ce4f3); rect(ctx, 4, 8, 3, 3, 0x12245f); rect(ctx, 10, 8, 3, 3, 0x12245f); rect(ctx, 4, 4, 4, 2, 0xe7ffff);
      } else {
        rect(ctx, 2, 4, 12, 10, 0x4a332e); rect(ctx, 4, 2, 8, 4, 0x8c9aa0); rect(ctx, 5, 7, 7, 5, PixelPalette.skin); rect(ctx, 12, 2, 2, 13, PixelPalette.wood); rect(ctx, 9, 2, 6, 2, PixelPalette.gold);
      }
    });
  },
  timelineActive(scene) {
    return fitAsset(scene, 'scene-timeline-active', 38, 38);
  },
  sword(scene) {
    return imageFrom(scene, 'timeline-sword-v3', 20, 28, (ctx) => {
      rect(ctx, 8, 0, 4, 18, PixelPalette.boneLight); rect(ctx, 4, 4, 12, 4, PixelPalette.boneLight); rect(ctx, 6, 18, 8, 4, PixelPalette.wood); rect(ctx, 8, 22, 4, 6, PixelPalette.wood);
    });
  },
  link(scene, x, y, height, color = PixelPalette.edge) {
    const key = textureKey('ui-link-v1', [height, color]);
    return imageFrom(scene, key, 4, height, (ctx) => rect(ctx, 0, 0, 4, height, color, 0.72)).setPosition(x, y);
  },
  connector(scene, points, color = PixelPalette.edge) {
    const root = scene.add.container(0, 0);
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const vertical = start.x === end.x;
      const length = (vertical ? Math.abs(end.y - start.y) : Math.abs(end.x - start.x)) + 1;
      const width = vertical ? 6 : length;
      const height = vertical ? length : 6;
      const key = textureKey('ui-connector-segment-v6', [vertical, length, color]);
      const segment = imageFrom(scene, key, width, height, (ctx) => {
        rect(ctx, 0, 0, width, height, 0x1b2d33);
        if (vertical) { rect(ctx, 1, 0, 4, height, color, 0.9); rect(ctx, 2, 0, 1, height, 0xb4dfcc, 0.35); }
        else { rect(ctx, 0, 1, width, 4, color, 0.9); rect(ctx, 0, 2, width, 1, 0xb4dfcc, 0.35); }
      }).setOrigin(0, 0).setPosition(
        vertical ? start.x - 2 : Math.min(start.x, end.x),
        vertical ? Math.min(start.y, end.y) : start.y - 2,
      );
      root.add(segment);
    }
    return root;
  },
  veil(scene, width, height, alpha = 0.88) {
    return imageFrom(scene, `pixel-veil-${width}x${height}-v1`, width, height, (ctx) => rect(ctx, 0, 0, width, height, PixelPalette.void)).setAlpha(alpha);
  },
});

export const PixelEffects = Object.freeze({
  particle(scene, color, size = 4) {
    return imageFrom(scene, textureKey('pixel-particle-v2', [color, size]), size, size, (ctx) => rect(ctx, 0, 0, size, size, color));
  },
  boneChip(scene, variant = 0) {
    const key = `bone-chip-v2-${variant}`;
    return imageFrom(scene, key, 20, 20, (ctx) => {
      const bone = variant === 0 ? [[4, 8], [8, 8], [12, 8]] : variant === 1 ? [[4, 12], [8, 8], [12, 4]] : [[4, 4], [8, 8], [12, 12]];
      bone.forEach(([x, y]) => rect(ctx, x, y, 4, 4, PixelPalette.boneShade));
      bone.forEach(([x, y]) => rect(ctx, x + 1, y + 1, 2, 2, PixelPalette.boneLight));
      rect(ctx, bone[0][0] - 2, bone[0][1], 4, 4, PixelPalette.bone);
      rect(ctx, bone.at(-1)[0] + 2, bone.at(-1)[1], 4, 4, PixelPalette.bone);
    });
  },
  attack(scene, actor = 'slime', direction = 1) {
    return fitAsset(scene, actor === 'slime' ? 'effect-slime-impact' : 'effect-weapon-slash', 108, 72)
      // The slime wave faces left in-source; the weapon slash faces right.
      .setFlipX(actor === 'slime' ? direction > 0 : direction < 0);

    /* Legacy runtime-painted impact retained temporarily during asset migration. */
    const key = `battle-attack-v3-${actor}`;
    return imageFrom(scene, key, 64, 40, (ctx) => {
      if (actor === 'slime') {
        rect(ctx, 8, 18, 16, 8, 0x85e9d8); rect(ctx, 20, 14, 20, 12, 0x52bfe1); rect(ctx, 36, 10, 16, 8, 0x9bf3df);
        rect(ctx, 16, 26, 12, 4, 0x2e79b8); rect(ctx, 44, 18, 8, 4, 0xd8fff0);
      } else {
        rect(ctx, 12, 8, 4, 24, PixelPalette.boneLight); rect(ctx, 16, 12, 4, 20, PixelPalette.gold);
        rect(ctx, 20, 16, 4, 16, PixelPalette.boneLight); rect(ctx, 24, 20, 4, 12, PixelPalette.gold);
        rect(ctx, 8, 28, 24, 4, PixelPalette.wood); rect(ctx, 4, 24, 8, 4, PixelPalette.gold);
      }
    }).setScale(direction, 1);
  },
  encounterCurtain(scene, side, width, height) {
    return imageFrom(scene, `encounter-curtain-${side}-${width}x${height}-v2`, width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, side === 'left' ? 0x111c28 : 0x17212d);
      for (let y = 80; y < height; y += 96) { const offset = side === 'left' ? y / 8 : -y / 8; rect(ctx, Math.max(0, offset), y, width - Math.abs(offset), 20, 0x6c3940, 0.72); }
    });
  },
  encounterCrest(scene) {
    return fitAsset(scene, 'scene-encounter-crest', 184, 184);
  },
});

export const pixelPanel = (...args) => PixelUI.panel(...args);
export const makeItemSprite = (...args) => ItemSprites.create(...args);
export const makeAdventurerSprite = (...args) => EnemySprites.create(...args);
