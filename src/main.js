import * as Phaser from 'phaser';
import {
  ARENA, FOOD, HEIGHT, WIDTH, UPGRADE_NODES, calculateGrowth, canConsume, chooseBoneSpawnPoint,
  emptyMeta, formatNumber, getBattleBoneBonus, getBonusProductionChance, getBoneSearchCooldown, getBoneSpawnInterval, getBoneValue, getEvolutionMassCap, getLargeBoneChance, getSlimeStage,
  getBattlePlan, getBattleRacers, getMagnetRadius, getUpgradeNodeState,
  getWaveConfig, soulReward,
} from './gameLogic.js';
import {
  DungeonProps, PixelEffects, PixelPalette, PixelUI,
  createDungeon, makeBattleBackdrop, makeItemSprite, makeAdventurerSprite, pixelPanel,
} from './pixelArt.js';

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

class SlimeDungeonScene extends Phaser.Scene {
  constructor() { super('slime-dungeon'); }

  create() {
    this.meta = this.loadMeta();
    this.mass = 0;
    this.coins = 0;
    this.itemsFed = 0;
    this.boneValueBonus = 0;
    this.wave = 1;
    this.bones = [];
    this.bonePiles = [];
    this.drag = null;
    this.isEnded = false;
    this.inBattle = false;
    this.nextBoneAt = this.time.now + getBoneSpawnInterval(this.mass, this.meta);
    this.nextWaveAt = this.time.now + getWaveConfig(this.wave).duration * 1000;
    this.battleSpeed = 1;

    this.drawCave();
    this.createAmbient();
    this.createHud();
    this.createSlime();
    this.createBonePiles();
    this.createInput();
    this.spawnInitialBones();
    this.updateHud();
  }

  loadMeta() {
    try {
      return { ...emptyMeta(), ...JSON.parse(localStorage.getItem('slime-dungeon-meta') || '{}') };
    } catch { return emptyMeta(); }
  }

  saveMeta() { localStorage.setItem('slime-dungeon-meta', JSON.stringify(this.meta)); }

  drawCave() { this.dungeonArt = createDungeon(this, WIDTH, HEIGHT); }

  createAmbient() {
    this.motes = [];
    for (let i = 0; i < 6; i += 1) {
      const mote = PixelEffects.particle(this, i % 3 === 0 ? 0xe5c987 : 0x90c9a7, 4)
        .setPosition(118 + (i * 173) % 890, 218 + (i * 97) % 310).setAlpha(i % 3 === 0 ? 0.18 : 0.1).setDepth(4);
      this.motes.push(mote);
      this.tweens.add({ targets: mote, y: mote.y - 12 - (i % 4) * 5, alpha: 0.01, duration: 2900 + i * 110, delay: i * 160, repeat: -1, yoyo: true, ease: 'Sine.inOut' });
    }
  }

