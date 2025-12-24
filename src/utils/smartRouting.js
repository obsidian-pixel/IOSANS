import { Position } from "@xyflow/react";
import PF from "pathfinding";

const GRID_SIZE = 50;

/**
 * Smart routing using Weighted A* on a virtual grid
 * - Strict orthogonal paths (no diagonals)
 * - Elbows injected at handle-to-grid transitions
 * - Minimal corner smoothing (2px)
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
  // 1. Calculate Virtual Grid Bounds
  let minX = Math.min(sourceX, targetX);
  let maxX = Math.max(sourceX, targetX);
  let minY = Math.min(sourceY, targetY);
  let maxY = Math.max(sourceY, targetY);

  // Filter nodes that have dimensions - check multiple possible locations for width/height
  const relevantNodes = nodes
    .filter((n) => {
      if (excludeNodeIds.includes(n.id)) return false;

      // Check for dimensions in different possible locations
      const w = n.width ?? n.measured?.width ?? n.computed?.width;
      const h = n.height ?? n.measured?.height ?? n.computed?.height;

      return w && h;
    })
    .map((n) => ({
      ...n,
      // Normalize width/height access
      width: n.width ?? n.measured?.width ?? n.computed?.width ?? 200,
      height: n.height ?? n.measured?.height ?? n.computed?.height ?? 100,
      position: n.positionAbsolute ?? n.position,
    }));

  relevantNodes.forEach((node) => {
    minX = Math.min(minX, node.position.x - 50);
    maxX = Math.max(maxX, node.position.x + node.width + 50);
    minY = Math.min(minY, node.position.y - 50);
    maxY = Math.max(maxY, node.position.y + node.height + 50);
  });

  const GRID_MARGIN = 150;
  minX -= GRID_MARGIN;
  minY -= GRID_MARGIN;
  maxX += GRID_MARGIN;
  maxY += GRID_MARGIN;

  const width = Math.ceil((maxX - minX) / GRID_SIZE);
  const height = Math.ceil((maxY - minY) / GRID_SIZE);

  if (width > 500 || height > 500) {
    return getManhattanFallback(
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition
    );
  }

  // 2. Grid helpers
  const toGrid = (val, minVal) => Math.round((val - minVal) / GRID_SIZE);
  const fromGrid = (val, minVal) => val * GRID_SIZE + minVal;

  const grid = new PF.Grid(width, height);

  // 3. Mark obstacles - nodes are barriers that paths must route around
  relevantNodes.forEach((node) => {
    // Blocked zone (Node + 25px) - Unwalkable, paths CANNOT pass through
    const blockPadding = 25;
    const blockStartX = Math.max(
      0,
      toGrid(node.position.x - blockPadding, minX)
    );
    const blockStartY = Math.max(
      0,
      toGrid(node.position.y - blockPadding, minY)
    );
    const blockEndX = Math.min(
      width - 1,
      toGrid(node.position.x + node.width + blockPadding, minX)
    );
    const blockEndY = Math.min(
      height - 1,
      toGrid(node.position.y + node.height + blockPadding, minY)
    );

    for (let x = blockStartX; x <= blockEndX; x++) {
      for (let y = blockStartY; y <= blockEndY; y++) {
        grid.setWalkableAt(x, y, false);
      }
    }
  });

  // 4. Grid start/end
  const gridStartX = Math.max(0, Math.min(width - 1, toGrid(sourceX, minX)));
  const gridStartY = Math.max(0, Math.min(height - 1, toGrid(sourceY, minY)));
  const gridEndX = Math.max(0, Math.min(width - 1, toGrid(targetX, minX)));
  const gridEndY = Math.max(0, Math.min(height - 1, toGrid(targetY, minY)));

  grid.setWalkableAt(gridStartX, gridStartY, true);
  grid.setWalkableAt(gridEndX, gridEndY, true);

  // 5. Find path
  const finder = new PF.AStarFinder({
    allowDiagonal: false,
    dontCrossCorners: true,
    heuristic: PF.Heuristic.manhattan,
  });

  let path = [];
  try {
    path = finder.findPath(gridStartX, gridStartY, gridEndX, gridEndY, grid);
  } catch {
    return getManhattanFallback(
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition
    );
  }

  if (path.length === 0) {
    return getManhattanFallback(
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition
    );
  }

  // 6. Convert to world coordinates
  const compressedPath = PF.Util.compressPath(path);
  const gridPath = compressedPath.map(([x, y]) => [
    fromGrid(x, minX),
    fromGrid(y, minY),
  ]);

  // 7. Build final path with orthogonal elbows at handle transitions
  let finalPath = [];

  // Start: Handle -> First Grid Point (with elbow if needed)
  finalPath.push([sourceX, sourceY]);
  const firstGrid = gridPath[0];
  const startElbow = getOrthogonalElbow(
    sourceX,
    sourceY,
    firstGrid[0],
    firstGrid[1],
    sourcePosition
  );
  if (startElbow) {
    finalPath.push(startElbow);
  }

  // Add all grid points
  gridPath.forEach((p) => finalPath.push(p));

  // End: Last Grid Point -> Handle (with elbow if needed)
  const lastGrid = gridPath[gridPath.length - 1];
  const endElbow = getOrthogonalElbow(
    lastGrid[0],
    lastGrid[1],
    targetX,
    targetY,
    getOppositePosition(targetPosition)
  );
  if (endElbow) {
    finalPath.push(endElbow);
  }
  finalPath.push([targetX, targetY]);

  // 8. Clean and round
  finalPath = cleanPath(
    finalPath.map(([x, y]) => [Math.round(x), Math.round(y)])
  );

  return generateRoundedPath(finalPath, 12);
}

/**
 * Get an orthogonal elbow point between two points if they're not aligned
 */
