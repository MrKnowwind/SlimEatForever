import * as Phaser from 'phaser';

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
  const key = `battle-room-${width}x${height}-v5`;
  return imageFrom(scene, key, width, height, (ctx) => {
    rect(ctx, 0, 0, width, height, PixelPalette.void);
    rect(ctx, 0, 96, width, 378, PixelPalette.cave);
    [[72, 126, 1], [214, 158, 4], [376, 118, 0], [704, 146, 2], [872, 120, 3], [1030, 178, 4], [118, 286, 2], [310, 328, 4], [786, 306, 1], [990, 344, 0]].forEach(([x, y, variant]) => paintTile(ctx, x, y, wallTiles[variant], true));
    rect(ctx, 0, 474, width, height - 474, PixelPalette.floor);
    [[48, 500, 0], [240, 516, 2], [432, 496, 1], [648, 514, 3], [846, 500, 0], [1020, 518, 1], [140, 608, 3], [374, 596, 0], [620, 616, 2], [884, 598, 1]].forEach(([x, y, variant]) => paintFloorTile(ctx, x, y, floorTiles[variant]));
  }).setOrigin(0);
}

export const DungeonProps = Object.freeze({
  bonePile(scene, direction = 1) {
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
  },
  groundPatch(scene, side = 'slime') {
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
    const key = `item-${type}-v6`;
    const image = imageFrom(scene, key, 56, 56, (ctx) => {
      if (type === 'adventurer') {
        rect(ctx, 12, 22, 28, 24, PixelPalette.ink); rect(ctx, 16, 24, 20, 16, PixelPalette.cloth);
        rect(ctx, 20, 10, 16, 16, PixelPalette.skin); rect(ctx, 18, 6, 20, 8, 0x4a332e);
        rect(ctx, 41, 10, 4, 36, PixelPalette.ink); rect(ctx, 45, 8, 4, 34, PixelPalette.wood);
        rect(ctx, 16, 29, 12, 4, PixelPalette.gold);
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

export const PixelUI = Object.freeze({
  panel(scene, x, y, width, height, edge = PixelPalette.edge, fillColor = PixelPalette.ink, alpha = 0.96) {
    const key = textureKey('ui-panel-v4', [width, height, edge, fillColor]);
    return imageFrom(scene, key, width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, edge); rect(ctx, PixelMetrics.UI_BORDER, PixelMetrics.UI_BORDER, width - 8, height - 8, fillColor, alpha); rect(ctx, 12, 8, width - 24, 4, PixelPalette.white, 0.07);
    }).setPosition(x, y);
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
    const stateColors = {
      owned: [0x1d3934, 0x7fc89a, 0x16302e, 0xd4f4cf],
      ready: [0x5b4428, 0xe5ba5c, 0x29271f, 0xffedb1],
      locked: [0x273b43, 0x6f858a, 0x18282f, 0xa4b8b5],
    };
    const [rimDark, rimLight, fill, detail] = stateColors[state] || stateColors.locked;
    const key = textureKey('skill-node-v9', [branch, state, question]);
    return imageFrom(scene, key, 96, 96, (ctx) => {
      const outer = [16, 32, 48, 64, 72, 80, 80, 80, 80, 80, 80, 80, 80, 72, 64, 48, 32, 16];
      outer.forEach((width, row) => rect(ctx, (96 - width) / 2, row * 4 + 12, width, 4, rimDark));
      outer.slice(0, 9).forEach((width, row) => rect(ctx, (96 - width) / 2, row * 4 + 12, width, 2, rimLight));
      const inner = [16, 32, 48, 56, 64, 64, 64, 64, 64, 64, 64, 64, 56, 48, 32, 16];
      inner.forEach((width, row) => rect(ctx, (96 - width) / 2, row * 4 + 16, width, 4, fill));
      rect(ctx, 36, 76, 24, 4, rimDark, 0.75);
      if (question) {
        [[38, 32, 20, 4], [54, 36, 8, 14], [46, 46, 16, 8], [42, 52, 8, 12], [42, 66, 10, 8]].forEach(([x, y, w, h]) => rect(ctx, x, y, w, h, rimDark));
        [[40, 34, 16, 2], [56, 38, 4, 10], [48, 48, 10, 2], [44, 54, 4, 8], [44, 68, 6, 4]].forEach(([x, y, w, h]) => rect(ctx, x, y, w, h, detail));
        return;
      }
      const muted = state === 'locked';
      const iconOutline = 0x101b24;
      const boneDark = muted ? rimDark : PixelPalette.boneShade;
      const boneMain = muted ? detail : PixelPalette.bone;
      const boneLight = muted ? rimLight : PixelPalette.boneLight;
      if (branch === 'nutrition') {
        [[32, 54], [36, 50], [40, 46], [44, 42], [48, 38]].forEach(([x, y]) => rect(ctx, x, y, 8, 8, iconOutline));
        rect(ctx, 28, 54, 12, 14, iconOutline); rect(ctx, 50, 34, 14, 12, iconOutline);
        [[34, 56], [38, 52], [42, 48], [46, 44], [50, 40]].forEach(([x, y]) => rect(ctx, x, y, 4, 4, boneMain));
        rect(ctx, 30, 56, 8, 10, boneMain); rect(ctx, 52, 36, 10, 8, boneMain);
        rect(ctx, 52, 36, 6, 2, boneLight);
      } else if (branch === 'production') {
        rect(ctx, 44, 34, 8, 28, iconOutline); rect(ctx, 32, 42, 32, 10, iconOutline);
        rect(ctx, 46, 36, 4, 24, detail); rect(ctx, 34, 44, 28, 4, detail);
        rect(ctx, 38, 44, 8, 2, rimLight, 0.72);
      } else if (branch === 'extraPile') {
        [[28, 62], [32, 58], [36, 54], [40, 50]].forEach(([x, y]) => rect(ctx, x, y, 8, 8, iconOutline));
        [[56, 50], [60, 54], [64, 58], [68, 62]].forEach(([x, y]) => rect(ctx, x, y, 8, 8, iconOutline));
        [[30, 62], [34, 58], [38, 54], [42, 50], [58, 50], [62, 54], [66, 58], [70, 62]].forEach(([x, y]) => rect(ctx, x, y, 4, 4, boneMain));
        rect(ctx, 40, 42, 16, 20, iconOutline); rect(ctx, 36, 46, 24, 12, iconOutline); rect(ctx, 44, 60, 8, 4, iconOutline);
        rect(ctx, 42, 44, 12, 16, boneMain); rect(ctx, 38, 48, 20, 8, boneMain); rect(ctx, 46, 60, 4, 2, boneDark);
        rect(ctx, 42, 50, 4, 4, iconOutline); rect(ctx, 52, 50, 4, 4, iconOutline); rect(ctx, 42, 44, 6, 2, boneLight);
      } else if (branch === 'largeBone') {
        rect(ctx, 24, 46, 16, 12, iconOutline); rect(ctx, 56, 34, 16, 12, iconOutline);
        rect(ctx, 32, 42, 32, 20, iconOutline); rect(ctx, 38, 36, 20, 32, iconOutline);
        rect(ctx, 28, 48, 12, 8, boneMain); rect(ctx, 56, 36, 12, 8, boneMain);
        rect(ctx, 38, 42, 20, 20, boneMain); rect(ctx, 42, 38, 12, 28, boneMain);
        rect(ctx, 42, 40, 8, 4, boneLight); rect(ctx, 34, 48, 8, 4, boneLight);
      } else if (branch === 'betterBone') {
        rect(ctx, 28, 48, 12, 12, iconOutline); rect(ctx, 56, 36, 12, 12, iconOutline);
        rect(ctx, 36, 44, 28, 20, iconOutline); rect(ctx, 42, 38, 16, 32, iconOutline);
        rect(ctx, 30, 50, 8, 8, boneMain); rect(ctx, 58, 38, 8, 8, boneMain);
        rect(ctx, 38, 46, 24, 16, boneMain); rect(ctx, 44, 40, 12, 28, boneMain);
        rect(ctx, 44, 42, 8, 4, boneLight); rect(ctx, 62, 30, 4, 12, detail); rect(ctx, 58, 34, 12, 4, detail);
      } else if (branch === 'dye') {
        const dyeBase = muted ? detail : 0x8d72d8;
        const dyeLight = muted ? rimLight : 0xd2b7ff;
        rect(ctx, 42, 34, 12, 8, iconOutline); rect(ctx, 38, 42, 20, 24, iconOutline);
        rect(ctx, 42, 38, 12, 6, dyeBase); rect(ctx, 40, 44, 16, 18, dyeBase); rect(ctx, 44, 62, 8, 4, dyeBase);
        rect(ctx, 42, 40, 8, 4, dyeLight); rect(ctx, 52, 48, 4, 8, detail);
      } else if (branch === 'bonusProduction') {
        rect(ctx, 28, 52, 20, 12, iconOutline); rect(ctx, 50, 40, 20, 12, iconOutline);
        rect(ctx, 32, 54, 16, 8, boneMain); rect(ctx, 54, 42, 16, 8, boneMain);
        rect(ctx, 44, 46, 20, 8, iconOutline); rect(ctx, 48, 44, 12, 12, iconOutline);
        rect(ctx, 50, 46, 8, 8, detail); rect(ctx, 64, 30, 4, 16, detail); rect(ctx, 58, 36, 16, 4, detail);
      } else if (branch === 'boneSearch') {
        rect(ctx, 44, 34, 8, 40, iconOutline); rect(ctx, 36, 66, 24, 8, iconOutline);
        rect(ctx, 46, 36, 4, 34, boneMain); rect(ctx, 40, 68, 16, 4, boneMain);
        rect(ctx, 58, 40, 16, 4, iconOutline); rect(ctx, 66, 36, 8, 12, detail);
      } else if (branch === 'fusedPile') {
        rect(ctx, 24, 54, 48, 14, iconOutline); rect(ctx, 32, 44, 36, 14, iconOutline);
        rect(ctx, 40, 34, 20, 16, iconOutline); rect(ctx, 28, 56, 40, 10, boneMain);
        rect(ctx, 36, 46, 28, 10, boneMain); rect(ctx, 44, 36, 12, 12, boneMain);
        rect(ctx, 34, 54, 12, 4, boneLight); rect(ctx, 56, 44, 8, 4, boneLight);
      } else {
        rect(ctx, 42, 36, 12, 8, iconOutline); rect(ctx, 36, 44, 24, 20, iconOutline); rect(ctx, 42, 64, 12, 4, iconOutline);
        rect(ctx, 44, 38, 8, 6, detail); rect(ctx, 38, 46, 20, 16, detail); rect(ctx, 44, 62, 8, 4, rimDark);
        rect(ctx, 40, 48, 6, 6, PixelPalette.white, muted ? 0.35 : 0.78);
      }
      if (state === 'owned') { rect(ctx, 64, 67, 8, 4, detail); rect(ctx, 68, 63, 4, 4, detail); }
    });
  },
  tierBadge(scene, tier, state = 'locked') {
    const colors = state === 'owned' ? [0x23483e, 0xc6efcc] : state === 'ready' ? [0x6c512d, 0xffe6a0] : [0x31454b, 0xc1d0cc];
    return imageFrom(scene, textureKey('skill-tier-v2', [tier, state]), 28, 20, (ctx) => {
      rect(ctx, 4, 0, 20, 4, colors[0]); rect(ctx, 0, 4, 28, 12, colors[0]); rect(ctx, 4, 16, 20, 4, colors[0]);
      rect(ctx, 4, 4, 20, 8, colors[1], 0.2);
    });
  },
  treeBackdrop(scene, width, height) {
    return imageFrom(scene, textureKey('tree-backdrop-v1', [width, height]), width, height, (ctx) => {
      rect(ctx, 0, 0, width, height, 0x101a24);
      for (let x = 88; x < width; x += 176) rect(ctx, x, 76, 2, height - 148, 0x52706d, 0.08);
      for (let y = 156; y < height - 72; y += 128) rect(ctx, 72, y, width - 144, 2, 0x52706d, 0.06);
      [[126, 180], [916, 164], [944, 470], [188, 500]].forEach(([x, y]) => { rect(ctx, x, y, 4, 4, 0x81aa9a, 0.12); rect(ctx, x + 8, y, 4, 4, 0x81aa9a, 0.06); });
    });
  },
  resourceBadge(scene, width = 128) {
    return imageFrom(scene, textureKey('tree-resource-v1', [width]), width, 36, (ctx) => {
      rect(ctx, 8, 0, width - 16, 4, 0x405b5e); rect(ctx, 4, 4, width - 8, 28, 0x405b5e); rect(ctx, 8, 32, width - 16, 4, 0x405b5e);
      rect(ctx, 10, 6, width - 20, 24, 0x162631); rect(ctx, 14, 8, width - 28, 2, 0x92b1a7, 0.18);
      rect(ctx, 16, 10, 8, 4, 0xffdf83); rect(ctx, 12, 14, 16, 8, 0xd7a956);
      rect(ctx, 16, 22, 8, 6, 0xb87832); rect(ctx, 16, 14, 8, 8, 0xffef9b);
    });
  },
  treeButton(scene, width = 224, height = 40) {
    return imageFrom(scene, textureKey('tree-button-v1', [width, height]), width, height, (ctx) => {
      rect(ctx, 8, 0, width - 16, 4, 0x739d85); rect(ctx, 4, 4, width - 8, height - 8, 0x739d85); rect(ctx, 8, height - 4, width - 16, 4, 0x739d85);
      rect(ctx, 10, 6, width - 20, height - 12, 0x1e4038); rect(ctx, 14, 9, width - 28, 3, 0xa6d2a9, 0.26);
    });
  },
  timeline(scene, width = 808) {
    return imageFrom(scene, `timeline-track-${width}-v3`, width, 12, (ctx) => {
      rect(ctx, 0, 0, width, 12, PixelPalette.void); rect(ctx, 4, 4, width - 8, 4, 0x294148); for (let x = 24; x < width - 16; x += 36) rect(ctx, x, 4, 4, 4, PixelPalette.edge, 0.68);
    });
  },
  timelineIcon(scene, type = 'slime') {
    return imageFrom(scene, `timeline-icon-${type}-v4`, 16, 16, (ctx) => {
      if (type === 'slime') {
        rect(ctx, 2, 5, 12, 8, 0x55c8ee); rect(ctx, 4, 3, 8, 10, 0x8ce4f3); rect(ctx, 4, 8, 3, 3, 0x12245f); rect(ctx, 10, 8, 3, 3, 0x12245f); rect(ctx, 4, 4, 4, 2, 0xe7ffff);
      } else {
        rect(ctx, 2, 4, 12, 10, 0x4a332e); rect(ctx, 4, 2, 8, 4, 0x8c9aa0); rect(ctx, 5, 7, 7, 5, PixelPalette.skin); rect(ctx, 12, 2, 2, 13, PixelPalette.wood); rect(ctx, 9, 2, 6, 2, PixelPalette.gold);
      }
    });
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
      const length = (vertical ? Math.abs(end.y - start.y) : Math.abs(end.x - start.x)) + 2;
      const width = vertical ? 6 : length;
      const height = vertical ? length : 6;
      const key = textureKey('ui-connector-segment-v3', [vertical, length, color]);
      const segment = imageFrom(scene, key, width, height, (ctx) => {
        rect(ctx, 0, 0, width, height, 0x1b2d33);
        if (vertical) rect(ctx, 2, 0, 2, height, color, 0.92);
        else rect(ctx, 0, 2, width, 2, color, 0.92);
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
});

export const pixelPanel = (...args) => PixelUI.panel(...args);
export const makeItemSprite = (...args) => ItemSprites.create(...args);
export const makeAdventurerSprite = (...args) => EnemySprites.create(...args);
