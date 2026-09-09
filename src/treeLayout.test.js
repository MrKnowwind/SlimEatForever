import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVerticalJunction, clampTreeScale, getPinchScale, zoomTreeAtPoint } from './treeLayout.js';

test('技能树分叉使用节点边缘 Anchor 与同一个整数 Junction', () => {
  const source = { x: 410, y: 480, width: 96, height: 96 };
  const targets = [
    { x: 200, y: 580, width: 96, height: 96 },
    { x: 500, y: 580, width: 96, height: 96 },
    { x: 760, y: 580, width: 96, height: 96 },
  ];
  const layout = buildVerticalJunction({ sources: [source], targets });

  assert.deepEqual(layout.sourceAnchors, [{ x: 410, y: 528 }]);
  assert.deepEqual(layout.targetAnchors, [
    { x: 200, y: 532 }, { x: 500, y: 532 }, { x: 760, y: 532 },
  ]);
  assert.deepEqual(layout.junction, { x: 410, y: 530 });
  assert.ok(layout.segments.every(({ start, end }) =>
    Number.isInteger(start.x) && Number.isInteger(start.y)
    && Number.isInteger(end.x) && Number.isInteger(end.y)
    && (start.x === end.x || start.y === end.y)));
  assert.equal(new Set(layout.segments.map(({ start, end }) =>
    `${start.x},${start.y}:${end.x},${end.y}`)).size, layout.segments.length);
});

test('技能树汇合线从所有父节点底部连接到子节点顶部', () => {
  const sources = [
    { x: 290, y: 288, width: 96, height: 96 },
    { x: 530, y: 288, width: 96, height: 96 },
  ];
  const target = { x: 410, y: 480, width: 96, height: 96 };
  const layout = buildVerticalJunction({ sources, targets: [target] });

  assert.deepEqual(layout.sourceAnchors, [{ x: 290, y: 336 }, { x: 530, y: 336 }]);
  assert.deepEqual(layout.targetAnchors, [{ x: 410, y: 432 }]);
  assert.deepEqual(layout.junction, { x: 410, y: 384 });
});

test('技能树缩放受限且鼠标下的世界坐标保持不动', () => {
  assert.equal(clampTreeScale(0.2), 0.65);
  assert.equal(clampTreeScale(2), 1.35);

  const before = { x: 72, y: -18, scale: 0.8 };
  const pointer = { x: 640, y: 360 };
  const worldPoint = {
    x: (pointer.x - before.x) / before.scale,
    y: (pointer.y - before.y) / before.scale,
  };
  const after = zoomTreeAtPoint({ ...before, nextScale: 1.1, pointer });

  assert.equal(after.scale, 1.1);
  assert.ok(Math.abs((pointer.x - after.x) / after.scale - worldPoint.x) < 1e-9);
  assert.ok(Math.abs((pointer.y - after.y) / after.scale - worldPoint.y) < 1e-9);
});

test('双指距离按比例缩放技能树并服从缩放上下限', () => {
  assert.equal(getPinchScale(0.8, 100, 150), 1.2);
  assert.equal(getPinchScale(1.2, 100, 200), 1.35);
  assert.equal(getPinchScale(0.8, 100, 20), 0.65);
});
