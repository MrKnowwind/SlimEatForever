import * as Phaser from 'phaser';
import {
  ARENA, FOOD, HEIGHT, WIDTH, calculateGrowth, canConsume, chooseBoneSpawnPoint,
  emptyMeta, formatNumber, getBoneSpawnInterval, getBoneValue,
  getBattlePlan, getBattleRacers, getMagnetRadius, getVisibleUpgradeNodes,
  getWaveConfig, soulReward,
} from './gameLogic.js';

const COLORS = {
  night: 0x080b12, stone: 0x20272b, stoneLight: 0x2d3938, stoneDark: 0x151b20,
  moss: 0x4b705a, bone: 0xe8d8af, boneShade: 0x9d8969, green: 0x69d481,
  greenDark: 0x246b58, mint: 0xbaffc3, gold: 0xf4c76b, danger: 0xff776e,
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function paintPolygon(graphics, points, color, alpha = 1, stroke = null, lineWidth = 1, strokeAlpha = 1) {
  const path = points.map(([x, y]) => ({ x, y }));
  graphics.fillStyle(color, alpha).fillPoints(path, true);
  if (stroke !== null) graphics.lineStyle(lineWidth, stroke, strokeAlpha).strokePoints(path, true);
}

class SlimeDungeonScene extends Phaser.Scene {
  constructor() { super('slime-dungeon'); }

  create() {
    this.meta = this.loadMeta();
    this.mass = 0;
    this.coins = 0;
    this.itemsFed = 0;
    this.wave = 1;
    this.bones = [];
    this.bonePiles = [];
    this.drag = null;
    this.isEnded = false;
    this.inBattle = false;
    this.nextBoneAt = this.time.now + getBoneSpawnInterval(this.mass, this.meta);
    this.nextWaveAt = this.time.now + 15000;

    this.drawCave();
    this.createAmbient();
    this.createHud();
    this.createSlime();
    this.createBonePiles();
    this.createInput();
    this.spawnInitialBones();
    this.updateHud();
    this.showToast('骨堆会自动产出骨片 · 把黄色描边骨片拖到史莱姆嘴边', 3400);
  }

  loadMeta() {
    try {
      return { ...emptyMeta(), ...JSON.parse(localStorage.getItem('slime-dungeon-meta') || '{}') };
    } catch { return emptyMeta(); }
  }

  saveMeta() { localStorage.setItem('slime-dungeon-meta', JSON.stringify(this.meta)); }

  drawCave() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.night);
    const terrain = this.add.graphics().setDepth(1);
    terrain.fillStyle(0x0d161e, 1).fillRect(28, 112, 1104, 570);

    // A single recessed arch gives the room a focal point without filling the
    // play area with equally loud stones.
    paintPolygon(terrain, [[310, 393], [310, 276], [333, 215], [390, 163], [474, 128], [580, 116], [686, 128], [770, 163], [827, 215], [850, 276], [850, 393]], 0x18252c, 1, 0x3b4a4d, 2, 0.72);
    paintPolygon(terrain, [[365, 393], [365, 288], [385, 235], [432, 194], [501, 166], [580, 156], [659, 166], [728, 194], [775, 235], [795, 288], [795, 393]], 0x101b23, 1, 0x26383d, 2, 0.82);
    paintPolygon(terrain, [[430, 393], [430, 297], [449, 250], [492, 216], [540, 198], [580, 193], [620, 198], [668, 216], [711, 250], [730, 297], [730, 393]], 0x0b141c, 1);

    // Heavy side buttresses frame the room and keep the center clear for play.
    paintPolygon(terrain, [[28, 147], [116, 132], [172, 165], [190, 393], [28, 415]], 0x1c292e, 1, 0x3c4b4c, 2, 0.68);
    paintPolygon(terrain, [[1132, 147], [1044, 132], [988, 165], [970, 393], [1132, 415]], 0x1c292e, 1, 0x3c4b4c, 2, 0.68);
    paintPolygon(terrain, [[47, 180], [91, 164], [128, 179], [138, 383], [65, 394]], 0x243338, 0.8);
    paintPolygon(terrain, [[1113, 180], [1069, 164], [1032, 179], [1022, 383], [1095, 394]], 0x243338, 0.8);

    paintPolygon(terrain, [[28, 386], [188, 366], [382, 380], [580, 365], [778, 380], [972, 366], [1132, 386], [1132, 682], [28, 682]], 0x202e30, 1, 0x425151, 1, 0.62);
    paintPolygon(terrain, [[177, 682], [306, 390], [482, 378], [444, 682]], 0x283837, 0.62, 0x40534d, 1, 0.3);
    paintPolygon(terrain, [[716, 682], [678, 378], [854, 390], [983, 682]], 0x17272b, 0.66, 0x40534d, 1, 0.3);
    paintPolygon(terrain, [[444, 682], [482, 378], [678, 378], [716, 682]], 0x263934, 0.7, 0x527064, 1, 0.34);
    paintPolygon(terrain, [[28, 594], [204, 570], [380, 588], [580, 568], [780, 588], [956, 570], [1132, 594], [1132, 682], [28, 682]], 0x182326, 0.54);

    terrain.lineStyle(2, 0x607068, 0.2);
    [[76, 473, 114, 457, 151, 466], [965, 478, 1002, 459, 1046, 469], [253, 621, 292, 606, 332, 613], [829, 621, 866, 607, 905, 614]].forEach((points) => {
      terrain.beginPath();
      terrain.moveTo(points[0], points[1]);
      for (let point = 2; point < points.length; point += 2) terrain.lineTo(points[point], points[point + 1]);
      terrain.strokePath();
    });

    const ceiling = this.add.graphics().setDepth(5);
    paintPolygon(ceiling, [[28, 112], [28, 143], [118, 129], [214, 150], [314, 120], [422, 144], [535, 116], [655, 145], [777, 121], [900, 151], [1023, 125], [1132, 142], [1132, 112]], 0x0c131b, 1, 0x36444a, 2, 0.8);
    [
      [[75, 124], [138, 126], [115, 184], [90, 194]],
      [[1047, 124], [1090, 129], [1073, 173], [1054, 176]],
    ].forEach((points) => paintPolygon(ceiling, points, 0x151e27, 1, 0x405057, 1, 0.58));

    this.add.line(28, 113, 0, 0, 1104, 0, 0x6f7d78, 0.52).setLineWidth(2).setDepth(7);
    this.add.line(28, 681, 0, 0, 1104, 0, 0x10161b, 0.9).setLineWidth(2).setDepth(7);
    this.add.rectangle(28, 424, 10, 530, 0x0b1116, 0.82).setDepth(7);
    this.add.rectangle(1132, 424, 10, 530, 0x0b1116, 0.82).setDepth(7);
  }

  createAmbient() {
    this.motes = [];
    for (let i = 0; i < 8; i += 1) {
      const mote = this.add.rectangle(110 + (i * 137) % 880, 203 + (i * 79) % 330, 2, i % 3 === 0 ? 7 : 4, i % 4 === 0 ? 0xe5c987 : 0x90c9a7, i % 3 === 0 ? 0.2 : 0.12)
        .setAngle(-22 + (i % 5) * 11).setDepth(4);
      this.motes.push(mote);
      this.tweens.add({ targets: mote, y: mote.y - 12 - (i % 4) * 5, alpha: 0.01, duration: 2900 + i * 110, delay: i * 160, repeat: -1, yoyo: true, ease: 'Sine.inOut' });
    }
    const moss = this.add.graphics().setDepth(4);
    moss.lineStyle(4, COLORS.moss, 0.45);
    [[42, 180, 74, 215], [1116, 188, 1098, 230]].forEach(([x1, y1, x2, y2]) => {
      moss.beginPath(); moss.moveTo(x1, y1); moss.lineTo(x1 + 10, y1 + 16); moss.lineTo(x2, y2); moss.strokePath();
    });
  }

  createHud() {
    const hud = this.add.container(0, 0).setDepth(20);
    const plate = this.add.graphics();
    paintPolygon(plate, [[28, 8], [1132, 8], [1132, 86], [1122, 96], [38, 96], [28, 86]], 0x0a121b, 0.97, 0x596a71, 2, 0.76);
    paintPolygon(plate, [[35, 15], [1125, 15], [1125, 22], [35, 22]], 0x21313b, 0.72);
    plate.lineStyle(1, 0x718087, 0.28);
    [242, 620, 874].forEach((x) => plate.strokeLineShape(new Phaser.Geom.Line(x, 18, x, 84)));
    hud.add(plate);
    hud.add(this.add.text(38, 23, '史莱姆地牢', { fontFamily: 'serif', fontSize: '25px', fontStyle: 'bold', color: '#f5efda' }));
    hud.add(this.add.text(39, 56, 'THE HUNGER BELOW', { fontFamily: 'sans-serif', fontSize: '9px', color: '#75858a', letterSpacing: 2 }));
    this.massText = this.add.text(270, 25, 'MASS  0', { fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#aaf2b2' });
    this.coinText = this.add.text(430, 30, '◆  0', { fontFamily: 'sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#f4cf7b' });
    hud.add([this.massText, this.coinText]);
    hud.add(this.add.text(640, 24, '地牢深处', { fontFamily: 'sans-serif', fontSize: '11px', color: '#778792' }));
    this.waveText = this.add.text(640, 47, '第 1 波 · 见习小队', { fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#e9e6cf' });
    this.timerText = this.add.text(895, 27, '袭击倒计时  15.0s', { fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#f4c76b' });
    this.powerText = this.add.text(895, 54, '来袭战力  70', { fontFamily: 'sans-serif', fontSize: '11px', color: '#9aaab1' });
    hud.add([this.waveText, this.timerText, this.powerText]);
    this.barBg = this.add.rectangle(1040, 82, 160, 7, 0x1d2b34).setStrokeStyle(1, 0x46555c, 0.72); this.barFill = this.add.rectangle(960, 82, 0, 5, 0xecae5e).setOrigin(0, 0.5);
    hud.add([this.barBg, this.barFill]);
    hud.add(this.add.text(909, 82, '准备', { fontFamily: 'sans-serif', fontSize: '9px', color: '#71848a', letterSpacing: 1 }).setOrigin(1, 0.5));
    const helpPlate = this.add.graphics().setDepth(18);
    paintPolygon(helpPlate, [[330, 672], [830, 672], [844, 683], [830, 695], [330, 695], [316, 683]], 0x091117, 0.9, 0x34464a, 1, 0.7);
    this.add.text(580, 683, '骨堆自动凝聚骨片 · 黄色描边道具可以拖给史莱姆', { fontFamily: 'sans-serif', fontSize: '12px', color: '#afbeb2' }).setOrigin(0.5).setDepth(19);
  }

  createSlime() {
    this.slime = this.add.container(580, 447).setDepth(11);
    this.slimeShadow = this.add.graphics().setDepth(7);
    paintPolygon(this.slimeShadow, [[-104, 503], [-61, 488], [-12, 482], [48, 486], [104, 502], [58, 515], [-24, 518], [-92, 511]], 0x060c10, 0.62);
    this.drawSlime();
    this.slimeBob = this.tweens.add({ targets: this.slime, y: 440, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.playSlimeBlink() });
    this.time.addEvent({ delay: 4300, loop: true, callback: () => this.playSlimeWiggle() });
  }

  drawSlime() {
    this.tweens.killTweensOf(this.slimeArt);
    this.slime.list.slice().forEach((child) => child.destroy());
    const scale = 1 + Math.min(0.8, this.mass / 280);
    const portrait = this.makeSlimeArt(scale);
    this.slime.add(portrait.root);
    this.slimeArt = portrait.root;
    this.slimeEyes = portrait.eyes;
    this.slimeGlints = portrait.glints;
    this.slimeMouth = portrait.mouth;
    this.slimeBaseScale = { x: scale, y: scale * 0.88 };
    this.slimeRadius = 52 * scale;
    this.startSlimeIdle();
  }

  makeSlimeArt(scale = 1) {
    const root = this.add.container(0, 0).setScale(scale, scale * 0.88);
    const shapes = this.add.graphics();
    paintPolygon(shapes, [[-78, 34], [-80, 6], [-70, -22], [-49, -49], [-14, -61], [22, -54], [53, -37], [75, -7], [70, 27], [49, 50], [15, 62], [-28, 58], [-62, 48]], 0x173f3c, 1, 0x091d20, 3);
    paintPolygon(shapes, [[-69, 30], [-71, 7], [-59, -20], [-40, -42], [-11, -52], [19, -46], [47, -30], [63, -4], [59, 22], [39, 42], [11, 51], [-24, 48], [-56, 40]], 0x62cf78, 1, 0x31745a, 2);
    paintPolygon(shapes, [[-51, 22], [-53, 0], [-38, -26], [-11, -36], [17, -31], [40, -13], [42, 10], [23, 31], [-7, 40], [-35, 32]], 0x9aef99, 0.72);
    paintPolygon(shapes, [[-13, -29], [-28, -7], [-42, 3], [-47, -8], [-35, -23]], 0xd8ffd2, 0.72);
    paintPolygon(shapes, [[31, -18], [49, -7], [53, 8], [46, 13], [39, -1]], 0x347d61, 0.36);
    const eyeA = this.add.ellipse(-22, 2, 13, 19, 0x102f30);
    const eyeB = this.add.ellipse(22, 2, 13, 19, 0x102f30);
    const glintA = this.add.circle(-20, -2, 3, 0xf4fff0);
    const glintB = this.add.circle(24, -2, 3, 0xf4fff0);
    const mouth = this.add.arc(0, 19, 18, 15, 165, false, 0x174b43, 0).setStrokeStyle(3, 0x174b43, 0.94);
    root.add([shapes, eyeA, eyeB, glintA, glintB, mouth]);
    return { root, eyes: [eyeA, eyeB], glints: [glintA, glintB], mouth };
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
    this.tweens.add({ targets: this.slimeMouth, scaleX: 1.36, scaleY: 1.6, duration: 90, yoyo: true, ease: 'Sine.inOut' });
  }

  createBonePiles() {
    this.bonePiles.push(this.createBonePile(142, 548, 1));
    if (this.meta.extraPile) this.bonePiles.push(this.createBonePile(1018, 548, -1));
    this.nextPileIndex = 0;
  }

  createBonePile(x, y, direction) {
    const root = this.add.container(x, y).setDepth(8);
    const visual = this.add.container(0, 0);
    const artGroup = this.add.container(0, 0).setScale(direction, 1);
    const shadow = this.add.graphics();
    paintPolygon(shadow, [[-78, 26], [-50, 18], [8, 17], [78, 26], [53, 39], [-38, 40]], 0x05090c, 0.68);
    const pileArt = this.add.graphics();
    const outline = this.add.graphics().setAlpha(0.78);
    const pileEdge = [[-79, 22], [-73, 2], [-59, -13], [-38, -20], [-22, -31], [4, -34], [24, -27], [46, -23], [64, -10], [76, 5], [81, 22], [61, 32], [27, 38], [-18, 38], [-54, 33]];
    const skullEdge = [[-24, -8], [-19, -23], [-7, -31], [10, -30], [22, -21], [26, -7], [20, 4], [12, 8], [10, 17], [-9, 17], [-11, 8], [-20, 4]];
    const pileBones = [[-59, 18, -28, -8], [25, 19, 58, -5], [-43, 24, 49, 10]];
    paintPolygon(pileArt, pileEdge, 0x202a29, 1, 0x59665f, 2, 0.64);
    paintPolygon(pileArt, [[-67, 20], [-55, 2], [-36, -10], [-10, -14], [17, -10], [43, -1], [68, 19], [51, 27], [13, 31], [-29, 30]], 0x39413b, 0.82);
    const outlinePileBone = (x1, y1, x2, y2) => {
      outline.lineStyle(11, 0xfffbef, 1).strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
      outline.fillStyle(0xfffbef, 1);
      [[x1 - 2, y1 + 2], [x1 + 2, y1 - 2], [x2 - 2, y2 + 2], [x2 + 2, y2 - 2]].forEach(([px, py]) => outline.fillCircle(px, py, 6));
    };
    pileBones.forEach((bone) => outlinePileBone(...bone));
    outline.lineStyle(7, 0xfffbef, 1).strokePoints(skullEdge.map(([px, py]) => ({ x: px, y: py })), true);
    const drawPileBone = (x1, y1, x2, y2) => {
      pileArt.lineStyle(7, COLORS.boneShade, 1).strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
      pileArt.lineStyle(4, COLORS.bone, 1).strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
      pileArt.fillStyle(COLORS.bone, 1);
      pileArt.fillCircle(x1 - 2, y1 + 2, 4);
      pileArt.fillCircle(x1 + 2, y1 - 2, 4);
      pileArt.fillCircle(x2 - 2, y2 + 2, 4);
        pileArt.fillCircle(x2 + 2, y2 - 2, 4);
    };
    pileBones.forEach((bone) => drawPileBone(...bone));
    paintPolygon(pileArt, skullEdge, COLORS.bone, 1, COLORS.boneShade, 2, 1);
    paintPolygon(pileArt, [[-15, -14], [-8, -18], [-2, -14], [-5, -7], [-12, -7]], 0x202726, 1);
    paintPolygon(pileArt, [[6, -14], [13, -18], [19, -13], [16, -7], [9, -7]], 0x202726, 1);
    paintPolygon(pileArt, [[-2, -5], [4, -5], [1, 1]], 0x746a55, 1);
    pileArt.lineStyle(1, 0x756a55, 0.8).strokeLineShape(new Phaser.Geom.Line(-7, 11, 8, 11));
    artGroup.add([shadow, outline, pileArt]);
    visual.add(artGroup);
    visual.add(this.add.text(0, 58, '骨堆 · 自动产出', { fontFamily: 'serif', fontSize: '14px', fontStyle: 'bold', color: '#fff4d8', stroke: '#0a1114', strokeThickness: 5 }).setOrigin(0.5));
    const timerText = this.add.text(0, 79, '骨片凝聚中', { fontFamily: 'sans-serif', fontSize: '10px', color: '#9ab4a4' }).setOrigin(0.5);
    visual.add(timerText);
    root.add(visual);
    return { root, artGroup, timerText, x, y, direction };
  }

  makeBoneArt(type = 'bone', size = 1) {
    const root = this.add.container(0, 0);
    if (type === 'adventurer') {
      const trophy = this.add.graphics();
      paintPolygon(trophy, [[-29, 17], [-29, -15], [-10, -28], [17, -23], [30, -4], [23, 18], [3, 29]], 0xd99b62, 1, 0xf3c957, 7);
      trophy.lineStyle(2, 0x553835, 0.9).strokePoints([[-29, 17], [-29, -15], [-10, -28], [17, -23], [30, -4], [23, 18], [3, 29]].map(([x, y]) => ({ x, y })), true);
      paintPolygon(trophy, [[-18, -6], [-7, -20], [10, -17], [21, -3], [9, 12], [-12, 15]], 0xf0c378, 1, 0x6d4937, 2);
      trophy.lineStyle(5, 0x794d3c, 1).strokeLineShape(new Phaser.Geom.Line(-24, 18, 28, -21));
      trophy.fillStyle(0xffdb79, 1).fillTriangle(-3, -5, 4, 3, -4, 4);
      root.add(trophy);
      return root;
    }
    const g = this.add.graphics();
    g.lineStyle(13, 0xf3c957, 1).strokeLineShape(new Phaser.Geom.Line(-19, 13, 19, -13));
    g.fillStyle(0xf3c957, 1);
    [[-22, 9], [-17, 16], [22, -9], [17, -16]].forEach(([x, y]) => g.fillCircle(x, y, 8));
    g.lineStyle(9, COLORS.boneShade, 1).strokeLineShape(new Phaser.Geom.Line(-19, 13, 19, -13));
    g.fillStyle(COLORS.boneShade, 1);
    [[-22, 9], [-17, 16], [22, -9], [17, -16]].forEach(([x, y]) => g.fillCircle(x, y, 6));
    g.lineStyle(6, COLORS.bone, 1).strokeLineShape(new Phaser.Geom.Line(-19, 13, 19, -13));
    g.fillStyle(COLORS.bone, 1);
    [[-22, 9], [-17, 16], [22, -9], [17, -16]].forEach(([x, y]) => g.fillCircle(x, y, 4.5));
    g.lineStyle(1.5, COLORS.boneShade, 0.72);
    g.strokeLineShape(new Phaser.Geom.Line(-5, 5, 2, 9));
    g.strokeLineShape(new Phaser.Geom.Line(7, -7, 13, -11));
    root.add(g).setScale(size);
    return root;
  }

  spawnInitialBones() {
    [-18, 24, -31, 15].forEach((angle) => {
      const point = this.getBoneDropPoint();
      if (point) this.spawnBone('bone', point.x, point.y, { angle });
    });
  }

  getBoneDropPoint(sourcePile = this.bonePiles[0]) {
    const blockers = [
      ...this.bonePiles.map((pile) => ({ x: pile.x, y: pile.y, radius: 116 })),
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
    bone.foodData = type === 'bone' ? { ...FOOD.bone, value: getBoneValue(this.meta) } : FOOD[type];
    bone.homeX = x; bone.homeY = y; bone.isSettled = !options.fromPile; bone.consumed = false; bone.wasMoved = false;
    bone.add(this.makeBoneArt(type, type === 'bone' ? 0.66 : 0.92));
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
      const chip = this.add.polygon(bone.x, bone.y + 12, [0, -3, 2, 0, 0, 3, -2, 0], 0xf2c95d, 0.88).setDepth(12);
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
      this.setSlimeHungry(true);
      this.showToast('把骨头拖到史莱姆的嘴边', 1000);
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.drag) return;
      if (pointer.id !== this.drag.pointerId || !pointer.isDown) return;
      if (this.isEnded || this.inBattle) { this.cancelDrag(); return; }
      const { bone } = this.drag;
      if (Math.hypot(pointer.x - this.drag.startX, pointer.y - this.drag.startY) > 9) this.drag.moved = true;
      bone.x = clamp(pointer.x, ARENA.left + 38, ARENA.right - 38);
      bone.y = clamp(pointer.y, ARENA.top + 32, ARENA.bottom - 52);
    });
    this.input.on('pointerup', (pointer) => {
      if (!this.drag || pointer.id !== this.drag.pointerId) return;
      const { bone, moved } = this.drag; this.drag = null; bone.setScale(1); this.setSlimeHungry(false);
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
      this.returnBone(bone, false);
    }
  }

  returnBone(bone, showHint = true) {
    if (!bone.active || bone.consumed) return;
    bone.wasMoved = false;
    bone.setDepth(10);
    this.tweens.add({ targets: bone, x: bone.homeX, y: bone.homeY, angle: 0, duration: 420, ease: 'Back.out', onComplete: () => this.tweenBoneIdle(bone) });
    if (showHint) this.showToast('碎骨太远了，拖到史莱姆嘴边', 1200);
  }

  feedBone(bone) {
    if (!bone.active || bone.consumed || this.isEnded || this.inBattle || !bone.isSettled) return;
    if (!canConsume(this.mass, bone.foodData.value)) {
      this.returnBone(bone); this.showToast('史莱姆还太小，先多吃几根骨头', 1500); return;
    }
    bone.consumed = true;
    const growth = calculateGrowth(bone.foodData.value, this.meta);
    this.bones = this.bones.filter((item) => item !== bone);
    this.tweens.add({ targets: bone, x: this.slime.x, y: this.slime.y - 4, scale: 0.08, alpha: 0, duration: 360, ease: 'Back.in', onComplete: () => bone.destroy() });
    this.mass += growth; this.coins += growth;
    this.itemsFed += 1;
    this.drawSlime();
    this.playSlimeChew();
    this.createFeedBurst(bone.foodData.color);
    this.updateHud();
    this.showToast(`${bone.foodData.name} 被吞噬  ·  Mass +${growth}  ·  ◆ +${growth}`, 1150);
  }

  createFeedBurst(color) {
    for (let i = 0; i < 10; i += 1) {
      const spark = this.add.polygon(this.slime.x, this.slime.y - 18, [0, -5, 4, 0, 0, 5, -4, 0], color, 0.9).setDepth(17);
      this.tweens.add({ targets: spark, x: spark.x + Phaser.Math.Between(-86, 86), y: spark.y + Phaser.Math.Between(-60, 12), alpha: 0, scale: 0.3, duration: 420 + i * 20, onComplete: () => spark.destroy() });
    }
  }

  createPileBurst(pile) {
    for (let i = 0; i < 8; i += 1) {
      const chip = this.add.polygon(pile.x + Phaser.Math.Between(-38, 38), pile.y + Phaser.Math.Between(-20, 10), [0, -3, 3, 0, 0, 3, -3, 0], COLORS.bone, 0.9).setDepth(16);
      this.tweens.add({
        targets: chip,
        x: chip.x + Phaser.Math.Between(-50, 58),
        y: chip.y + Phaser.Math.Between(-64, -15),
        alpha: 0,
        angle: Phaser.Math.Between(-110, 110),
        duration: 380 + i * 25,
        ease: 'Cubic.out',
        onComplete: () => chip.destroy(),
      });
    }
  }

  update(time) {
    if (this.isEnded) return;
    const pileRemaining = Math.max(0, (this.nextBoneAt - time) / 1000).toFixed(1);
    this.bonePiles.forEach((pile) => pile.timerText.setText(`下一枚骨片  ${pileRemaining}s`));
    if (!this.inBattle && time >= this.nextBoneAt && this.bones.length < 9) {
      const sourcePile = this.bonePiles[this.nextPileIndex % this.bonePiles.length];
      const point = this.getBoneDropPoint(sourcePile);
      if (point) {
        this.spawnBone('bone', point.x, point.y, { fromPile: true, sourcePile });
        this.pileBurst(sourcePile);
        this.nextPileIndex += 1;
      }
      this.nextBoneAt = time + getBoneSpawnInterval(this.mass, this.meta);
    }
    const config = getWaveConfig(this.wave);
    const remaining = Math.max(0, (this.nextWaveAt - time) / 1000);
    this.timerText.setText(this.inBattle ? '袭击中 · 史莱姆自动迎战' : `袭击倒计时  ${remaining.toFixed(1)}s`);
    this.timerText.setColor(remaining < 5 && !this.inBattle ? '#ff776e' : '#f4c76b');
    this.barFill.width = 160 * (this.inBattle ? 1 : clamp(1 - remaining / config.duration, 0, 1));
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
    const veil = this.add.rectangle(580, 360, WIDTH, HEIGHT, 0x05080d, 0);
    const leftSlat = this.add.graphics();
    const rightSlat = this.add.graphics();
    paintPolygon(leftSlat, [[0, 0], [676, 0], [426, HEIGHT], [0, HEIGHT]], 0x111c28, 0.98);
    paintPolygon(leftSlat, [[0, 104], [550, 0], [520, 56], [0, 164]], 0x6c3940, 0.82);
    paintPolygon(rightSlat, [[484, 0], [WIDTH, 0], [WIDTH, HEIGHT], [732, HEIGHT]], 0x17212d, 0.98);
    paintPolygon(rightSlat, [[638, HEIGHT], [WIDTH, 562], [WIDTH, 640], [589, HEIGHT]], 0x6c3940, 0.82);
    leftSlat.x = -690;
    rightSlat.x = 690;
    const title = this.add.text(580, 301, '遭 遇 ！', { fontFamily: 'serif', fontSize: '64px', fontStyle: 'bold', color: '#fff1c7', stroke: '#27151a', strokeThickness: 12 }).setOrigin(0.5).setAlpha(0);
    const subtitle = this.add.text(580, 367, config.title + '  ·  来袭战力 ' + formatNumber(config.power), { fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#d8e3e1', letterSpacing: 2 }).setOrigin(0.5).setAlpha(0);
    transition.add([veil, leftSlat, rightSlat, title, subtitle]);
    this.tweens.add({ targets: veil, alpha: 0.78, duration: 180 });
    this.tweens.add({ targets: leftSlat, x: 0, duration: 300, ease: 'Cubic.out' });
    this.tweens.add({ targets: rightSlat, x: 0, duration: 300, ease: 'Cubic.out' });
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

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x07111b, 1).fillRect(0, 0, WIDTH, HEIGHT);
    paintPolygon(backdrop, [[0, 0], [WIDTH, 0], [WIDTH, 192], [892, 153], [612, 188], [295, 144], [0, 190]], 0x172632, 1);
    paintPolygon(backdrop, [[0, 196], [210, 168], [433, 222], [699, 175], [955, 226], [WIDTH, 186], [WIDTH, 458], [0, 458]], 0x10202a, 1);
    paintPolygon(backdrop, [[0, 482], [184, 414], [404, 465], [610, 423], [807, 470], [1018, 424], [WIDTH, 465], [WIDTH, HEIGHT], [0, HEIGHT]], 0x0a151d, 1);
    paintPolygon(backdrop, [[0, 469], [154, 431], [303, 461], [445, 436], [587, 464], [741, 431], [932, 466], [WIDTH, 426], [WIDTH, 534], [0, 548]], 0x24353b, 0.78, 0x49605c, 1, 0.52);
    battle.add(backdrop);

    const header = this.add.container(580, 54);
    header.add(this.add.rectangle(0, 0, 600, 54, 0x0b141d, 0.94).setStrokeStyle(1, 0x596a6c, 0.82));
    header.add(this.add.text(0, -10, '地牢遭遇战', { fontFamily: 'serif', fontSize: '22px', fontStyle: 'bold', color: '#f7edcf' }).setOrigin(0.5));
    header.add(this.add.text(0, 13, config.title + '  ·  战力 ' + formatNumber(config.power), { fontFamily: 'sans-serif', fontSize: '11px', color: '#aebec0', letterSpacing: 1 }).setOrigin(0.5));
    battle.add(header);

    const leftPlatform = this.add.graphics();
    paintPolygon(leftPlatform, [[116, 494], [265, 446], [452, 470], [512, 520], [397, 548], [206, 536]], 0x1d4d4b, 0.95, 0x77a582, 2, 0.72);
    paintPolygon(leftPlatform, [[177, 504], [279, 476], [422, 492], [449, 513], [377, 526], [230, 521]], 0x40705f, 0.34);
    const rightPlatform = this.add.graphics();
    paintPolygon(rightPlatform, [[651, 501], [770, 454], [1001, 461], [1080, 512], [984, 549], [749, 539]], 0x4a3543, 0.96, 0xa06d69, 2, 0.74);
    paintPolygon(rightPlatform, [[718, 506], [810, 480], [989, 484], [1030, 509], [957, 526], [784, 520]], 0x7d5360, 0.3);
    battle.add([leftPlatform, rightPlatform]);

    const slime = this.createBattleSlime(315, 401, 1.62);
    const party = this.createAdventurerParty(877, 405, config.wave);
    battle.add([slime.root, party.root]);

    const playerCard = this.createBattleCard(battle, 197, 142, '黏液核心', 'Mass ' + formatNumber(this.mass), 0x65d682, 0x153b36);
    const enemyName = config.wave === 1 ? '木剑见习者' : '冒险者小队';
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

  createBattleCard(battle, x, y, label, detail, color, fillColor) {
    const card = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 286, 68, 0x0b141c, 0.92).setStrokeStyle(1, color, 0.8);
    const labelText = this.add.text(-124, -20, label, { fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#edf3e7' });
    const detailText = this.add.text(-124, 1, detail, { fontFamily: 'sans-serif', fontSize: '10px', color: '#9bacaf' });
    const barBg = this.add.rectangle(0, 23, 246, 10, 0x22313a, 1);
    const barFill = this.add.rectangle(-123, 23, 246, 6, color, 1).setOrigin(0, 0.5);
    const hpText = this.add.text(123, 1, '100 / 100', { fontFamily: 'sans-serif', fontSize: '10px', color: '#d9e6df' }).setOrigin(1, 0);
    card.add([bg, labelText, detailText, barBg, barFill, hpText]);
    battle.add(card);
    return { card, barFill, hpText };
  }

  createBattleTimeline(battle, wave) {
    const panel = this.add.container(580, 618);
    panel.add(this.add.rectangle(0, 0, 1012, 112, 0x0a121a, 0.96).setStrokeStyle(1, 0x44575c, 0.88));
    panel.add(this.add.text(-472, -43, '行动竞速', { fontFamily: 'serif', fontSize: '17px', fontStyle: 'bold', color: '#f4e9cf' }));
    const actionText = this.add.text(-292, -42, '所有单位在同一条行动轨上推进', { fontFamily: 'sans-serif', fontSize: '12px', color: '#9db5ad' });
    panel.add(actionText);

    const startX = -336;
    const width = 738;
    const track = this.add.rectangle(startX + width / 2, 12, width, 18, 0x1b2b33, 1).setStrokeStyle(1, 0x52666a, 0.9);
    const finish = this.add.graphics();
    finish.lineStyle(2, 0xf2dfab, 0.9);
    finish.beginPath(); finish.moveTo(startX + width, -4); finish.lineTo(startX + width, 29); finish.strokePath();
    panel.add([
      this.add.text(startX - 32, 4, '起跑', { fontFamily: 'sans-serif', fontSize: '10px', color: '#839797' }).setOrigin(0.5),
      this.add.text(startX + width + 31, 4, '行动', { fontFamily: 'sans-serif', fontSize: '10px', color: '#f1db9b' }).setOrigin(0.5),
      track,
      finish,
    ]);

    const createRacer = (key, label, color, progress, labelY) => {
      const token = this.add.container(startX + width * progress, 12);
      token.add(this.add.polygon(0, 0, [0, -10, 9, -4, 9, 5, 0, 10, -9, 5, -9, -4], 0x0b1419, 1).setStrokeStyle(1, 0xf5f0d5, 0.74));
      token.add(this.add.polygon(0, 0, [0, -6, 6, -3, 6, 3, 0, 6, -6, 3, -6, -3], color, 1));
      token.add(this.add.text(0, labelY, label, { fontFamily: 'sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#e9efe1', stroke: '#091014', strokeThickness: 3 }).setOrigin(0.5));
      panel.add(token);
      return { key, label, color, token, progress, startX, width };
    };
    const racerStyles = {
      slime: ['史莱姆', 0x6edc8d, wave === 1 ? 0.12 : 0.09, -24],
      rookie: ['木剑', 0xd89b65, 0.54, 28],
      guard: ['盾卫', 0xe8a477, 0.26, 28],
      archer: ['弓手', 0xd8c46e, 0.43, -24],
      oracle: ['术士', 0xbc91e6, 0.58, 28],
    };
    const roster = ['slime', ...getBattleRacers(wave)].map((key) => [key, ...racerStyles[key]]);
    const racers = Object.fromEntries(roster.map(([key, label, color, progress, labelY]) => (
      [key, createRacer(key, label, color, progress, labelY)]
    )));
    battle.add(panel);
    return { racers, actionText };
  }

  createBattleSlime(x, y, scale) {
    const root = this.add.container(x, y);
    root.baseX = x;
    root.baseY = y;
    const shadow = this.add.graphics();
    paintPolygon(shadow, [[-126, 78], [-68, 59], [10, 56], [122, 75], [70, 93], [-41, 97], [-114, 89]], 0x050a0e, 0.66);
    const portrait = this.makeSlimeArt(scale);
    root.add([shadow, portrait.root]);
    return { root, art: portrait.root, baseX: x, baseY: y };
  }

  createAdventurerParty(x, y, wave) {
    const root = this.add.container(x, y);
    const shadow = this.add.graphics();
    const isRookie = wave === 1;
    paintPolygon(shadow, isRookie
      ? [[-70, 77], [-29, 58], [33, 57], [74, 78], [36, 96], [-43, 96]]
      : [[-165, 77], [-101, 57], [-30, 53], [69, 58], [161, 78], [91, 96], [-66, 98], [-151, 88]], 0x050a0e, 0.68);
    root.add(shadow);
    const figures = {};
    const layout = isRookie
      ? [['rookie', 0, -7, 1.54]]
      : [
        ['archer', -98, 5, 1.06],
        ['guard', 0, -9, 1.32],
        ['oracle', 100, 4, 1.07],
      ];
    layout.forEach(([role, offsetX, offsetY, scale]) => {
      const figure = this.makeAdventurerFigure(offsetX, offsetY, role, scale);
      figures[role] = figure;
      root.add(figure);
    });
    root.add(this.add.text(0, 90, isRookie ? '木剑见习者' : '王国讨伐队', { fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#f0d7c0', stroke: '#25151d', strokeThickness: 4 }).setOrigin(0.5));
    return { root, figures, baseX: x, baseY: y };
  }

  makeAdventurerFigure(x, y, role, scale) {
    if (role === 'rookie') return this.makeRookieFigure(x, y, scale);
    const figure = this.add.container(x, y).setScale(scale);
    figure.baseX = x;
    figure.baseY = y;
    const art = this.add.graphics();
    const palettes = {
      rookie: { cloak: 0x765844, trim: 0xd8b782, hood: 0x4e382f, weapon: 0x8a552f, skin: 0xd7a178 },
      archer: { cloak: 0x526f69, trim: 0xd7cc7a, hood: 0x263f43, weapon: 0xd9b36e, skin: 0xd8a176 },
      guard: { cloak: 0x784b43, trim: 0xd8ad84, hood: 0x393b48, weapon: 0xcfd9d2, skin: 0xc98e69 },
      oracle: { cloak: 0x645477, trim: 0xd1b3e7, hood: 0x312742, weapon: 0xbde7dd, skin: 0xd7a77f },
    };
    const palette = palettes[role];
    if (role === 'rookie') {
      paintPolygon(art, [[20, -42], [27, -47], [37, 16], [32, 27], [26, 18]], 0x9a6034, 1, 0x3e281d, 2);
      paintPolygon(art, [[20, -22], [36, -25], [39, -20], [23, -16]], 0x6c4128, 1, 0x35231c, 1);
      paintPolygon(art, [[-28, -10], [-42, 1], [-39, 22], [-25, 33], [-12, 21], [-14, 0]], 0x604735, 1, 0x241c1a, 2);
      paintPolygon(art, [[-32, -2], [-24, -7], [-17, 2], [-20, 18], [-30, 23], [-36, 15]], 0x987353, 0.86, 0xd2ae77, 1);
    } else if (role === 'archer') {
      paintPolygon(art, [[-27, -23], [-39, -19], [-36, 14], [-25, 17]], 0x47372d, 1, 0x1b2024, 1);
      art.lineStyle(3, palette.weapon, 0.95);
      art.beginPath(); art.moveTo(22, -40); art.lineTo(34, -9); art.lineTo(22, 24); art.strokePath();
      art.lineStyle(1, 0xf4e4b5, 0.82).strokeLineShape(new Phaser.Geom.Line(22, -40, 22, 24));
      paintPolygon(art, [[-33, -26], [-24, -30], [-16, -5], [-28, -1]], 0x72574a, 1, 0x251f20, 1);
    } else if (role === 'guard') {
      art.lineStyle(4, palette.weapon, 0.94).strokeLineShape(new Phaser.Geom.Line(31, -44, 38, 24));
      paintPolygon(art, [[-31, -17], [-52, -5], [-49, 26], [-31, 38], [-13, 26], [-14, -6]], 0x3a5967, 1, 0xc6d6d0, 2);
      paintPolygon(art, [[-37, -8], [-27, -12], [-20, 2], [-25, 19], [-39, 13]], 0x63838b, 0.82);
    } else if (role === 'oracle') {
      art.lineStyle(4, palette.weapon, 0.94).strokeLineShape(new Phaser.Geom.Line(31, -48, 31, 27));
      paintPolygon(art, [[31, -60], [40, -49], [31, -38], [22, -49]], 0xb9e7df, 1, 0x536e72, 1);
      paintPolygon(art, [[-34, 6], [-21, -3], [-12, 14], [-28, 23]], 0x8c6fa8, 0.88, 0x382947, 1);
    }
    paintPolygon(art, [[-15, 39], [-10, 10], [-1, 9], [-1, 41]], 0x202832, 1, 0x0b1117, 1);
    paintPolygon(art, [[4, 41], [5, 9], [14, 10], [20, 38]], 0x202832, 1, 0x0b1117, 1);
    paintPolygon(art, [[-25, 27], [-21, -7], [-10, -25], [12, -26], [26, -4], [23, 29], [3, 40], [-18, 35]], palette.cloak, 1, 0x1d222c, 2);
    paintPolygon(art, [[-16, 9], [-12, -17], [11, -18], [18, 10], [8, 23], [-8, 21]], palette.trim, 0.82, 0x2b2631, 1);
    paintPolygon(art, [[-10, -34], [-7, -46], [8, -47], [14, -36], [8, -25], [-7, -25]], palette.skin, 1, 0x593d39, 1);
    paintPolygon(art, [[-17, -35], [-10, -55], [9, -56], [19, -35], [10, -23], [-10, -23]], palette.hood, 1, 0x191d27, 2);
    paintPolygon(art, [[-6, -34], [0, -37], [7, -34], [5, -29], [-5, -29]], 0xf6e8cf, 0.82);
    if (role === 'rookie') {
      paintPolygon(art, [[-20, -12], [-31, 1], [-21, 10], [-10, 1]], palette.trim, 0.9, 0x2b2630, 1);
      paintPolygon(art, [[-6, 0], [1, -6], [8, 0], [1, 7]], 0xf1d38a, 0.88);
    } else if (role === 'guard') {
      paintPolygon(art, [[-16, -41], [-5, -52], [7, -51], [17, -40], [9, -31], [-9, -31]], 0x858f99, 1, 0x252b34, 2);
      paintPolygon(art, [[-7, -43], [0, -48], [8, -43], [5, -37], [-5, -37]], 0xc9d5d0, 0.82);
      paintPolygon(art, [[-20, -10], [-31, 1], [-21, 10], [-10, 1]], palette.trim, 0.9, 0x2b2630, 1);
    } else if (role === 'oracle') {
      paintPolygon(art, [[-23, -16], [-31, 0], [-20, 12], [-9, -1]], palette.trim, 0.92, 0x2b2630, 1);
      paintPolygon(art, [[-4, 1], [1, -5], [6, 1], [1, 7]], 0xf1dcff, 0.9);
    } else {
      paintPolygon(art, [[-6, 0], [1, -6], [8, 0], [1, 7]], 0xf2dc8e, 0.88);
    }
    figure.add(art);
    return figure;
  }

  makeRookieFigure(x, y, scale) {
    const figure = this.add.container(x, y).setScale(scale);
    figure.baseX = x;
    figure.baseY = y;
    const art = this.add.graphics();
    const ink = 0x211b1b;

    // Cape and equipment sit behind the body so the silhouette reads clearly.
    paintPolygon(art, [[-24, -24], [-39, -4], [-37, 35], [-18, 48], [2, 35], [0, -19]], 0x49372f, 1, ink, 3);
    paintPolygon(art, [[25, -45], [33, -49], [45, 16], [39, 29], [32, 18]], 0x9d6234, 1, ink, 3);
    paintPolygon(art, [[24, -23], [42, -27], [45, -20], [27, -15]], 0x704329, 1, ink, 2);

    paintPolygon(art, [[-18, 24], [-13, 8], [-2, 10], [-3, 48], [-18, 50], [-24, 43]], 0x2f3440, 1, ink, 2);
    paintPolygon(art, [[4, 10], [15, 9], [23, 42], [16, 50], [2, 48]], 0x343947, 1, ink, 2);
    paintPolygon(art, [[-23, 42], [-4, 42], [-3, 51], [-19, 54], [-27, 50]], 0x211f24, 1, ink, 2);
    paintPolygon(art, [[3, 42], [23, 40], [28, 48], [18, 54], [2, 51]], 0x211f24, 1, ink, 2);

    paintPolygon(art, [[-24, 19], [-22, -13], [-11, -30], [12, -30], [26, -10], [23, 23], [10, 35], [-10, 34]], 0x7a5942, 1, ink, 3);
    paintPolygon(art, [[-14, -17], [11, -19], [18, 13], [8, 26], [-9, 25], [-17, 10]], 0xc49a67, 0.92, 0x5a4032, 2);
    paintPolygon(art, [[-23, 4], [-38, 13], [-34, 29], [-21, 25], [-12, 10]], 0xa87951, 1, ink, 2);
    paintPolygon(art, [[21, -7], [34, 3], [34, 18], [23, 23], [14, 9]], 0xad7b50, 1, ink, 2);
    paintPolygon(art, [[-24, 13], [22, 12], [22, 21], [-22, 23]], 0x4d3328, 1, ink, 2);
    paintPolygon(art, [[-3, 12], [7, 12], [8, 22], [-3, 23]], 0xd6b06c, 1, 0x5f432d, 1);

    paintPolygon(art, [[-42, 5], [-55, 15], [-52, 36], [-38, 47], [-24, 34], [-25, 13]], 0x5d4939, 1, ink, 3);
    paintPolygon(art, [[-46, 13], [-37, 8], [-29, 17], [-31, 34], [-42, 39], [-50, 31]], 0x9b794f, 1, 0xd2aa6b, 2);
    paintPolygon(art, [[-40, 19], [-34, 14], [-29, 20], [-31, 29], [-39, 33], [-45, 28]], 0x6e533c, 1);

    paintPolygon(art, [[-16, -43], [-10, -54], [6, -57], [19, -48], [21, -34], [13, -24], [-6, -23], [-18, -31]], 0xd3a079, 1, ink, 3);
    paintPolygon(art, [[-20, -43], [-13, -58], [-2, -64], [7, -59], [15, -63], [23, -49], [18, -39], [10, -47], [5, -39], [-3, -48], [-10, -38]], 0x50372f, 1, ink, 2);
    paintPolygon(art, [[-10, -35], [-5, -38], [-1, -35], [-4, -32], [-9, -32]], 0x2d2424, 1);
    paintPolygon(art, [[7, -35], [12, -38], [16, -34], [12, -31], [8, -31]], 0x2d2424, 1);
    art.lineStyle(2, 0x70483b, 0.9).strokeLineShape(new Phaser.Geom.Line(-2, -26, 8, -25));
    figure.add(art);
    return figure;
  }

  updateBattleUi() {
    if (!this.battleState) return;
    const state = this.battleState;
    const fillWidth = 246;
    state.cards.slime.barFill.width = fillWidth * (state.slimeHp / 100);
    state.cards.enemy.barFill.width = fillWidth * (state.enemyHp / 100);
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
      this.time.delayedCall(480, () => this.playBattleTurn(index + 1));
    }));
  }

  runBattleRace(racerKey, complete) {
    const state = this.battleState;
    const active = state.racers[racerKey];
    state.actionText.setText('行动：' + active.label + ' 率先抵达行动点');
    Object.values(state.racers).forEach((racer, index) => {
      const remaining = 1 - racer.progress;
      racer.nextProgress = racer === active
        ? 1
        : Math.min(0.91, racer.progress + remaining * (0.16 + index * 0.025));
      this.tweens.add({
        targets: racer.token,
        x: racer.startX + racer.width * racer.nextProgress,
        scaleX: racer === active ? 1.22 : 1,
        scaleY: racer === active ? 1.22 : 1,
        duration: 560,
        ease: 'Sine.inOut',
      });
    });
    this.time.delayedCall(630, () => {
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
  }

  performBattleStrike(turn, complete) {
    const state = this.battleState;
    if (!state || !this.battle?.active) return;
    const attacker = state.actors[turn.actor];
    const defenderKey = turn.actor === 'slime' ? 'enemy' : 'slime';
    const defender = state.actors[defenderKey];
    const direction = turn.actor === 'slime' ? 1 : -1;
    const attackerVisual = turn.actor === 'enemy' ? attacker.figures[turn.racer] : attacker.root;
    this.tweens.add({
      targets: attackerVisual,
      x: attackerVisual.baseX + direction * 42,
      y: attackerVisual.baseY - 8,
      duration: 150,
      yoyo: true,
      ease: 'Cubic.out',
    });
    this.time.delayedCall(155, () => {
      if (!this.battle?.active) return;
      if (defenderKey === 'enemy') state.enemyHp = Math.max(0, state.enemyHp - turn.damage);
      else state.slimeHp = Math.max(0, state.slimeHp - turn.damage);
      this.tweens.add({ targets: defender.root, x: defender.baseX - direction * 13, angle: direction * 3, duration: 72, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
      this.createBattleImpact(defender.baseX - direction * 22, defender.baseY - 22, turn.actor === 'slime' ? 0x9af5a2 : 0xf3b38a, turn.damage);
      this.updateBattleUi();
      this.time.delayedCall(460, () => {
        this.resetBattleRacer(turn.racer);
        complete();
      });
    });
  }

  createBattleImpact(x, y, color, damage) {
    const value = this.add.text(x, y - 34, '-' + damage, { fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#fff1d5', stroke: '#20131a', strokeThickness: 5 }).setOrigin(0.5).setDepth(46);
    this.tweens.add({ targets: value, y: value.y - 26, alpha: 0, duration: 480, ease: 'Cubic.out', onComplete: () => value.destroy() });
    for (let i = 0; i < 7; i += 1) {
      const spark = this.add.polygon(x, y, [0, -5, 4, 0, 0, 5, -4, 0], color, 0.96).setDepth(46);
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
    this.massText?.setText(`MASS  ${formatNumber(this.mass)}`);
    this.coinText?.setText(`◆  ${formatNumber(this.coins)}`);
    const config = getWaveConfig(this.wave);
    this.waveText?.setText(`第 ${this.wave} 波 · ${config.title}`);
    this.powerText?.setText(`来袭战力  ${formatNumber(config.power)}  ·  你的战力  ${formatNumber(this.mass)}`);
  }

  showToast(message, duration = 1400) {
    this.toastText?.destroy();
    this.toastText = this.add.text(580, 620, message, { fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff1cf', backgroundColor: '#0d1519e8', padding: { left: 20, right: 20, top: 10, bottom: 10 }, stroke: '#5e7863', strokeThickness: 1 }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: duration, duration: 420, onComplete: () => this.toastText?.destroy() });
  }

  showResult(config) {
    const earned = soulReward(this.mass, this.wave);
    this.meta.soul += earned; this.saveMeta();
    const overlay = this.add.container(0, 0).setDepth(50);
    overlay.add(this.add.rectangle(580, 360, WIDTH, HEIGHT, 0x05070b, 0.84));
    const panel = this.add.graphics();
    paintPolygon(panel, [[238, 128], [922, 128], [948, 154], [948, 568], [922, 594], [238, 594], [212, 568], [212, 154]], 0x111b25, 0.98, 0xb98558, 2, 0.95);
    overlay.add(panel);
    overlay.add(this.add.text(580, 178, '本 局 结 算', { fontFamily: 'serif', fontSize: '38px', fontStyle: 'bold', color: '#f5efda', letterSpacing: 5 }).setOrigin(0.5));
    overlay.add(this.add.text(580, 226, `止步于第 ${this.wave} 波 · ${config.title}`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#99aab0' }).setOrigin(0.5));
    const stats = [
      ['最终 MASS', formatNumber(this.mass), 0x9be7a8],
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
    const overlay = this.add.container(0, 0).setDepth(55);
    this.upgradeOverlay = overlay;
    overlay.add(this.add.rectangle(580, 360, WIDTH, HEIGHT, 0x070b11, 0.97));
    const frame = this.add.graphics();
    paintPolygon(frame, [[42, 34], [1118, 34], [1138, 54], [1138, 666], [1118, 686], [42, 686], [22, 666], [22, 54]], 0x101a24, 1, 0x6e7774, 2, 0.85);
    overlay.add(frame);
    overlay.add(this.add.text(72, 62, '黏液进化树', { fontFamily: 'serif', fontSize: '30px', fontStyle: 'bold', color: '#f3ead2' }));
    overlay.add(this.add.text(74, 105, '购买前置节点后，后续能力才会从黑暗中显现。', { fontFamily: 'sans-serif', fontSize: '12px', color: '#81949a' }));
    overlay.add(this.add.text(1084, 72, `${this.meta.soul} ◆`, { fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#f2c867' }).setOrigin(1, 0.5));

    const branchX = { nutrition: 285, production: 580, extraPile: 875 };
    const levelY = { 1: 245, 2: 390, 3: 535 };
    const nodes = getVisibleUpgradeNodes(this.meta);
    const links = this.add.graphics();
    links.lineStyle(4, 0x50645e, 0.72);
    nodes.filter((node) => node.level > 1).forEach((node) => {
      const x = branchX[node.branch];
      links.strokeLineShape(new Phaser.Geom.Line(x, levelY[node.level] - 54, x, levelY[node.level - 1] + 54));
    });
    overlay.add(links);
    nodes.forEach((node) => this.addUpgradeTreeNode(overlay, node, branchX[node.branch], levelY[node.level]));
    overlay.add(this.makeButton(580, 642, 250, 44, '升级完成 · 重新进入', 0x396d56, () => this.scene.restart()));
  }

  addUpgradeTreeNode(overlay, node, x, y) {
    const purchased = (this.meta[node.branch] || 0) >= node.level;
    const affordable = this.meta.soul >= node.cost;
    const card = this.add.container(x, y);
    const shape = this.add.graphics();
    const fill = purchased ? 0x25483d : affordable ? 0x263b3b : 0x202b33;
    const edge = purchased ? 0x86d49a : affordable ? 0xd1aa61 : 0x536168;
    paintPolygon(shape, [[-112, -48], [92, -48], [112, -28], [112, 48], [-92, 48], [-112, 28]], fill, 1, edge, 2, 0.94);
    const hit = this.add.rectangle(0, 0, 224, 96, 0xffffff, 0.001);
    card.add([shape, hit]);
    card.add(this.add.text(-91, -31, node.name, { fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: purchased ? '#bff0c8' : '#eee6d2' }));
    card.add(this.add.text(-91, -4, node.desc, { fontFamily: 'sans-serif', fontSize: '11px', color: '#91a2a3', wordWrap: { width: 180 } }));
    card.add(this.add.text(91, 29, purchased ? '已掌握' : `${node.cost} ◆`, { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: purchased ? '#86d49a' : affordable ? '#f2c867' : '#8b9290' }).setOrigin(1, 0.5));
    if (!purchased) {
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => shape.setAlpha(0.82));
      hit.on('pointerout', () => shape.setAlpha(1));
      hit.on('pointerdown', () => this.buyUpgradeNode(node));
    }
    overlay.add(card);
  }

  buyUpgradeNode(node) {
    if (this.meta.soul < node.cost) { this.showToast(`魂晶不足，还需要 ${node.cost - this.meta.soul} 枚`, 1300); return; }
    this.meta.soul -= node.cost;
    this.meta[node.branch] = node.level;
    this.saveMeta();
    this.showUpgradeTree();
    this.showToast(`${node.name} 已掌握`, 1100);
  }

  makeButton(x, y, w, h, label, color, action) {
    const button = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, color).setStrokeStyle(1, 0xf4d38a, 0.84).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#fff4dc' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(12).color));
    bg.on('pointerout', () => bg.setFillStyle(color));
    bg.on('pointerdown', action); button.add([bg, text]); return button;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game',
  backgroundColor: '#080b12',
  render: { antialias: true, roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [SlimeDungeonScene],
});

export { SlimeDungeonScene, game };
