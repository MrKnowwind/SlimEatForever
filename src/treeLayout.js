function integer(value) {
  return Math.round(value);
}

export function clampTreeScale(value, min = 0.5, max = 1.35) {
  return Math.max(min, Math.min(max, value));
}

export function getPinchScale(startScale, startDistance, currentDistance) {
  if (startDistance <= 0) return clampTreeScale(startScale);
  return clampTreeScale(startScale * currentDistance / startDistance);
}

export function zoomTreeAtPoint({ x, y, scale, nextScale, pointer }) {
  const clampedScale = clampTreeScale(nextScale);
  const ratio = clampedScale / scale;
  return {
    x: pointer.x - (pointer.x - x) * ratio,
    y: pointer.y - (pointer.y - y) * ratio,
    scale: clampedScale,
  };
}

export function centerTreeInViewport(viewport, world, scale) {
  return {
    x: integer(viewport.x + (viewport.width - world.width * scale) / 2 - world.x * scale),
    y: integer(viewport.y + (viewport.height - world.height * scale) / 2 - world.y * scale),
  };
}

export function clampTreePan(transform, viewport, world, padding = 72) {
  const scaledWidth = world.width * transform.scale;
  const scaledHeight = world.height * transform.scale;
  const centered = centerTreeInViewport(viewport, world, transform.scale);
  const clampAxis = (value, viewportStart, viewportSize, worldStart, worldSize, centeredValue) => {
    if (worldSize <= viewportSize - padding * 2) return centeredValue;
    const min = viewportStart + viewportSize - padding - (worldStart * transform.scale + worldSize);
    const max = viewportStart + padding - worldStart * transform.scale;
    return Math.max(min, Math.min(max, value));
  };
  return {
    x: integer(clampAxis(transform.x, viewport.x, viewport.width, world.x, scaledWidth, centered.x)),
    y: integer(clampAxis(transform.y, viewport.y, viewport.height, world.y, scaledHeight, centered.y)),
    scale: transform.scale,
  };
}

export function getNodeAnchor(node, side) {
  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;
  const anchors = {
    top: { x: node.x, y: node.y - halfHeight },
    right: { x: node.x + halfWidth, y: node.y },
    bottom: { x: node.x, y: node.y + halfHeight },
    left: { x: node.x - halfWidth, y: node.y },
  };
  const anchor = anchors[side];
  return { x: integer(anchor.x), y: integer(anchor.y) };
}

export function buildVerticalJunction({ sources, targets }) {
  const sourceAnchors = sources.map((node) => getNodeAnchor(node, 'bottom'));
  const targetAnchors = targets.map((node) => getNodeAnchor(node, 'top'));
  const sourceY = Math.max(...sourceAnchors.map((anchor) => anchor.y));
  const targetY = Math.min(...targetAnchors.map((anchor) => anchor.y));
  const junction = {
    x: integer(targets.length === 1 ? targetAnchors[0].x : sourceAnchors[0].x),
    y: integer((sourceY + targetY) / 2),
  };
  const segments = [];
  const segmentKeys = new Set();
  const addSegment = (start, end) => {
    if (start.x === end.x && start.y === end.y) return;
    const a = `${start.x},${start.y}`;
    const b = `${end.x},${end.y}`;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (segmentKeys.has(key)) return;
    segmentKeys.add(key);
    segments.push({ start: { ...start }, end: { ...end } });
  };

  sourceAnchors.forEach((anchor) => {
    const sourceJunction = { x: anchor.x, y: junction.y };
    addSegment(anchor, sourceJunction);
    addSegment(sourceJunction, junction);
  });
  targetAnchors.forEach((anchor) => {
    const targetJunction = { x: anchor.x, y: junction.y };
    addSegment(junction, targetJunction);
    addSegment(targetJunction, anchor);
  });

  return { sourceAnchors, targetAnchors, junction, segments };
}
