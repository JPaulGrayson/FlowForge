// layoutEngine.ts - Auto-position steps in swimlanes using topological sort
import { ProcessMap, ProcessStep, Connection, Role, Position, LayoutConfig, DEFAULT_LAYOUT_CONFIG } from '../types/process';

interface StepWithLevel {
  step: ProcessStep;
  level: number;
}

/**
 * Performs topological sort on process steps based on connections
 * Returns steps ordered by their level (distance from start nodes)
 */
function topologicalSort(steps: ProcessStep[], connections: Connection[]): StepWithLevel[] {
  // Build adjacency list and in-degree map
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  steps.forEach(step => {
    adjacencyList.set(step.id, []);
    inDegree.set(step.id, 0);
  });

  connections.forEach(conn => {
    const neighbors = adjacencyList.get(conn.fromStepId);
    if (neighbors) {
      neighbors.push(conn.toStepId);
    }
    inDegree.set(conn.toStepId, (inDegree.get(conn.toStepId) || 0) + 1);
  });

  // Find all start nodes (in-degree 0 or type 'start')
  const queue: { id: string; level: number }[] = [];
  steps.forEach(step => {
    if (step.type === 'start' || (inDegree.get(step.id) || 0) === 0) {
      queue.push({ id: step.id, level: 0 });
    }
  });

  // BFS to assign levels
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current.id)) {
      // Update level if we found a longer path
      const existingLevel = levels.get(current.id) || 0;
      if (current.level > existingLevel) {
        levels.set(current.id, current.level);
      }
      continue;
    }

    visited.add(current.id);
    levels.set(current.id, current.level);

    const neighbors = adjacencyList.get(current.id) || [];
    neighbors.forEach(neighborId => {
      queue.push({ id: neighborId, level: current.level + 1 });
    });
  }

  // Handle unvisited nodes (disconnected components)
  steps.forEach(step => {
    if (!visited.has(step.id)) {
      levels.set(step.id, 0);
    }
  });

  // Create result with levels
  return steps.map(step => ({
    step,
    level: levels.get(step.id) || 0,
  }));
}

/**
 * Get the lane index for a role
 */
function getLaneIndex(roles: Role[], roleId: string): number {
  return roles.findIndex(r => r.id === roleId);
}

/**
 * Auto-layout steps within swimlanes
 * Positions steps horizontally based on topological order
 * and vertically based on their role's lane
 */
export function layoutProcess(
  processMap: ProcessMap,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): ProcessStep[] {
  const { roles, steps, connections } = processMap;
  const { laneHeight, laneHeaderWidth, stepWidth, horizontalGap, verticalPadding } = config;

  // Get topologically sorted steps with levels
  const sortedSteps = topologicalSort(steps, connections);

  // Group steps by level
  const stepsByLevel = new Map<number, StepWithLevel[]>();
  sortedSteps.forEach(item => {
    const level = item.level;
    if (!stepsByLevel.has(level)) {
      stepsByLevel.set(level, []);
    }
    stepsByLevel.get(level)!.push(item);
  });

  // Track horizontal position for each level
  const levelXPositions = new Map<number, number>();
  let currentX = laneHeaderWidth + horizontalGap;

  // Calculate x positions for each level
  const maxLevel = Math.max(...Array.from(stepsByLevel.keys()));
  for (let level = 0; level <= maxLevel; level++) {
    levelXPositions.set(level, currentX);
    currentX += stepWidth + horizontalGap;
  }

  // Position each step
  return sortedSteps.map(({ step, level }) => {
    const laneIndex = getLaneIndex(roles, step.roleId);
    const x = levelXPositions.get(level) || laneHeaderWidth + horizontalGap;
    const y = laneIndex * laneHeight + verticalPadding + (laneHeight - config.stepHeight) / 2;

    return {
      ...step,
      position: { x, y },
    };
  });
}

/**
 * Calculate the total canvas dimensions needed
 */
export function calculateCanvasDimensions(
  roles: Role[],
  steps: ProcessStep[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): { width: number; height: number } {
  const { laneHeight, laneHeaderWidth, horizontalGap, stepWidth } = config;

  // Find the maximum x position
  let maxX = laneHeaderWidth;
  steps.forEach(step => {
    if (step.position) {
      maxX = Math.max(maxX, step.position.x + stepWidth);
    }
  });

  // Calculate dimensions with padding
  const width = maxX + horizontalGap * 2;
  const height = roles.length * laneHeight;

  return { width, height };
}

/**
 * Get connection path points for drawing arrows
 */
export function getConnectionPath(
  fromStep: ProcessStep,
  toStep: ProcessStep,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): { start: Position; end: Position; controlPoints?: Position[] } {
  const { stepWidth, stepHeight } = config;

  const fromCenter = {
    x: fromStep.position.x + stepWidth / 2,
    y: fromStep.position.y + stepHeight / 2,
  };

  const toCenter = {
    x: toStep.position.x + stepWidth / 2,
    y: toStep.position.y + stepHeight / 2,
  };

  // Calculate start and end points at the edges of the shapes
  let start: Position;
  let end: Position;

  if (fromCenter.x < toCenter.x) {
    // Going right
    start = { x: fromStep.position.x + stepWidth, y: fromCenter.y };
    end = { x: toStep.position.x, y: toCenter.y };
  } else if (fromCenter.x > toCenter.x) {
    // Going left (backtrack)
    start = { x: fromStep.position.x, y: fromCenter.y };
    end = { x: toStep.position.x + stepWidth, y: toCenter.y };
  } else {
    // Vertical connection
    if (fromCenter.y < toCenter.y) {
      start = { x: fromCenter.x, y: fromStep.position.y + stepHeight };
      end = { x: toCenter.x, y: toStep.position.y };
    } else {
      start = { x: fromCenter.x, y: fromStep.position.y };
      end = { x: toCenter.x, y: toStep.position.y + stepHeight };
    }
  }

  // Add control points for curved connections if crossing lanes
  const controlPoints: Position[] = [];
  if (Math.abs(fromCenter.y - toCenter.y) > 10 && Math.abs(fromCenter.x - toCenter.x) > 10) {
    // Create an L-shaped or S-shaped path
    const midX = (start.x + end.x) / 2;
    controlPoints.push({ x: midX, y: start.y });
    controlPoints.push({ x: midX, y: end.y });
  }

  return { start, end, controlPoints };
}
