import { Position } from "@xyflow/react";
import PF from "pathfinding";

const GRID_SIZE = 60;

/**
 * Smart routing with obstacle avoidance
 * Priority: Direct path > Simple elbow > A* around obstacles
 */
export function getSmartPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  nodes = [],
  excludeNodeIds = [],
}) {
  // Normalize node data
  const obstacles = nodes
    .filter((n) => {
      if (excludeNodeIds.includes(n.id)) return false;
      const w = n.width ?? n.measured?.width ?? n.computed?.width;
      const h = n.height ?? n.measured?.height ?? n.computed?.height;
      return w && h;
    })
    .map((n) => ({
      x: (n.positionAbsolute ?? n.position).x,
      y: (n.positionAbsolute ?? n.position).y,
      width: n.width ?? n.measured?.width ?? n.computed?.width ?? 200,
      height: n.height ?? n.measured?.height ?? n.computed?.height ?? 100,
    }));

  // Try simple elbow path first (most common case)
  const elbowPath = getElbowPath(
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  );
  if (!pathIntersectsObstacles(elbowPath, obstacles)) {
    return generateSmoothPath(elbowPath, 12);
  }

  // Fall back to A* pathfinding for complex cases
  return getAStarPath(
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    obstacles
  );
}

/**
 * Create a simple elbow path (1-2 turns max)
 * Considers relative positions for optimal routing
 */
function getElbowPath(sx, sy, sourcePos, tx, ty, targetPos) {
  const isSourceHorizontal =
    sourcePos === Position.Left || sourcePos === Position.Right;
  const isTargetHorizontal =
    targetPos === Position.Left || targetPos === Position.Right;
  const sourceGoesRight = sourcePos === Position.Right;
  const sourceGoesDown = sourcePos === Position.Bottom;
  const targetFromLeft = targetPos === Position.Left;
  const targetFromTop = targetPos === Position.Top;

  // Calculate differences
  const dx = tx - sx;
  const dy = ty - sy;

  // Case 1: Almost straight horizontal line
  if (Math.abs(dy) < 10 && isSourceHorizontal && isTargetHorizontal) {
    return [
      [sx, sy],
      [tx, ty],
    ];
  }

  // Case 2: Almost straight vertical line
  if (Math.abs(dx) < 10 && !isSourceHorizontal && !isTargetHorizontal) {
    return [
      [sx, sy],
      [tx, ty],
    ];
  }

  // Case 3: Source horizontal, target horizontal
  if (isSourceHorizontal && isTargetHorizontal) {
    // Determine if handles point toward each other naturally
    const sourcePointsRight = sourceGoesRight;
    const targetIsToRight = dx > 0;
    const targetFromLeftSide = targetFromLeft;

    // Ideal case: source points right AND target is to the right AND target has left handle
    // Or: source points left AND target is to the left AND target has right handle
    const idealPath =
      (sourcePointsRight && targetIsToRight && targetFromLeftSide) ||
      (!sourcePointsRight && !targetIsToRight && !targetFromLeftSide);

    if (idealPath) {
      // Simple S-curve or straight line
      const midX = sx + dx / 2;
      return [
        [sx, sy],
        [midX, sy],
        [midX, ty],
        [tx, ty],
      ];
    } else if (sourcePointsRight && targetIsToRight) {
      // Source going right, target is right but wrong side - go around
      const extension = 50;
      return [
        [sx, sy],
        [tx + extension, sy],
        [tx + extension, ty],
        [tx, ty],
      ];
    } else if (!sourcePointsRight && !targetIsToRight) {
      // Source going left, target is left but wrong side - go around
      const extension = 50;
      return [
        [sx, sy],
        [tx - extension, sy],
        [tx - extension, ty],
        [tx, ty],
      ];
    } else {
      // Source and target in opposite directions - use midpoint
      const midX = sx + dx / 2;
      return [
        [sx, sy],
        [midX, sy],
        [midX, ty],
        [tx, ty],
      ];
    }
  }

  // Case 4: Source horizontal, target vertical
  if (isSourceHorizontal && !isTargetHorizontal) {
    // L-shape: go horizontal first to align X, then vertical
    return [
      [sx, sy],
      [tx, sy],
      [tx, ty],
    ];
  }

  // Case 5: Source vertical, target horizontal
  if (!isSourceHorizontal && isTargetHorizontal) {
    // L-shape: go vertical first to align Y, then horizontal
    return [
      [sx, sy],
      [sx, ty],
      [tx, ty],
    ];
  }

  // Case 6: Source vertical, target vertical
  if (!isSourceHorizontal && !isTargetHorizontal) {
    const sourcePointsToTarget =
      (sourceGoesDown && dy > 0) || (!sourceGoesDown && dy < 0);
    const targetFacesSource =
      (targetFromTop && dy > 0) || (!targetFromTop && dy < 0);

    if (sourcePointsToTarget && targetFacesSource) {
      // S-curve through midpoint
      const midY = sy + dy / 2;
      return [
        [sx, sy],
        [sx, midY],
        [tx, midY],
        [tx, ty],
      ];
    } else {
      const midY = sy + dy / 2;
      return [
        [sx, sy],
        [sx, midY],
        [tx, midY],
        [tx, ty],
      ];
    }
  }

  // Default fallback
  return [
    [sx, sy],
    [tx, sy],
    [tx, ty],
  ];
}

