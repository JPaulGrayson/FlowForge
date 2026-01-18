// types/process.ts - LogicProcess data model

export type RoleType = 'human' | 'system' | 'ai';

export type StepType = 'start' | 'end' | 'task' | 'decision' | 'delay';

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface ProcessStep {
  id: string;
  roleId: string;
  type: StepType;
  name: string;
  description?: string;
  position: Position;
}

export interface Connection {
  id: string;
  fromStepId: string;
  toStepId: string;
  label?: string; // For decision branches (e.g., "Yes", "No")
}

export interface ProcessMap {
  id: string;
  name: string;
  description: string;
  version: string;
  roles: Role[];
  steps: ProcessStep[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

// Canvas/viewport state
export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// Layout configuration
export interface LayoutConfig {
  laneHeight: number;
  laneHeaderWidth: number;
  stepWidth: number;
  stepHeight: number;
  horizontalGap: number;
  verticalPadding: number;
}

// Default layout configuration
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  laneHeight: 120,
  laneHeaderWidth: 150,
  stepWidth: 140,
  stepHeight: 60,
  horizontalGap: 80,
  verticalPadding: 30,
};

// Role colors for swimlanes
export const ROLE_COLORS: Record<RoleType, string> = {
  human: '#00d9ff',    // Cyan
  system: '#a855f7',   // Purple
  ai: '#22c55e',       // Green
};