function getOrthogonalElbow(x1, y1, x2, y2, fromPosition) {
  // Already aligned
  if (Math.abs(x1 - x2) < 1 || Math.abs(y1 - y2) < 1) {
    return null;
  }

  // Determine elbow direction based on handle position
  const isHorizontalHandle =
    fromPosition === Position.Left || fromPosition === Position.Right;

  if (isHorizontalHandle) {
    // Move horizontal first (keep y1, change x)
    return [x2, y1];
  } else {
    // Move vertical first (keep x1, change y)
    return [x1, y2];
  }
}

/**
 * Get opposite handle position
 */
function getOppositePosition(pos) {
  switch (pos) {
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    case Position.Top:
      return Position.Bottom;
    case Position.Bottom:
      return Position.Top;
    default:
      return Position.Right;
  }
}

/**
 * Clean path - remove duplicates and merge collinear segments
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

    // Check collinearity
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
 * Generate SVG path with minimal corner rounding
 */
function generateRoundedPath(points, radius = 2) {
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

  const midIndex = Math.floor(points.length / 2);
  const pA = points[Math.max(0, midIndex - 1)];
  const pB = points[Math.min(points.length - 1, midIndex)];
  const labelX = Math.round((pA[0] + pB[0]) / 2);
  const labelY = Math.round((pA[1] + pB[1]) / 2);

  return [d, labelX, labelY];
}

/**
 * Manhattan fallback - orthogonal L or S shape
 */
function getManhattanFallback(sx, sy, tx, ty, sourcePos) {
  let points = [[sx, sy]];

  const isSourceHorizontal =
    sourcePos === Position.Left || sourcePos === Position.Right;

  if (isSourceHorizontal) {
    const midX = (sx + tx) / 2;
    points.push([midX, sy]);
    points.push([midX, ty]);
  } else {
    const midY = (sy + ty) / 2;
    points.push([sx, midY]);
    points.push([tx, midY]);
  }

  points.push([tx, ty]);
  points = points.map(([x, y]) => [Math.round(x), Math.round(y)]);

  return generateRoundedPath(cleanPath(points), 2);
}
