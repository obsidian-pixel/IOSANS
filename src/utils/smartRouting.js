import { Position } from "@xyflow/react";
import PF from "pathfinding";

const GRID_SIZE = 40;

/**
 * Smart routing using Weighted A* on a virtual grid
 * - High weight near nodes to encourage open-space routing
 * - Strict straight approach segments
 * - Strict Orthogonal Elbows for Grid-Entry
 * - Quadratic Bezier smoothing (Minimal 2px for 'square' feel)
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

  const relevantNodes = nodes.filter(
    (n) => !excludeNodeIds.includes(n.id) && n.width && n.height
  );

  // Expand bounds to include relevant nodes + margin
  relevantNodes.forEach((node) => {
    minX = Math.min(minX, node.position.x - 50);
    maxX = Math.max(maxX, node.position.x + node.width + 50);
    minY = Math.min(minY, node.position.y - 50);
    maxY = Math.max(maxY, node.position.y + node.height + 50);
  });

  const GRID_MARGIN = 200;
  minX -= GRID_MARGIN;
  minY -= GRID_MARGIN;
  maxX += GRID_MARGIN;
  maxY += GRID_MARGIN;

  const width = Math.ceil((maxX - minX) / GRID_SIZE);
  const height = Math.ceil((maxY - minY) / GRID_SIZE);

  // Fail-safe for huge grids
  if (width > 600 || height > 600) {
    return getSimplePath(sourceX, sourceY, targetX, targetY);
  }

  // 2. Create Weighted Grid
  const toGrid = (val, minVal) => Math.round((val - minVal) / GRID_SIZE);
  const fromGrid = (val, minVal) => val * GRID_SIZE + minVal;

  const grid = new PF.Grid(width, height);

  relevantNodes.forEach((node) => {
    // 2a. High Cost Buffer Zone (Node + 40px) - Weight: 20
    const bufferPadding = 40;
    const bufferStartX = toGrid(node.position.x - bufferPadding, minX);
    const bufferStartY = toGrid(node.position.y - bufferPadding, minY);
    const bufferEndX = toGrid(
      node.position.x + node.width + bufferPadding,
      minX
    );
    const bufferEndY = toGrid(
      node.position.y + node.height + bufferPadding,
      minY
    );

    for (let x = bufferStartX; x <= bufferEndX; x++) {
      for (let y = bufferStartY; y <= bufferEndY; y++) {
        if (grid.isWalkableAt(x, y)) {
          grid.setWeightAt(x, y, 20);
        }
      }
    }

    // 2b. Blocked Zone (Node + 10px) - Walkable: False
    const blockPadding = 10;
    const blockStartX = toGrid(node.position.x - blockPadding, minX);
    const blockStartY = toGrid(node.position.y - blockPadding, minY);
    const blockEndX = toGrid(node.position.x + node.width + blockPadding, minX);
    const blockEndY = toGrid(
      node.position.y + node.height + blockPadding,
      minY
    );

    for (let x = blockStartX; x <= blockEndX; x++) {
      for (let y = blockStartY; y <= blockEndY; y++) {
        grid.setWalkableAt(x, y, false);
      }
    }
  });

  // 3. Determine Start and End Points (Approach Segments)
  const APPROACH_DIST = 20;
  const startOffset = getHandleOffset(sourcePosition, APPROACH_DIST);
  const endOffset = getHandleOffset(targetPosition, APPROACH_DIST);

  // Grid ENTRY Points
  const entryX = sourceX + startOffset.x;
  const entryY = sourceY + startOffset.y;
  const exitX = targetX + endOffset.x;
  const exitY = targetY + endOffset.y;

  const gridStartX = toGrid(entryX, minX);
  const gridStartY = toGrid(entryY, minY);
  const gridEndX = toGrid(exitX, minX);
  const gridEndY = toGrid(exitY, minY);

  // Ensure start/end grid points are walkable
  grid.setWalkableAt(gridStartX, gridStartY, true);
  grid.setWalkableAt(gridEndX, gridEndY, true);

  // 4. Find Path
  const finder = new PF.AStarFinder({
    allowDiagonal: false,
    dontCrossCorners: true,
    weight: 20,
    heuristic: PF.Heuristic.manhattan,
  });

  let path = [];
  try {
    path = finder.findPath(gridStartX, gridStartY, gridEndX, gridEndY, grid);
  } catch {
    return getManhattanFallback(sourceX, sourceY, targetX, targetY);
  }

  if (path.length === 0) {
    return getManhattanFallback(sourceX, sourceY, targetX, targetY);
  }

  // 5. Post-Processing: Compress
  const compressedGridPath = PF.Util.compressPath(path);

  // Convert compressed path back to world coordinates
  const worldPath = compressedGridPath.map(([x, y]) => [
    fromGrid(x, minX),
    fromGrid(y, minY),
  ]);

  // 6. Force-Align Start/End to prevent diagonal jumps
  // Instead of replacing [0], we prepend connection points
  // Path so far: [GridStart (aligned), ..., GridEnd (aligned)]

  // Connection A: Entry -> GridStart
  // If not orthogonal, inject Elbow
  const startElbows = getOrthogonalConnection(
    { x: entryX, y: entryY },
    { x: worldPath[0][0], y: worldPath[0][1] },
    sourcePosition // Direction we are coming FROM
  );

  // Connection B: GridEnd -> Exit
  // If not orthogonal, inject Elbow
  const lastIdx = worldPath.length - 1;
  const endElbows = getOrthogonalConnection(
    { x: worldPath[lastIdx][0], y: worldPath[lastIdx][1] },
    { x: exitX, y: exitY },
    null // Direction doesn't matter as much, just orthogonalize
  );

  // Reassemble Full Path:
  // [Source Handle] -> [Entry] -> [StartElbows] -> [GridPath] -> [EndElbows] -> [Exit] -> [Target Handle]

  let finalPoints = [];
  finalPoints.push([sourceX, sourceY]); // Start Handle
  finalPoints.push([entryX, entryY]); // Entry Point

  startElbows.forEach((p) => finalPoints.push([p.x, p.y]));

  // Add Grid Path (skip first/last if we overlap, but keeping them is safe with compress)
  worldPath.forEach((p) => finalPoints.push(p));

  endElbows.forEach((p) => finalPoints.push([p.x, p.y]));

  finalPoints.push([exitX, exitY]); // Exit Point
  finalPoints.push([targetX, targetY]); // End Handle

  // Round coordinates
  finalPoints = finalPoints.map(([x, y]) => [Math.round(x), Math.round(y)]);

  // Remove duplicate/collinear points again to be clean
  finalPoints = cleanPath(finalPoints);

  return generateRoundedPath(finalPoints, 2);
}

/**
 * Generate orthogonal connection points between A and B
 * Returns array of intermediate points (0, 1, or 2 points)
 */
