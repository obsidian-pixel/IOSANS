import { Position, getSmoothStepPath } from "@xyflow/react";

/**
 * Smart routing for orthogonal edges that avoids obstacles
 * Uses React Flow's getSmoothStepPath as base, with adjusted offsets for collision avoidance
 */
export function getSmartPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  nodes,
  excludeNodeIds = [],
  gap = 10,
}) {
  // Build obstacle boxes from nodes (excluding source/target)
  const obstacles = nodes
    .filter((node) => {
      if (!node.measured?.width && !node.width) return false;
      if (excludeNodeIds.includes(node.id)) return false;
      return true;
    })
    .map((node) => {
      const w = node.measured?.width || node.width || 180;
      const h = node.measured?.height || node.height || 80;
      const x = node.position.x;
      const y = node.position.y;
      return {
        left: x,
        right: x + w,
        top: y,
        bottom: y + h,
        centerX: x + w / 2,
        centerY: y + h / 2,
      };
    });

  // Check if a line segment (horizontal or vertical) intersects any obstacle
  const lineIntersectsObstacle = (x1, y1, x2, y2, padding = gap) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return obstacles.some((o) => {
      // Check if rectangles overlap
      return (
        maxX > o.left - padding &&
        minX < o.right + padding &&
        maxY > o.top - padding &&
        minY < o.bottom + padding
      );
    });
  };

  // Start with 0 offset for direct paths (no minimum length)
  let offset = 0;

  // Check if direct path would intersect obstacles
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Check the three segments of a typical smooth step path
  const isHorizontalFirst =
    sourcePosition === Position.Left || sourcePosition === Position.Right;

  let hasCollision = false;

  if (isHorizontalFirst) {
    // Horizontal → Vertical → Horizontal path
    // Segment 1: sourceX,sourceY → midX,sourceY
    // Segment 2: midX,sourceY → midX,targetY
    // Segment 3: midX,targetY → targetX,targetY
    hasCollision =
      lineIntersectsObstacle(sourceX, sourceY, midX, sourceY) ||
      lineIntersectsObstacle(midX, sourceY, midX, targetY) ||
      lineIntersectsObstacle(midX, targetY, targetX, targetY);
  } else {
    // Vertical → Horizontal → Vertical path
    hasCollision =
      lineIntersectsObstacle(sourceX, sourceY, sourceX, midY) ||
      lineIntersectsObstacle(sourceX, midY, targetX, midY) ||
      lineIntersectsObstacle(targetX, midY, targetX, targetY);
  }

  // If there's a collision, increase offset to route around
  if (hasCollision) {
    // Find the maximum extent we need to route around
    let maxExtent = gap;

    for (const o of obstacles) {
      // Check if this obstacle is in our general path
      const inPath =
        o.left < Math.max(sourceX, targetX) + gap &&
        o.right > Math.min(sourceX, targetX) - gap &&
        o.top < Math.max(sourceY, targetY) + gap &&
        o.bottom > Math.min(sourceY, targetY) - gap;

      if (inPath) {
        // Calculate how far we need to route around this obstacle
        if (isHorizontalFirst) {
          // Need to go above or below
          const distAbove = sourceY - o.bottom;
          const distBelow = o.top - sourceY;
          const bestVertical = Math.min(
            Math.abs(distAbove),
            Math.abs(distBelow)
          );
          maxExtent = Math.max(maxExtent, bestVertical + gap * 2);
        } else {
          // Need to go left or right
          const distLeft = sourceX - o.right;
          const distRight = o.left - sourceX;
          const bestHorizontal = Math.min(
            Math.abs(distLeft),
            Math.abs(distRight)
          );
          maxExtent = Math.max(maxExtent, bestHorizontal + gap * 2);
        }
      }
    }

    offset = Math.max(gap, maxExtent);
  }

  // Use React Flow's getSmoothStepPath with calculated offset
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: offset,
  });

  return [path, labelX, labelY];
}