/**
 * Check if a path intersects any obstacles
 */
function pathIntersectsObstacles(path, obstacles) {
  const padding = 10;

  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];

    for (const obs of obstacles) {
      const obsLeft = obs.x - padding;
      const obsRight = obs.x + obs.width + padding;
      const obsTop = obs.y - padding;
      const obsBottom = obs.y + obs.height + padding;

      // Check if line segment intersects obstacle rectangle
      if (
        lineIntersectsRect(x1, y1, x2, y2, obsLeft, obsTop, obsRight, obsBottom)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if line segment intersects rectangle
 */
function lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom) {
  // Horizontal line
  if (Math.abs(y1 - y2) < 1) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    return y1 >= top && y1 <= bottom && maxX >= left && minX <= right;
  }

  // Vertical line
  if (Math.abs(x1 - x2) < 1) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return x1 >= left && x1 <= right && maxY >= top && minY <= bottom;
  }

  return false;
}

/**
 * A* pathfinding for complex obstacle scenarios
 */
function getAStarPath(sx, sy, sourcePos, tx, ty, targetPos, obstacles) {
  // Calculate bounds
  let minX = Math.min(sx, tx) - 150;
  let maxX = Math.max(sx, tx) + 150;
  let minY = Math.min(sy, ty) - 150;
  let maxY = Math.max(sy, ty) + 150;

  obstacles.forEach((obs) => {
    minX = Math.min(minX, obs.x - 50);
    maxX = Math.max(maxX, obs.x + obs.width + 50);
    minY = Math.min(minY, obs.y - 50);
    maxY = Math.max(maxY, obs.y + obs.height + 50);
  });

  const width = Math.ceil((maxX - minX) / GRID_SIZE);
  const height = Math.ceil((maxY - minY) / GRID_SIZE);

  if (width > 500 || height > 500) {
    return generateSmoothPath(
      getElbowPath(sx, sy, sourcePos, tx, ty, targetPos),
      12
    );
  }

  const toGrid = (val, minVal) => Math.round((val - minVal) / GRID_SIZE);
  const fromGrid = (val, minVal) => val * GRID_SIZE + minVal;

  const grid = new PF.Grid(width, height);

  // Mark obstacles
  obstacles.forEach((obs) => {
    const padding = 10;
    const startX = Math.max(0, toGrid(obs.x - padding, minX));
    const startY = Math.max(0, toGrid(obs.y - padding, minY));
    const endX = Math.min(width - 1, toGrid(obs.x + obs.width + padding, minX));
    const endY = Math.min(
      height - 1,
      toGrid(obs.y + obs.height + padding, minY)
    );

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        grid.setWalkableAt(x, y, false);
      }
    }
  });

  const gridStartX = Math.max(0, Math.min(width - 1, toGrid(sx, minX)));
  const gridStartY = Math.max(0, Math.min(height - 1, toGrid(sy, minY)));
  const gridEndX = Math.max(0, Math.min(width - 1, toGrid(tx, minX)));
  const gridEndY = Math.max(0, Math.min(height - 1, toGrid(ty, minY)));

  grid.setWalkableAt(gridStartX, gridStartY, true);
  grid.setWalkableAt(gridEndX, gridEndY, true);

  const finder = new PF.AStarFinder({
    allowDiagonal: false,
    dontCrossCorners: true,
    heuristic: PF.Heuristic.manhattan,
  });

  let path = [];
  try {
    path = finder.findPath(gridStartX, gridStartY, gridEndX, gridEndY, grid);
  } catch {
    return generateSmoothPath(
      getElbowPath(sx, sy, sourcePos, tx, ty, targetPos),
      12
    );
  }

  if (path.length === 0) {
    return generateSmoothPath(
      getElbowPath(sx, sy, sourcePos, tx, ty, targetPos),
      12
    );
  }

  // Convert and simplify path
  const compressed = PF.Util.compressPath(path);
  let worldPath = compressed.map(([x, y]) => [
    fromGrid(x, minX),
    fromGrid(y, minY),
  ]);

  // Replace first and last points with exact positions
  worldPath[0] = [sx, sy];
  worldPath[worldPath.length - 1] = [tx, ty];

  // Clean up path
  worldPath = cleanPath(
    worldPath.map(([x, y]) => [Math.round(x), Math.round(y)])
  );

  return generateSmoothPath(worldPath, 12);
}