  createHud() {
    const hud = this.add.container(0, 0).setDepth(20);
    const plate = pixelPanel(this, 580, 50, 1104, 80, PixelPalette.edge);
    hud.add(plate);
    hud.add(this.add.text(48, 28, '史 莱 姆 地 牢', { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#f5efda', stroke: '#071015', strokeThickness: 3 }));
    hud.add(this.add.text(276, 26, '进 化', { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#8fc9ae' }));
    const evolutionBar = PixelUI.bar(this, 431, 55, 310, 16, PixelPalette.cyan);
    this.evolutionBarBg = evolutionBar.background;
    this.evolutionFill = evolutionBar.fill;
    this.evolutionMaxWidth = evolutionBar.maxWidth;
    this.evolutionFill.setDisplaySize(0, 8);
    hud.add([this.evolutionBarBg, this.evolutionFill]);
    this.timerText = this.add.text(890, 37, '袭击倒计时  25.0s', { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#f4c76b', stroke: '#20150e', strokeThickness: 3 });
    hud.add(this.timerText);
  }

  createSlime() {
    this.slime = this.add.container(580, 447).setDepth(11);
    this.drawSlime();
    this.slimeBob = this.tweens.add({ targets: this.slime, y: 440, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.playSlimeBlink() });
    this.time.addEvent({ delay: 4300, loop: true, callback: () => this.playSlimeWiggle() });
  }

  drawSlime() {
    this.tweens.killTweensOf(this.slimeArt);
    this.slime.list.slice().forEach((child) => child.destroy());
    const isMicroSlime = (this.meta.evolution || 0) === 0;
    const growthScale = 1 + Math.min(isMicroSlime ? 0.3 : 0.8, this.mass / (isMicroSlime ? 660 : 280));
    const scale = growthScale * (isMicroSlime ? 0.62 : 0.8);
    const portrait = isMicroSlime ? this.makeMicroSlimeArt(scale) : this.makeSlimeArt(scale);
    portrait.root.y = isMicroSlime ? 39 : 0;
    this.slime.add(portrait.root);
    this.slimeArt = portrait.root;
    this.slimeEyes = portrait.eyes;
    this.slimeGlints = portrait.glints;
    this.slimeMouth = portrait.mouth;
    // Keep the authored pixel-sprite scale when idle animation updates the
    // body. The old value silently reset the sprite to 1x after each redraw.
    this.slimeBaseScale = { x: scale * 3, y: scale * 3 };
    this.slimeRadius = (isMicroSlime ? 30 : 52) * growthScale;
    this.startSlimeIdle();
  }

  makeSlimeArtTemplate(scale = 1) {
    const pixelTexture = (key, width, height, draw) => {
      if (!this.textures.exists(key)) {
        const canvas = this.textures.createCanvas(key, width, height).getSourceImage();
        draw(canvas.getContext('2d'));
        this.textures.get(key).refresh();
      }
      const texture = this.textures.get(key);
      texture.setFilter?.(Phaser.Textures.FilterMode.NEAREST);
      return texture;
    };
    const logicalPixel = 2;
    const block = (ctx, x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * logicalPixel, y * logicalPixel, logicalPixel, logicalPixel);
    };
    const bodyBlock = (ctx, x, y, color) => block(ctx, x, y + 9, color);
    const shape = [
      [8, 8], [7, 10], [5, 14], [3, 18], [2, 20], [1, 22],
      [1, 22], [0, 23], [0, 23], [0, 24], [0, 24], [0, 24],
      [1, 23], [0, 24], [0, 24], [0, 24], [1, 23], [2, 21],
    ];
    const cells = [];
    shape.forEach(([left, width], y) => {
      for (let x = left; x < left + width; x += 1) cells.push([x + 12, y]);
    });
    const hasCell = (x, y) => cells.some(([cx, cy]) => cx === x && cy === y);
    const dyeColor = this.meta?.dyeColor || 'blue';
    const bodyTexture = pixelTexture(`slime-pixel-template-v12-${dyeColor}`, 96, 72, (ctx) => {
      ctx.imageSmoothingEnabled = false;
      const palette = this.getSlimePalette();
      cells.forEach(([x, y]) => {
        const edge = !hasCell(x - 1, y) || !hasCell(x + 1, y) || !hasCell(x, y - 1) || !hasCell(x, y + 1);
        bodyBlock(ctx, x, y, edge ? palette.outline : palette.base);
      });
      cells.forEach(([x, y]) => {
        if (!hasCell(x, y) || !hasCell(x - 1, y) || !hasCell(x + 1, y) || !hasCell(x, y - 1) || !hasCell(x, y + 1)) return;
        const localX = x - 12;
        const lowerCore = (y === 14 && localX >= 14 && localX <= 16)
          || (y === 15 && localX >= 13 && localX <= 18)
          || (y === 16 && localX >= 11 && localX <= 18)
          || (y === 17 && localX >= 10 && localX <= 16);
        const leftLightLimit = [null, null, 11, 11, 12, 10, 10, 9, 8, 7, 6];
        const isLeftLight = y <= 10 && localX <= leftLightLimit[y];
        const color = lowerCore ? palette.shadow : (isLeftLight ? palette.light : palette.base);
        bodyBlock(ctx, x, y, color);
      });
      [[7, 4], [8, 4], [6, 5], [7, 5], [6, 6]].forEach(([x, y]) => bodyBlock(ctx, x + 12, y, palette.highlight));
    });
    const eyeTexture = pixelTexture('slime-pixel-eye-v7', 12, 16, (ctx) => {
      ctx.fillStyle = '#12245f';
      ctx.fillRect(3, 2, 6, 1); ctx.fillRect(2, 3, 8, 9); ctx.fillRect(3, 12, 6, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 3, 3, 3);
      ctx.fillStyle = '#7de0ee'; ctx.fillRect(7, 9, 2, 3);
    });
    const blushTexture = pixelTexture('slime-pixel-blush-v4', 8, 4, (ctx) => {
      ctx.fillStyle = '#f19ab5'; ctx.fillRect(2, 1, 4, 2);
    });
    const mouthTexture = pixelTexture('slime-pixel-mouth-v5', 8, 6, (ctx) => {
      ctx.fillStyle = '#12245f';
      ctx.fillRect(3, 2, 2, 1);
    });
    const root = this.add.container(0, 0).setScale(scale * 3, scale * 3);
    const body = this.add.image(0, 0, bodyTexture).setOrigin(0.5);
    const eyeA = this.add.image(-10, 7, eyeTexture).setOrigin(0.5);
    const eyeB = this.add.image(10, 7, eyeTexture).setOrigin(0.5);
    const blushA = this.add.image(-15, 13, blushTexture).setOrigin(0.5);
    const blushB = this.add.image(15, 13, blushTexture).setOrigin(0.5);
    const mouth = this.add.image(0, 14, mouthTexture).setOrigin(0.5);
    const glintA = this.add.rectangle(-13, -7, 1, 1, 0xf4fff0).setAlpha(0);
    const glintB = this.add.rectangle(9, -7, 1, 1, 0xf4fff0).setAlpha(0);
    root.add([body, eyeA, eyeB, blushA, blushB, mouth, glintA, glintB]);
    return { root, eyes: [eyeA, eyeB], glints: [glintA, glintB], mouth };
  }

  makeSlimeArt(scale = 1) {
    return this.makeSlimeArtTemplate(scale);
  }

  getSlimePalette() {
    const palettes = {
      blue: { outline: '#122c70', shadow: '#357ac7', base: '#55c8ee', light: '#8ce4f3', highlight: '#e7ffff' },
      red: { outline: '#70253d', shadow: '#c75162', base: '#ed6f80', light: '#f59aa3', highlight: '#fff0ed' },
      green: { outline: '#174f45', shadow: '#3d9c78', base: '#62d29b', light: '#9be8b7', highlight: '#efffe8' },
      yellow: { outline: '#72531c', shadow: '#c99a38', base: '#efd064', light: '#f8e59a', highlight: '#fffbe4' },
      purple: { outline: '#4b2b70', shadow: '#8653b4', base: '#b079dc', light: '#d0a3ed', highlight: '#f8ecff' },
    };
    return palettes[this.meta?.dyeColor] || palettes.blue;
  }

  makeMicroSlimeArt(scale = 1) {
    const key = 'slime-micro-stage-v2';
    if (!this.textures.exists(key)) {
      const canvas = this.textures.createCanvas(key, 56, 34).getSourceImage();
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const unit = 2;
      const rows = [
        [10, 8], [8, 12], [6, 16], [4, 20], [3, 22], [2, 24],
        [1, 26], [1, 26], [0, 28], [0, 28], [0, 28], [0, 28],
        [1, 26], [2, 24], [3, 22], [5, 18],
      ];
      const cells = new Set();
      rows.forEach(([left, width], y) => {
        for (let x = left; x < left + width; x += 1) cells.add(`${x},${y}`);
      });
      const has = (x, y) => cells.has(`${x},${y}`);
      const palette = this.getSlimePalette();
      const paint = (x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x * unit, (y + 1) * unit, unit, unit);
      };
      cells.forEach((cell) => {
        const [x, y] = cell.split(',').map(Number);
        const edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
        let color = palette.base;
        if (edge) color = palette.outline;
        else if (y >= 12 || (x >= 21 && y >= 8)) color = palette.shadow;
        else if (x <= 9 && y <= 6) color = palette.light;
        paint(x, y, color);
      });
      [[8, 3], [9, 3], [7, 4], [8, 4], [6, 5]].forEach(([x, y]) => {
        if (has(x, y)) paint(x, y, palette.highlight);
      });
      this.textures.get(key).refresh();
    }
    this.textures.get(key).setFilter?.(Phaser.Textures.FilterMode.NEAREST);
    const root = this.add.container(0, 0).setScale(scale * 3, scale * 3);
    root.add(this.add.image(0, 0, key).setOrigin(0.5, 1));
    return { root, eyes: null, glints: null, mouth: null };
  }

  startSlimeIdle() {
    if (!this.slimeArt?.active) return;
    this.tweens.killTweensOf(this.slimeArt);
    this.tweens.add({
      targets: this.slimeArt,
      scaleX: this.slimeBaseScale.x * 1.024,
      scaleY: this.slimeBaseScale.y * 0.975,
      duration: 1280,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  playSlimeBlink() {
    if (this.isEnded || this.inBattle || !this.slimeEyes?.every((eye) => eye.active)) return;
    this.tweens.add({ targets: this.slimeEyes, scaleY: 0.12, duration: 80, yoyo: true, repeat: 1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.slimeGlints, alpha: 0, duration: 70, yoyo: true, repeat: 1 });
  }

  playSlimeWiggle() {
    if (this.isEnded || this.inBattle || !this.slimeArt?.active) return;
    this.tweens.add({ targets: this.slimeArt, angle: 2.4, duration: 130, yoyo: true, repeat: 1, ease: 'Sine.inOut' });
  }

  setSlimeHungry(active) {
    if (!this.slimeMouth?.active) return;
    this.tweens.killTweensOf(this.slimeMouth);
    if (!active) { this.slimeMouth.setScale(1); return; }
    this.tweens.add({ targets: this.slimeMouth, scaleX: 1.28, scaleY: 1.4, duration: 150, ease: 'Sine.out' });
  }

  playSlimeChew() {
    if (!this.slimeArt?.active) return;
    this.tweens.killTweensOf(this.slimeArt);
    this.tweens.add({
      targets: this.slimeArt,
      scaleX: this.slimeBaseScale.x * 1.14,
      scaleY: this.slimeBaseScale.y * 0.74,
      duration: 105,
      yoyo: true,
      ease: 'Back.out',
      onComplete: () => this.startSlimeIdle(),
    });
    if (this.slimeMouth?.active) {
      this.tweens.add({ targets: this.slimeMouth, scaleX: 1.36, scaleY: 1.6, duration: 90, yoyo: true, ease: 'Sine.inOut' });
    }
  }

  createBonePiles() {
    if (this.meta.fusedPile) {
      this.bonePiles.push(this.createBonePile(580, 548, 1, 1.22));
    } else {
      this.bonePiles.push(this.createBonePile(142, 548, 1));
      if (this.meta.extraPile) this.bonePiles.push(this.createBonePile(1018, 548, -1));
    }
    this.nextPileIndex = 0;
  }

  createBonePile(x, y, direction, scale = 1) {
    const root = this.add.container(x, y).setDepth(8);
    const prop = DungeonProps.bonePile(this, direction);
    root.setScale(scale).setSize(152, 88).setInteractive({ useHandCursor: true });
    root.add(prop.root);
    const pile = { root, artGroup: prop.artGroup, x, y, direction, scale, radius: 116 * scale, nextSearchAt: 0 };
    root.on('pointerdown', () => this.manualSearchPile(pile));
    return pile;
  }

  makeBoneArt(type = 'bone', size = 1) {
    const sprite = makeItemSprite(this, type);
    sprite.setScale(size);
    return sprite;
  }

  spawnInitialBones() {
    [-18, 24, -31, 15].forEach((angle) => {
      const point = this.getBoneDropPoint();
      if (point) this.spawnBone('bone', point.x, point.y, { angle });
    });
  }

  getBoneDropPoint(sourcePile = this.bonePiles[0]) {
    const blockers = [
      ...this.bonePiles.map((pile) => ({ x: pile.x, y: pile.y, radius: pile.radius || 116 })),
      { x: this.slime.x, y: this.slime.y, radius: this.slimeRadius + 52 },
      ...this.bones.filter((bone) => bone.active && !bone.consumed).map((bone) => ({
        x: bone.homeX,
        y: bone.homeY,
        radius: 64,
      })),
    ];
    return chooseBoneSpawnPoint(blockers, Math.random, sourcePile);
  }

  spawnBone(type, x, y, options = {}) {
    const sourcePile = options.sourcePile || this.bonePiles[0];
    const bone = this.add.container(options.fromPile ? sourcePile.x + sourcePile.direction * 42 : x, options.fromPile ? sourcePile.y - 28 : y).setDepth(10);
    bone.setSize(58, 50);
    bone.foodType = type;
    bone.isLarge = type === 'bone' && Math.random() < getLargeBoneChance(this.meta);
    bone.foodData = type === 'bone'
      ? { ...FOOD.bone, name: bone.isLarge ? '大骨片' : FOOD.bone.name, value: getBoneValue(this.meta, { large: bone.isLarge, boneBonus: this.boneValueBonus }) }
      : FOOD[type];
    bone.homeX = x; bone.homeY = y; bone.isSettled = !options.fromPile; bone.consumed = false; bone.wasMoved = false;
    bone.add(this.makeBoneArt(type, type === 'bone' ? bone.isLarge ? 0.9 : 0.66 : 0.92));
    bone.setAngle(options.angle || Phaser.Math.Between(-45, 45));
    this.bones.push(bone);
    if (options.fromPile) {
      bone.setScale(0.3); bone.alpha = 0.2;
      this.tweens.add({ targets: bone, x, y, scale: 1, alpha: 1, angle: options.angle || Phaser.Math.Between(-45, 45), duration: 680, ease: 'Back.out', onComplete: () => { bone.isSettled = true; this.createBoneLanding(bone); this.tweenBoneIdle(bone); } });
    }
    this.tweenBoneIdle(bone);
    return bone;
  }

  tweenBoneIdle(bone) {
    if (!bone.active || bone.consumed || !bone.isSettled) return;
    this.tweens.add({ targets: bone, y: bone.homeY - 4, duration: 900 + (bone.homeX % 7) * 80, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  createBoneLanding(bone) {
    for (let i = 0; i < 5; i += 1) {
      const chip = PixelEffects.particle(this, 0xf2c95d, 4).setPosition(bone.x, bone.y + 12).setAlpha(0.88).setDepth(12);
      this.tweens.add({
        targets: chip,
        x: chip.x + Phaser.Math.Between(-28, 28),
        y: chip.y + Phaser.Math.Between(-22, -7),
        alpha: 0,
        scale: 0.35,
        duration: 260 + i * 24,
        ease: 'Cubic.out',
        onComplete: () => chip.destroy(),
      });
    }
  }

  createInput() {
    this.input.on('pointerdown', (pointer) => {
      if (this.isEnded || this.inBattle) return;
      const point = { x: pointer.x, y: pointer.y };
      const bone = this.bones.slice().reverse().find((candidate) => candidate.active && candidate.isSettled && distance(candidate, point) < 43);
      if (!bone) return;
      this.tweens.killTweensOf(bone);
      this.drag = { bone, pointerId: pointer.id, startX: pointer.x, startY: pointer.y, moved: false };
      bone.setDepth(18).setScale(1.16);
      bone.list[0]?.pixelGlow?.setVisible(true).setAlpha(0.95);
      this.setSlimeHungry(true);
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.drag) return;
      if (pointer.id !== this.drag.pointerId || !pointer.isDown) return;
      if (this.isEnded || this.inBattle) { this.cancelDrag(); return; }
      const { bone } = this.drag;
      if (Math.hypot(pointer.x - this.drag.startX, pointer.y - this.drag.startY) > 9) this.drag.moved = true;
      bone.x = clamp(pointer.x, ARENA.left + 38, ARENA.right - 38);
      bone.y = clamp(pointer.y, ARENA.top + 32, ARENA.bottom - 52);
      if (distance(bone, this.slime) <= getMagnetRadius(this.meta) && canConsume(this.mass, bone.foodData.value)) {
        this.feedBone(bone);
        if (bone.consumed) {
          this.drag = null;
          this.setSlimeHungry(false);
        }
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (!this.drag || pointer.id !== this.drag.pointerId) return;
      const { bone, moved } = this.drag; this.drag = null; bone.setScale(1); this.setSlimeHungry(false);
      bone.list[0]?.pixelGlow?.setVisible(false);
      if (!bone.active) return;
      if (moved && distance(bone, this.slime) > getMagnetRadius(this.meta)) {
        this.returnBone(bone); return;
      }
      this.feedBone(bone);
    });
    this.input.on('pointerupoutside', (pointer) => {
      if (!this.drag || pointer.id !== this.drag.pointerId) return;
      const { bone } = this.drag; this.drag = null; this.setSlimeHungry(false); bone.setScale(1); this.returnBone(bone);
    });
    this.input.on('gameout', () => this.cancelDrag());
  }

  cancelDrag() {
    if (!this.drag) return;
    const { bone } = this.drag;
    this.drag = null;
    this.setSlimeHungry(false);
    if (bone?.active) {
      bone.setScale(1).setDepth(10);
      bone.list[0]?.pixelGlow?.setVisible(false);
      this.returnBone(bone, false);
    }
  }

  returnBone(bone, showHint = false) {
    if (!bone.active || bone.consumed) return;
    bone.wasMoved = false;
    bone.setDepth(10);
    this.tweens.add({ targets: bone, x: bone.homeX, y: bone.homeY, angle: 0, duration: 420, ease: 'Back.out', onComplete: () => this.tweenBoneIdle(bone) });
    if (showHint) this.showToast('碎骨太远了，拖进史莱姆体内', 1200);
  }

  feedBone(bone) {
    if (!bone.active || bone.consumed || this.isEnded || this.inBattle || !bone.isSettled) return;
    if (bone.foodType === 'bone') {
      bone.foodData.value = getBoneValue(this.meta, {
        large: bone.isLarge,
        boneBonus: this.boneValueBonus,
      });
    }
    if (!canConsume(this.mass, bone.foodData.value)) { this.returnBone(bone); return; }
    const massCap = getEvolutionMassCap(this.meta);
    if (this.mass >= massCap) {
      this.returnBone(bone);
      return;
    }
    bone.consumed = true;
    const growth = Math.min(calculateGrowth(bone.foodData.value, this.meta), massCap - this.mass);
    this.bones = this.bones.filter((item) => item !== bone);
    this.tweens.add({ targets: bone, x: this.slime.x, y: this.slime.y - 4, scale: 0.08, alpha: 0, duration: 360, ease: 'Back.in', onComplete: () => bone.destroy() });
    this.mass += growth; this.coins += growth;
    this.itemsFed += 1;
    this.drawSlime();
    this.playSlimeChew();
    this.createFeedBurst(bone.foodData.color);
    this.updateHud();
    this.showFeedFloat(`+${growth}`, '#e7f5c5');
  }

  createFeedBurst(color) {
    for (let i = 0; i < 6; i += 1) {
      const spark = PixelEffects.particle(this, color, 4).setPosition(this.slime.x, this.slime.y - 18).setAlpha(0.9).setDepth(17);
      this.tweens.add({ targets: spark, x: spark.x + Phaser.Math.Between(-86, 86), y: spark.y + Phaser.Math.Between(-60, 12), alpha: 0, scale: 0.3, duration: 420 + i * 20, onComplete: () => spark.destroy() });
    }
  }

  createPileBurst(pile) {
    const burst = PixelEffects.particle(this, 0xffefbd, 8).setPosition(pile.x, pile.y - 14).setAlpha(0.72).setDepth(16);
    this.tweens.add({ targets: burst, scale: 0.2, alpha: 0, duration: 240, ease: 'Cubic.out', onComplete: () => burst.destroy() });
    for (let i = 0; i < 7; i += 1) {
      const chip = PixelEffects.boneChip(this, i % 3).setPosition(pile.x + Phaser.Math.Between(-26, 26), pile.y - 4 + Phaser.Math.Between(-8, 8)).setAlpha(0.96).setDepth(16).setScale(0.74 + (i % 3) * 0.1);
      this.tweens.add({
        targets: chip,
        x: chip.x + Phaser.Math.Between(-54, 58),
        y: chip.y - 38 - i * 4 + Phaser.Math.Between(-10, 8),
        alpha: 0,
        angle: Phaser.Math.Between(-70, 70),
        scale: 0.28,
        duration: 460 + i * 34,
        ease: 'Cubic.out',
        onComplete: () => chip.destroy(),
      });
    }
    for (let i = 0; i < 3; i += 1) {
      const dust = PixelEffects.particle(this, PixelPalette.mossLight, 4).setPosition(pile.x + Phaser.Math.Between(-24, 24), pile.y + 8).setAlpha(0.42).setDepth(15);
      this.tweens.add({ targets: dust, x: dust.x + Phaser.Math.Between(-24, 24), y: dust.y - Phaser.Math.Between(12, 24), alpha: 0, duration: 380 + i * 40, onComplete: () => dust.destroy() });
    }
  }

  spawnPileBone(sourcePile) {
    const point = this.getBoneDropPoint(sourcePile);
    if (!point) return false;
    this.spawnBone('bone', point.x, point.y, { fromPile: true, sourcePile });
    this.pileBurst(sourcePile);
    return true;
  }

  manualSearchPile(pile) {
    if (this.isEnded || this.inBattle || !this.meta.boneSearch) return;
    const cooldown = getBoneSearchCooldown(this.meta);
    if (this.time.now < pile.nextSearchAt) {
      this.showToast(`骨堆还需要 ${Math.ceil((pile.nextSearchAt - this.time.now) / 1000)} 秒`, 900);
      return;
    }
    if (this.bones.length >= 9) {
      this.showToast('场地上的骨片太多了', 900);
      return;
    }
    pile.nextSearchAt = this.time.now + cooldown * 1000;
    this.tweens.killTweensOf(pile.root);
    this.tweens.add({ targets: pile.root, angle: pile.direction * 7, duration: 120, yoyo: true, repeat: 1, ease: 'Sine.inOut' });
    this.spawnPileBone(pile);
  }

  update(time) {
    if (this.isEnded) return;
    if (!this.inBattle && time >= this.nextBoneAt && this.bones.length < 9) {
      const sourcePile = this.bonePiles[this.nextPileIndex % this.bonePiles.length];
      if (this.spawnPileBone(sourcePile)) {
        if (this.bones.length < 9 && Math.random() < getBonusProductionChance(this.meta)) {
          this.spawnPileBone(sourcePile);
        }
        this.nextPileIndex += 1;
      }
      this.nextBoneAt = time + getBoneSpawnInterval(this.mass, this.meta);
    }
    const config = getWaveConfig(this.wave);
    const remaining = Math.max(0, (this.nextWaveAt - time) / 1000);
    this.timerText.setText(this.inBattle ? '袭击中 · 史莱姆自动迎战' : `袭击倒计时  ${remaining.toFixed(1)}s`);
    this.timerText.setColor(remaining < 5 && !this.inBattle ? '#ff776e' : '#f4c76b');
    this.evolutionFill.displayWidth = this.evolutionMaxWidth * clamp(this.mass / getEvolutionMassCap(this.meta), 0, 1);
    if (!this.inBattle && time >= this.nextWaveAt) this.startWave();
  }

  pileBurst(pile) {
    if (!pile?.artGroup.active) return;
    this.tweens.killTweensOf(pile.artGroup);
    pile.artGroup.setScale(pile.direction, 1);
    this.tweens.add({ targets: pile.artGroup, scaleX: pile.direction * 1.04, scaleY: 0.94, duration: 110, yoyo: true, ease: 'Sine.inOut' });
    this.createPileBurst(pile);
  }

  startWave() {
    if (this.inBattle || this.isEnded) return;
    this.cancelDrag();
    this.inBattle = true;
    const config = getWaveConfig(this.wave);
    this.showToast(config.title + ' 抵达地牢入口', 950);
    this.playEncounterTransition(config);
  }

  playEncounterTransition(config) {
    const transition = this.add.container(0, 0).setDepth(40);
    const veil = PixelUI.veil(this, WIDTH, HEIGHT, 0).setPosition(580, 360);
    const leftSlat = PixelEffects.encounterCurtain(this, 'left', WIDTH / 2, HEIGHT).setOrigin(0).setPosition(-WIDTH / 2, 0);
    const rightSlat = PixelEffects.encounterCurtain(this, 'right', WIDTH / 2, HEIGHT).setOrigin(0).setPosition(WIDTH, 0);
    const title = this.add.text(580, 301, '遭 遇 ！', { fontFamily: 'serif', fontSize: '64px', fontStyle: 'bold', color: '#fff1c7', stroke: '#27151a', strokeThickness: 12 }).setOrigin(0.5).setAlpha(0);
    const subtitle = this.add.text(580, 367, config.title + '  ·  来袭战力 ' + formatNumber(config.power), { fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#d8e3e1', letterSpacing: 2 }).setOrigin(0.5).setAlpha(0);
    transition.add([veil, leftSlat, rightSlat, title, subtitle]);
    this.tweens.add({ targets: veil, alpha: 0.78, duration: 180 });
    this.tweens.add({ targets: leftSlat, x: 0, duration: 300, ease: 'Cubic.out' });
    this.tweens.add({ targets: rightSlat, x: WIDTH / 2, duration: 300, ease: 'Cubic.out' });
    this.tweens.add({ targets: [title, subtitle], alpha: 1, duration: 180, delay: 180 });
    this.time.delayedCall(620, () => {
      transition.destroy(true);
      this.createBattleArena(config);
    });
  }

  createBattleArena(config) {
    if (this.isEnded) return;
    const battle = this.add.container(0, 0).setDepth(42);
    this.battle = battle;

    const backdrop = makeBattleBackdrop(this, WIDTH, HEIGHT);
    battle.add(backdrop);

    const header = this.add.container(580, 54);
    header.add(pixelPanel(this, 0, 0, 600, 54, PixelPalette.edge));
    header.add(this.add.text(0, -10, '地牢遭遇战', { fontFamily: 'serif', fontSize: '22px', fontStyle: 'bold', color: '#f7edcf' }).setOrigin(0.5));
    header.add(this.add.text(0, 13, config.title + '  ·  战力 ' + formatNumber(config.power), { fontFamily: 'sans-serif', fontSize: '11px', color: '#aebec0', letterSpacing: 1 }).setOrigin(0.5));
    battle.add(header);

    const leftPlatform = this.makeBattlePlatform(315, 493, 'slime');
    const rightPlatform = this.makeBattlePlatform(877, 493, 'enemy');
    battle.add([leftPlatform, rightPlatform]);

    const slime = this.createBattleSlime(315, 401, 0.82);
    const party = this.createAdventurerParty(877, 405, config.wave);
    battle.add([slime.root, party.root]);

    this.battleSpeed = 1;
    const playerCard = this.createBattleCard(battle, 197, 142, getSlimeStage(this.meta), '进化能量', 0x65d682, 0x153b36);
    const enemyName = config.wave === 1 ? '木剑见习者' : config.wave === 2 ? '老练的猎人' : '冒险者小队';
    const enemyCard = this.createBattleCard(battle, 963, 142, enemyName, '战力 ' + formatNumber(config.power), 0xe0827c, 0x4b2935);
    const timeline = this.createBattleTimeline(battle, config.wave);
    this.battleState = {
      config,
      plan: getBattlePlan(this.mass, config.power, config.wave),
      slimeHp: 100,
      enemyHp: 100,
      actors: { slime, enemy: party },
      cards: { slime: playerCard, enemy: enemyCard },
      racers: timeline.racers,
      actionText: timeline.actionText,
    };
    this.updateBattleUi();

    slime.root.setAlpha(0).setX(slime.baseX - 60);
    party.root.setAlpha(0).setX(party.baseX + 60);
    this.tweens.add({ targets: slime.root, alpha: 1, x: slime.baseX, duration: 340, ease: 'Cubic.out' });
    this.tweens.add({ targets: party.root, alpha: 1, x: party.baseX, duration: 340, ease: 'Cubic.out' });
    this.time.delayedCall(700, () => this.playBattleTurn(0));
  }

  makeBattlePlatform(x, y, side) { return DungeonProps.groundPatch(this, side).setPosition(x, y); }

  createBattleCard(battle, x, y, label, detail, color, fillColor) {
    const card = this.add.container(x, y);
    const bg = pixelPanel(this, 0, 0, 286, 68, color, 0x0b141c);
    const labelText = this.add.text(-124, -20, label, { fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#edf3e7' });
    const detailText = this.add.text(-124, 1, detail, { fontFamily: 'sans-serif', fontSize: '10px', color: '#9bacaf' });
    const hpBar = PixelUI.bar(this, 0, 23, 246, 14, color);
    const barBg = hpBar.background;
    const barFill = hpBar.fill;
    const hpText = this.add.text(123, 1, '100 / 100', { fontFamily: 'sans-serif', fontSize: '10px', color: '#d9e6df' }).setOrigin(1, 0);
    card.add([bg, labelText, detailText, barBg, barFill, hpText]);
    battle.add(card);
    return { card, barFill, hpText, maxWidth: hpBar.maxWidth };
  }

  createBattleTimeline(battle, wave) {
    const panel = this.add.container(580, 618);
    panel.add(pixelPanel(this, 0, 0, 1012, 96, PixelPalette.edge));
    panel.add(this.add.text(-472, -34, '行动轨道', { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#f4e9cf' }));
    const actionText = this.add.text(-332, -34, '准备', { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#9db5ad' });
    panel.add(actionText);
    const speedButton = this.add.container(432, -32);
    const speedBg = pixelPanel(this, 0, 0, 80, 24, 0x79bd8c, 0x213630).setInteractive({ useHandCursor: true });
    const speedText = this.add.text(0, 0, '速度 1x', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#d9f0d5' }).setOrigin(0.5);
    speedButton.add([speedBg, speedText]);
    speedBg.on('pointerover', () => speedBg.setTint(0xc8ffe2));
    speedBg.on('pointerout', () => speedBg.clearTint());
    speedBg.on('pointerdown', () => {
      this.battleSpeed = this.battleSpeed === 1 ? 2 : 1;
      speedText.setText(`速度 ${this.battleSpeed}x`);
      speedBg.setTint(this.battleSpeed === 2 ? 0xe7bf69 : 0xffffff);
    });
    panel.add(speedButton);

    const startX = -404;
    const width = 808;
    const track = PixelUI.timeline(this, width).setPosition(startX + width / 2, 16);
    const finish = PixelUI.sword(this).setPosition(startX + width - 2, 13);
    panel.add([track, finish]);

    const createRacer = (key, label, color, progress) => {
      const token = this.add.container(startX + width * progress, 12);
      const icon = PixelUI.timelineIcon(this, key === 'slime' ? 'slime' : 'enemy');
      const frame = pixelPanel(this, 0, 0, 24, 24, PixelPalette.white, PixelPalette.ink).setVisible(false);
      token.add([frame, icon]);
      panel.add(token);
      return { key, label, color, token, frame, progress, startX, width };
    };
    const racerStyles = {
      slime: ['史莱姆', 0x6edc8d, wave === 1 ? 0.12 : 0.09],
      rookie: ['木剑见习者', 0xd89b65, 0.54],
      hunter: ['老练的猎人', 0xb98b59, 0.54],
      guard: ['盾卫', 0xe8a477, 0.26],
      archer: ['弓手', 0xd8c46e, 0.43],
      oracle: ['术士', 0xbc91e6, 0.58],
    };
    const roster = ['slime', ...getBattleRacers(wave)].map((key) => [key, ...racerStyles[key]]);
    const racers = Object.fromEntries(roster.map(([key, label, color, progress]) => (
      [key, createRacer(key, label, color, progress)]
    )));
    battle.add(panel);
    return { racers, actionText };
  }

  createBattleSlime(x, y, scale) {
    const root = this.add.container(x, y);
    root.baseX = x;
    root.baseY = y;
    const isMicroSlime = (this.meta.evolution || 0) === 0;
    const portrait = isMicroSlime ? this.makeMicroSlimeArt(scale * 0.7) : this.makeSlimeArt(scale);
    portrait.root.y = isMicroSlime ? 76 : 30;
    root.add(portrait.root);
    return { root, art: portrait.root, artBaseScale: { x: portrait.root.scaleX, y: portrait.root.scaleY }, baseX: x, baseY: y };
  }

  createAdventurerParty(x, y, wave) {
    const root = this.add.container(x, y);
    const isRookie = wave === 1;
    const isHunter = wave === 2;
    const figures = {};
    const layout = isRookie
      ? [['rookie', 0, 32, 2.55]]
      : isHunter
        ? [['hunter', 0, 32, 2.55]]
        : [
        ['archer', -98, 5, 0.78],
        ['guard', 0, -9, 0.94],
        ['oracle', 100, 4, 0.79],
      ];
    layout.forEach(([role, offsetX, offsetY, scale]) => {
      const figure = this.makeAdventurerFigure(offsetX, offsetY, role, scale);
      figures[role] = figure;
      root.add(figure);
    });
    root.add(this.add.text(0, 90, isRookie ? '木剑见习者' : isHunter ? '老练的猎人' : '王国讨伐队', { fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#f0d7c0', stroke: '#25151d', strokeThickness: 4 }).setOrigin(0.5));
    return { root, figures, baseX: x, baseY: y };
  }

  makeAdventurerFigure(x, y, role, scale) {
    const figure = makeAdventurerSprite(this, role, scale);
    figure.setPosition(x, y);
    figure.baseX = x;
    figure.baseY = y;
    return figure;
  }
  updateBattleUi() {
    if (!this.battleState) return;
    const state = this.battleState;
    state.cards.slime.barFill.displayWidth = state.cards.slime.maxWidth * (state.slimeHp / 100);
    state.cards.enemy.barFill.displayWidth = state.cards.enemy.maxWidth * (state.enemyHp / 100);
    state.cards.slime.hpText.setText(Math.max(0, Math.ceil(state.slimeHp)) + ' / 100');
    state.cards.enemy.hpText.setText(Math.max(0, Math.ceil(state.enemyHp)) + ' / 100');
  }

  playBattleTurn(index) {
    const state = this.battleState;
    if (!this.battle?.active || !state || this.isEnded) return;
    if (index >= state.plan.turns.length) {
      this.finishBattle(state.plan.slimeWins, state.config);
      return;
    }
    const turn = state.plan.turns[index];
    this.runBattleRace(turn.racer, () => this.performBattleStrike(turn, () => {
      this.time.delayedCall(this.battleDuration(480), () => this.playBattleTurn(index + 1));
    }));
  }

  battleDuration(base) {
    return base / (this.battleSpeed || 1);
  }

  runBattleRace(racerKey, complete) {
    const state = this.battleState;
    const active = state.racers[racerKey];
    state.actionText.setText(active.label + ' 行动');
    Object.values(state.racers).forEach((racer, index) => {
      racer.frame.setVisible(racer === active);
      const remaining = 1 - racer.progress;
      racer.nextProgress = racer === active
        ? 1
        : Math.min(0.91, racer.progress + remaining * (0.16 + index * 0.025));
      this.tweens.add({
        targets: racer.token,
        x: racer.startX + racer.width * racer.nextProgress,
        scaleX: racer === active ? 1.22 : 1,
        scaleY: racer === active ? 1.22 : 1,
        y: racer === active ? 8 : 12,
        duration: this.battleDuration(560),
        ease: 'Sine.inOut',
      });
    });
    this.time.delayedCall(this.battleDuration(630), () => {
      if (!this.battle?.active) return;
      Object.values(state.racers).forEach((racer) => { racer.progress = racer.nextProgress; });
      complete();
    });
  }

  resetBattleRacer(racerKey) {
    const racer = this.battleState?.racers[racerKey];
    if (!racer) return;
    racer.progress = 0.055;
    racer.token.x = racer.startX + racer.width * racer.progress;
    racer.token.setScale(1);
    racer.token.y = 12;
    racer.frame.setVisible(false);
  }

  performBattleStrike(turn, complete) {
    const state = this.battleState;
    if (!state || !this.battle?.active) return;
    const attacker = state.actors[turn.actor];
    const defenderKey = turn.actor === 'slime' ? 'enemy' : 'slime';
    const defender = state.actors[defenderKey];
    const direction = turn.actor === 'slime' ? 1 : -1;
    const attackerVisual = turn.actor === 'enemy' ? attacker.figures[turn.racer] : attacker.root;
    if (turn.actor === 'slime') {
      this.tweens.add({
        targets: attacker.art,
        scaleX: attacker.artBaseScale.x * 1.18,
        scaleY: attacker.artBaseScale.y * 0.76,
        duration: this.battleDuration(75),
        yoyo: true,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: attacker.root,
        x: attacker.baseX + direction * 44,
        y: attacker.baseY - 10,
        duration: this.battleDuration(155),
        yoyo: true,
        ease: 'Cubic.out',
      });
    } else {
      const weaponPivot = attackerVisual.weaponPivot;
      weaponPivot.setAngle(0).setY(-20);
      this.tweens.add({
        targets: attackerVisual,
        x: attackerVisual.baseX - direction * 8,
        y: attackerVisual.baseY + 3,
        duration: this.battleDuration(105),
        ease: 'Sine.out',
      });
      this.tweens.add({
        targets: weaponPivot,
        angle: -direction * 46,
        y: -28,
        duration: this.battleDuration(105),
        ease: 'Sine.out',
      });
      this.time.delayedCall(this.battleDuration(108), () => {
        if (!this.battle?.active) return;
        this.tweens.add({
          targets: attackerVisual,
          x: attackerVisual.baseX + direction * 16,
          y: attackerVisual.baseY - 2,
          duration: this.battleDuration(112),
          ease: 'Cubic.in',
          yoyo: true,
        });
        this.tweens.add({
          targets: weaponPivot,
          angle: direction * 66,
          y: -4,
          duration: this.battleDuration(112),
          ease: 'Cubic.in',
        });
        this.time.delayedCall(this.battleDuration(122), () => {
          if (!this.battle?.active) return;
          this.tweens.add({ targets: weaponPivot, angle: 0, y: -20, duration: this.battleDuration(90), ease: 'Sine.out' });
        });
      });
    }
    this.time.delayedCall(this.battleDuration(turn.actor === 'enemy' ? 178 : 92), () => {
      if (!this.battle?.active) return;
      const attackFx = PixelEffects.attack(this, turn.actor, direction)
        .setPosition(attacker.baseX + direction * 38, attacker.baseY - 38)
        .setDepth(46);
      this.tweens.add({
        targets: attackFx,
        x: attackFx.x + direction * 38,
        alpha: 0,
        scaleX: direction * 1.22,
        scaleY: 1.22,
        duration: this.battleDuration(190),
        ease: 'Cubic.out',
        onComplete: () => attackFx.destroy(),
      });
    });
    this.time.delayedCall(this.battleDuration(turn.actor === 'enemy' ? 208 : 155), () => {
      if (!this.battle?.active) return;
      if (defenderKey === 'enemy') state.enemyHp = Math.max(0, state.enemyHp - turn.damage);
      else state.slimeHp = Math.max(0, state.slimeHp - turn.damage);
      this.tweens.add({ targets: defender.root, x: defender.baseX - direction * 13, angle: direction * 3, duration: 72, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
      this.createBattleImpact(defender.baseX - direction * 22, defender.baseY - 22, turn.actor === 'slime' ? 0x9af5a2 : 0xf3b38a, turn.damage);
      this.updateBattleUi();
      this.time.delayedCall(this.battleDuration(460), () => {
        this.resetBattleRacer(turn.racer);
        complete();
      });
    });
  }

  createBattleImpact(x, y, color, damage) {
    const value = this.add.text(x, y - 34, '-' + damage, { fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#fff1d5', stroke: '#20131a', strokeThickness: 5 }).setOrigin(0.5).setDepth(46);
    this.tweens.add({ targets: value, y: value.y - 26, alpha: 0, duration: 480, ease: 'Cubic.out', onComplete: () => value.destroy() });
    for (let i = 0; i < 5; i += 1) {
      const spark = PixelEffects.particle(this, color, 4).setPosition(x, y).setAlpha(0.96).setDepth(46);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-52, 52),
        y: y + Phaser.Math.Between(-45, 28),
        alpha: 0,
        scale: 0.2,
        angle: Phaser.Math.Between(-110, 110),
        duration: 360 + i * 25,
        onComplete: () => spark.destroy(),
      });
    }
  }

  finishBattle(slimeWins, config) {
    const state = this.battleState;
    if (!state || !this.battle?.active) return;
    state.actionText.setText(slimeWins ? '讨伐队溃散，地牢重新归于饥饿。' : '讨伐队压制住了黏液核心。');
    const loser = state.actors[slimeWins ? 'enemy' : 'slime'];
    this.tweens.add({ targets: loser.root, alpha: 0.2, y: loser.baseY + 22, duration: 460, ease: 'Cubic.in' });
    const result = this.add.text(580, 292, slimeWins ? '胜 利' : '败 北', { fontFamily: 'serif', fontSize: '52px', fontStyle: 'bold', color: slimeWins ? '#bff6ae' : '#ffb49c', stroke: '#1b2430', strokeThickness: 10 }).setOrigin(0.5);
    this.battle.add(result);
    this.time.delayedCall(760, () => {
      const battle = this.battle;
      if (!battle?.active) return;
      this.tweens.add({
        targets: battle,
        alpha: 0,
        duration: 340,
        ease: 'Sine.inOut',
        onComplete: () => {
          if (this.battle !== battle) return;
          battle.destroy(true);
          this.battle = null;
          this.battleState = null;
          if (slimeWins) this.winWave(config); else this.endRun(config);
        },
      });
    });
  }

  playSlimeVictory() {
    if (!this.slimeArt?.active) return;
    this.tweens.killTweensOf(this.slimeArt);
    this.tweens.add({
      targets: this.slimeArt,
      y: -17,
      angle: -5,
      duration: 170,
      yoyo: true,
      repeat: 1,
      ease: 'Back.out',
      onComplete: () => {
        this.slimeArt.y = 0;
        this.slimeArt.angle = 0;
        this.startSlimeIdle();
      },
    });
  }

  playSlimeDefeat() {
    if (!this.slimeArt?.active) return;
    this.tweens.killTweensOf(this.slimeArt);
    this.tweens.add({
      targets: this.slimeArt,
      scaleX: this.slimeBaseScale.x * 1.28,
      scaleY: this.slimeBaseScale.y * 0.45,
      duration: 360,
      ease: 'Cubic.out',
    });
  }

  winWave(config) {
    this.inBattle = false;
    this.nextBoneAt = this.time.now + 700;
    this.playSlimeVictory();
    const tokenX = Phaser.Math.Between(720, 960);
    const tokenY = Phaser.Math.Between(300, 520);
    this.spawnBone('adventurer', tokenX, tokenY, { angle: Phaser.Math.Between(-20, 20) });
    this.wave += 1;
    this.boneValueBonus += getBattleBoneBonus(this.meta, getBattleRacers(config.wave).length);
    this.nextWaveAt = this.time.now + getWaveConfig(this.wave).duration * 1000;
    this.updateHud();
    this.showToast('讨伐队留下了高价值战利品 · 继续喂养', 1600);
  }

  endRun(config) {
    this.isEnded = true;
    this.inBattle = false;
    this.playSlimeDefeat();
    this.time.delayedCall(620, () => this.showResult(config));
  }

  updateHud() {
    if (this.evolutionFill) this.evolutionFill.displayWidth = this.evolutionMaxWidth * clamp(this.mass / getEvolutionMassCap(this.meta), 0, 1);
  }

  showToast(message, duration = 1400) {
    this.toastText?.destroy();
    const toast = this.add.container(580, 620).setDepth(70);
    toast.add(pixelPanel(this, 0, 0, 520, 40, PixelPalette.edge));
    toast.add(this.add.text(0, 0, message, { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff1cf', shadow: { offsetX: 1, offsetY: 1, color: '#05080c', blur: 0, fill: true } }).setOrigin(0.5));
    this.toastText = toast;
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: duration, duration: 420, onComplete: () => this.toastText?.destroy() });
  }

  showFeedFloat(message, color = '#e7f5c5') {
    this.feedFloatText?.destroy();
    const text = this.add.text(this.slime.x, this.slime.y - 82, message, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '13px', fontStyle: 'bold', color,
      stroke: '#071015', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(24);
    this.feedFloatText = text;
    this.tweens.add({
      targets: text, y: text.y - 28, alpha: 0, duration: 980, ease: 'Cubic.out',
      onComplete: () => { if (this.feedFloatText === text) this.feedFloatText = null; text.destroy(); },
    });
  }

  showResult(config) {
    const earned = soulReward(this.mass, this.wave);
    this.meta.soul += earned; this.saveMeta();
    const overlay = this.add.container(0, 0).setDepth(50);
    overlay.add(PixelUI.veil(this, WIDTH, HEIGHT, 0.84).setPosition(580, 360));
    overlay.add(pixelPanel(this, 580, 361, 736, 466, 0xb98558, 0x111b25));
    overlay.add(this.add.text(580, 178, '本 局 结 算', { fontFamily: 'serif', fontSize: '38px', fontStyle: 'bold', color: '#f5efda', letterSpacing: 5 }).setOrigin(0.5));
    overlay.add(this.add.text(580, 226, `止步于第 ${this.wave} 波 · ${config.title}`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#99aab0' }).setOrigin(0.5));
    const stats = [
      ['进化阶段', getSlimeStage(this.meta), 0x9be7a8],
      ['吞噬骨片', formatNumber(this.itemsFed), 0xe7d7af],
      ['抵达波次', `第 ${this.wave} 波`, 0xd9b68b],
      ['本局魂晶', `+${earned} ◆`, 0xf2c867],
    ];
    stats.forEach(([label, value, color], index) => {
      const x = 330 + index * 167;
      overlay.add(this.add.text(x, 316, label, { fontFamily: 'sans-serif', fontSize: '11px', color: '#7f9299' }).setOrigin(0.5));
      overlay.add(this.add.text(x, 352, value, { fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: `#${color.toString(16).padStart(6, '0')}` }).setOrigin(0.5));
    });
    overlay.add(this.add.text(580, 424, `持有魂晶  ${this.meta.soul} ◆`, { fontFamily: 'sans-serif', fontSize: '16px', color: '#d5b969' }).setOrigin(0.5));
    const restart = this.makeButton(445, 520, 230, 48, '直接重新开始', 0x356b55, () => this.scene.restart());
    const upgrade = this.makeButton(715, 520, 230, 48, '进入升级树', 0x80583f, () => { overlay.destroy(true); this.showUpgradeTree(); });
    overlay.add([restart, upgrade]);
  }

  showUpgradeTree() {
    this.upgradeOverlay?.destroy(true);
    this.upgradeDetail = null;
    const overlay = this.add.container(0, 0).setDepth(55);
    this.upgradeOverlay = overlay;
    overlay.add(PixelUI.veil(this, WIDTH, HEIGHT, 0.97).setPosition(580, 360));
    overlay.add(pixelPanel(this, 580, 360, 1112, 640, 0x6e7774, 0x101a24));
    overlay.add(PixelUI.treeBackdrop(this, 1096, 624).setPosition(580, 360));
    overlay.add(this.add.text(580, 72, '进化树', { fontFamily: 'serif', fontSize: '40px', fontStyle: 'bold', color: '#f3ead2', shadow: { offsetX: 2, offsetY: 2, color: '#081015', blur: 0, fill: true } }).setOrigin(0.5));
    overlay.add(PixelUI.resourceBadge(this, 176).setPosition(982, 72));
    overlay.add(this.add.text(1110, 72, `${this.meta.soul}`, { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#f2c867' }).setOrigin(1, 0.5));

    const dragSurface = this.add.zone(580, 360, 1096, 624).setInteractive({ useHandCursor: false });
    const treeContent = this.add.container(0, 0);
    const pan = { active: false, startX: 0, startY: 0, originX: 0, originY: 0 };
    dragSurface.on('pointerdown', (pointer) => {
      pan.active = true; pan.startX = pointer.x; pan.startY = pointer.y;
      pan.originX = treeContent.x; pan.originY = treeContent.y;
    });
    const moveTree = (pointer) => {
      if (!pan.active || !pointer.isDown) return;
      treeContent.x = clamp(pan.originX + pointer.x - pan.startX, -260, 220);
      treeContent.y = clamp(pan.originY + pointer.y - pan.startY, -220, 110);
    };
    const releaseTree = () => { pan.active = false; };
    this.input.on('pointermove', moveTree);
    this.input.on('pointerup', releaseTree);
    overlay.once('destroy', () => {
      this.input.off('pointermove', moveTree);
      this.input.off('pointerup', releaseTree);
    });
    overlay.add([dragSurface, treeContent]);

    const positions = {
      nutrition: { x: 290, y: 288 }, production: { x: 530, y: 288 },
      extraPile: { x: 800, y: 288 }, dye: { x: 1010, y: 288 },
      evolution: { x: 410, y: 480 }, largeBone: { x: 690, y: 480 },
      betterBone: { x: 900, y: 480 },
      bonusProduction: { x: 200, y: 580 }, boneSearch: { x: 500, y: 580 }, fusedPile: { x: 760, y: 580 },
    };
    this.addUpgradeTreeLinks(treeContent, positions);
    Object.entries(positions).forEach(([branch, position]) => this.addUpgradeTreeNode(treeContent, branch, position.x, position.y));
    overlay.add(this.makeTreeButton(580, 642, '升级完成', () => this.scene.restart()));
  }

  addUpgradeTreeLinks(container, positions) {
    const links = [
      ['nutrition', 'evolution', 366],
      ['production', 'evolution', 390],
      ['extraPile', 'largeBone', 366],
      ['extraPile', 'betterBone', 390],
      ['evolution', 'bonusProduction', 538],
      ['evolution', 'boneSearch', 550],
      ['evolution', 'fusedPile', 562],
    ];
    links.forEach(([fromBranch, toBranch, laneY]) => {
      const from = positions[fromBranch];
      const to = positions[toBranch];
      const start = { x: from.x, y: from.y + 48 };
      const end = { x: to.x, y: to.y - 48 };
      const route = [start, { x: start.x, y: laneY }, { x: end.x, y: laneY }, end];
      container.add(PixelUI.connector(this, route, 0x58766f));
    });
  }

  getBranchUpgrade(branch) {
    const nodes = UPGRADE_NODES.filter((node) => node.branch === branch).sort((a, b) => a.level - b.level);
    const current = this.meta[branch] || 0;
    const target = nodes.find((node) => node.level === current + 1) || nodes.at(-1);
    return { current, max: nodes.at(-1).level, target };
  }

  getRequirementText(node) {
    const requirements = node.requires || (node.level === 1 ? {} : { [node.branch]: node.level - 1 });
    return Object.entries(requirements).map(([branch, level]) => {
      const prerequisite = UPGRADE_NODES.find((candidate) => candidate.branch === branch && candidate.level === level);
      return prerequisite?.name || `${branch} ${level}`;
    }).join(' + ');
  }

  addUpgradeTreeNode(overlay, branch, x, y) {
    const upgrade = this.getBranchUpgrade(branch);
    const { current, max, target } = upgrade;
    const state = getUpgradeNodeState(target, this.meta);
    const hidden = !state.known;
    const full = current >= max;
    const nodeView = this.add.container(x, y);
    const visualState = current > 0 ? 'owned'
      : branch === 'extraPile' && current === 0 ? 'locked'
        : state.affordable && state.unlocked ? 'ready' : 'locked';
    const circle = PixelUI.skillNode(this, branch, visualState, hidden)
      .setInteractive({ useHandCursor: true });
    circle.on('pointerover', () => circle.setScale(1.06));
    circle.on('pointerout', () => circle.setScale(1));
    circle.on('pointerdown', () => this.showUpgradeDetail(branch));
    nodeView.add(circle);
    if (current > 0) {
      const roman = ['I', 'II', 'III', 'IV'][current - 1] || 'IV';
      const tierBadge = PixelUI.tierBadge(this, roman, visualState).setPosition(-37, -36);
      const tier = this.add.text(-37, -36, roman, { fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#f5efda', stroke: '#14212a', strokeThickness: 2 }).setOrigin(0.5);
      nodeView.add([tierBadge, tier]);
    }
    overlay.add(nodeView);
  }

  showUpgradeDetail(branch) {
    this.upgradeDetail?.destroy(true);
    const { current, max, target: node } = this.getBranchUpgrade(branch);
    const state = getUpgradeNodeState(node, this.meta);
    const hidden = !state.known;
    const full = current >= max;
    const detail = this.add.container(0, 0).setDepth(65);
    this.upgradeDetail = detail;
    detail.add(PixelUI.veil(this, WIDTH, HEIGHT, 0.52).setPosition(580, 360));
    detail.add(pixelPanel(this, 580, 360, 474, 292, full ? 0x86d49a : state.unlocked ? 0xd1aa61 : 0x63747a, 0x14212a));
    const detailState = current > 0 ? 'owned' : state.affordable && state.unlocked ? 'ready' : 'locked';
    detail.add(PixelUI.skillNode(this, branch, detailState, hidden).setPosition(398, 282));
    if (!hidden && state.unlocked && !full) {
      const nextRoman = ['I', 'II', 'III', 'IV'][current] || 'IV';
      detail.add(PixelUI.tierBadge(this, nextRoman, state.affordable ? 'ready' : 'locked').setPosition(361, 246));
      detail.add(this.add.text(361, 246, nextRoman, { fontFamily: 'serif', fontSize: '12px', fontStyle: 'bold', color: '#f5efda', stroke: '#14212a', strokeThickness: 2 }).setOrigin(0.5));
    }
    detail.add(this.add.text(456, 262, hidden ? '未知节点' : full ? `${node.name} · 已完成` : node.name, { fontFamily: 'serif', fontSize: '25px', fontStyle: 'bold', color: '#f4ead3' }));
    const description = hidden ? '继续点亮前置能力后，这个节点会显露。' : full ? `该能力已升至 ${current}/${max}。` : node.desc;
    detail.add(this.add.text(456, 300, description, { fontFamily: 'sans-serif', fontSize: '13px', color: '#aabbbc', wordWrap: { width: 255 } }));
    const status = full ? '已掌握' : !state.unlocked ? `解锁条件：${this.getRequirementText(node)}` : state.affordable ? `消耗 ${node.cost} ◆` : `魂晶不足 · 还差 ${node.cost - this.meta.soul} ◆`;
    detail.add(this.add.text(456, 350, `等级进度  ${current}/${max}`, { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px', color: '#8fa8a2' }));
    detail.add(this.add.text(456, 378, status, { fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold', color: full ? '#a8e8ad' : state.unlocked && state.affordable ? '#f2c867' : '#8b9ca0', wordWrap: { width: 265 } }));
    if (branch === 'dye' && current > 0) {
      const colors = [
        ['blue', '蓝色', 0x55c8ee], ['red', '红色', 0xed6f80], ['green', '绿色', 0x62d29b], ['yellow', '黄色', 0xefd064], ['purple', '紫色', 0xb079dc],
      ];
      const currentColor = colors.find(([color]) => color === (this.meta.dyeColor || 'blue')) || colors[0];
      detail.add(this.add.text(456, 398, `当前：${currentColor[1]}`, { fontFamily: 'sans-serif', fontSize: '11px', color: '#d3e4d2' }));
      colors.forEach(([color, label, tint], index) => {
        const chip = pixelPanel(this, 0, 0, 30, 22, color === (this.meta.dyeColor || 'blue') ? 0xf2c867 : 0x53686a, 0x16242b)
          .setPosition(520 + index * 42, 414).setInteractive({ useHandCursor: true });
        const swatch = this.add.rectangle(0, 0, 12, 12, tint).setOrigin(0.5);
        const holder = this.add.container(chip.x, chip.y);
        holder.add(swatch);
        detail.add(chip);
        detail.add(holder);
        chip.on('pointerdown', () => {
          this.meta.dyeColor = color;
          this.saveMeta();
          this.drawSlime();
          this.showUpgradeDetail(branch);
        });
      });
    }
    detail.add(this.makeButton(493, 468, 140, 36, '返回', 0x394c52, () => detail.destroy(true)));
    if (!full && state.unlocked && state.affordable) {
      detail.add(this.makeButton(666, 468, 140, 36, '确认升级', 0x396d56, () => this.buyUpgradeNode(node)));
    }
  }

  buyUpgradeNode(node) {
    const state = getUpgradeNodeState(node, this.meta);
    if (!state.unlocked) return;
    if (this.meta.soul < node.cost) { this.showToast(`魂晶不足，还需要 ${node.cost - this.meta.soul} 枚`, 1300); return; }
    this.meta.soul -= node.cost;
    this.meta[node.branch] = node.level;
    this.saveMeta();
    this.upgradeDetail?.destroy(true);
    this.showUpgradeTree();
    this.showToast(`${node.name} 已掌握`, 1100);
  }

  makeButton(x, y, w, h, label, color, action) {
    const button = this.add.container(x, y);
    const bg = pixelPanel(this, 0, 0, w, h, 0xf4d38a, color).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#fff4dc' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setTint(0xfff0cf));
    bg.on('pointerout', () => bg.clearTint());
    bg.on('pointerdown', action); button.add([bg, text]); return button;
  }

  makeTreeButton(x, y, label, action) {
    const button = this.add.container(x, y);
    const bg = PixelUI.treeButton(this, 280, 52).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#d8ead7' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setTint(0xd0f1d4));
    bg.on('pointerout', () => bg.clearTint());
    bg.on('pointerdown', action);
    button.add([bg, text]);
    return button;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game',
  backgroundColor: '#080b12',
  pixelArt: true,
  resolution: window.devicePixelRatio || 1,
  render: { antialias: false, roundPixels: true, pixelArt: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [SlimeDungeonScene],
});

export { SlimeDungeonScene, game };