function getOrthogonalConnection(ptA, ptB, startDirection) {
  // If already aligned in X or Y, straight line is fine
  if (Math.abs(ptA.x - ptB.x) < 1 || Math.abs(ptA.y - ptB.y) < 1) {
    return [];
  }

  // If diagonal, need an elbow.
  // Strategy: Extend from A in preferred direction first
  let moveHorizontalFirst = true;

  if (startDirection) {
    if (startDirection === Position.Left || startDirection === Position.Right) {
      moveHorizontalFirst = true; // Maintain Y, change X
    } else {
      moveHorizontalFirst = false; // Maintain X, change Y
    }
  } else {
    // Heuristic: move in largest delta dimension first? Or just X.
    // Let's default to X first (horizontal)
    moveHorizontalFirst = true;
  }

  if (moveHorizontalFirst) {
    // Move Horizontal to match B.x, keep A.y
    // Elbow at (B.x, A.y)
    return [{ x: ptB.x, y: ptA.y }];
  } else {
    // Move Vertical to match B.y, keep A.x
    // Elbow at (A.x, B.y)
    return [{ x: ptA.x, y: ptB.y }];
  }
}

/**
 * Clean path by removing duplicate consecutive points
 */
function cleanPath(points) {
  if (points.length < 2) return points;
  const newPoints = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = newPoints[newPoints.length - 1];
    const curr = points[i];
    if (Math.abs(prev[0] - curr[0]) < 1 && Math.abs(prev[1] - curr[1]) < 1) {
      continue; // duplicate
    }
    newPoints.push(curr);
  }
  return newPoints;
}

/**
 * Calculate offset for handle positions
 */
function getHandleOffset(position, distance) {
  switch (position) {
    case Position.Top:
      return { x: 0, y: -distance };
    case Position.Bottom:
      return { x: 0, y: distance };
    case Position.Left:
      return { x: -distance, y: 0 };
    case Position.Right:
      return { x: distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Generate SVG path with Quadratic Bezier rounded corners
 */
function generateRoundedPath(points, radius = 2) {
  if (points.length < 2) return ["", 0, 0];

  // Start
  let d = `M ${points[0][0]} ${points[0][1]}`;

  // For very first and last segment, ensure straight line (Approach)
  // Our point array handles this naturally now.

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const v1 = { x: pCurr[0] - pPrev[0], y: pCurr[1] - pPrev[1] };
    const v2 = { x: pNext[0] - pCurr[0], y: pNext[1] - pCurr[1] };
    const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const r = Math.min(radius, l1 / 2, l2 / 2);

    if (r < 1) {
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

  // Label Positioning
  const midIndex = Math.floor(points.length / 2);
  const pA = points[midIndex];
  const pB = points[Math.min(midIndex + 1, points.length - 1)];
  const labelX = Math.round((pA[0] + pB[0]) / 2);
  const labelY = Math.round((pA[1] + pB[1]) / 2);

  return [d, labelX, labelY];
}

/**
 * Fallback orthogonal path if A* fails
 * Simple Manhattan routing (Step-connection)
 */
function getManhattanFallback(sx, sy, tx, ty) {
  let points = [[sx, sy]];

  const midX = (sx + tx) / 2;
  points.push([midX, sy]);
  points.push([midX, ty]);

  points.push([tx, ty]);

  // Round all
  points = points.map(([x, y]) => [Math.round(x), Math.round(y)]);

  return generateRoundedPath(points, 2);
}

function getSimplePath(sx, sy, tx, ty) {
  // Redirect to new fallback
  return getManhattanFallback(sx, sy, tx, ty);
}