/**
 * Remove duplicate and collinear points
 */
function cleanPath(points) {
  if (points.length < 2) return points;

  const result = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];

    // Skip duplicates
    if (Math.abs(prev[0] - curr[0]) < 1 && Math.abs(prev[1] - curr[1]) < 1) {
      continue;
    }

    // Merge collinear points
    if (result.length >= 2) {
      const prevPrev = result[result.length - 2];
      const sameX = prevPrev[0] === prev[0] && prev[0] === curr[0];
      const sameY = prevPrev[1] === prev[1] && prev[1] === curr[1];

      if (sameX || sameY) {
        result[result.length - 1] = curr;
        continue;
      }
    }

    result.push(curr);
  }

  return result;
}

/**
 * Generate SVG path with smooth rounded corners
 */
function generateSmoothPath(points, radius = 12) {
  if (points.length < 2) return ["", 0, 0];

  let d = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const v1 = { x: pCurr[0] - pPrev[0], y: pCurr[1] - pPrev[1] };
    const v2 = { x: pNext[0] - pCurr[0], y: pNext[1] - pCurr[1] };
    const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const r = Math.min(radius, l1 / 2, l2 / 2);

    if (r < 1 || l1 < 1 || l2 < 1) {
      d += ` L ${pCurr[0]} ${pCurr[1]}`;
    } else {
      const startX = pCurr[0] - (v1.x / l1) * r;
      const startY = pCurr[1] - (v1.y / l1) * r;
      const endX = pCurr[0] + (v2.x / l2) * r;
      const endY = pCurr[1] + (v2.y / l2) * r;

      d += ` L ${startX} ${startY}`;
      d += ` Q ${pCurr[0]} ${pCurr[1]} ${endX} ${endY}`;
    }
  }

  d += ` L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`;

  // Label position
  const midIndex = Math.floor(points.length / 2);
  const pA = points[Math.max(0, midIndex - 1)];
  const pB = points[Math.min(points.length - 1, midIndex)];
  const labelX = Math.round((pA[0] + pB[0]) / 2);
  const labelY = Math.round((pA[1] + pB[1]) / 2);

  return [d, labelX, labelY];
}
