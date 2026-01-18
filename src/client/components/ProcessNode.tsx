// ProcessNode.tsx - BPMN shapes (start circle, end circle, task rectangle, decision diamond, delay shape)
import React from 'react';
import { ProcessStep, StepType, LayoutConfig, DEFAULT_LAYOUT_CONFIG } from '../types/process';

interface ProcessNodeProps {
  step: ProcessStep;
  config?: LayoutConfig;
  isSelected?: boolean;
  onClick?: (step: ProcessStep) => void;
}

// BPMN color scheme
const STEP_COLORS: Record<StepType, { fill: string; stroke: string; text: string }> = {
  start: { fill: '#22c55e', stroke: '#16a34a', text: '#ffffff' },
  end: { fill: '#ef4444', stroke: '#dc2626', text: '#ffffff' },
  task: { fill: '#1e293b', stroke: '#00d9ff', text: '#e0e0e0' },
  decision: { fill: '#1e293b', stroke: '#f59e0b', text: '#e0e0e0' },
  delay: { fill: '#1e293b', stroke: '#a855f7', text: '#e0e0e0' },
};

// Start Event - Circle
const StartShape: React.FC<{ width: number; height: number; colors: typeof STEP_COLORS.start }> = ({
  width,
  height,
  colors,
}) => {
  const radius = Math.min(width, height) / 2 - 4;
  const cx = width / 2;
  const cy = height / 2;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={colors.fill}
      stroke={colors.stroke}
      strokeWidth={3}
    />
  );
};

// End Event - Double Circle
const EndShape: React.FC<{ width: number; height: number; colors: typeof STEP_COLORS.end }> = ({
  width,
  height,
  colors,
}) => {
  const outerRadius = Math.min(width, height) / 2 - 4;
  const innerRadius = outerRadius - 4;
  const cx = width / 2;
  const cy = height / 2;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={outerRadius}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={3}
      />
      <circle
        cx={cx}
        cy={cy}
        r={innerRadius}
        fill={colors.fill}
        stroke="none"
      />
    </g>
  );
};

// Task - Rounded Rectangle
const TaskShape: React.FC<{ width: number; height: number; colors: typeof STEP_COLORS.task }> = ({
  width,
  height,
  colors,
}) => {
  const padding = 4;
  const cornerRadius = 8;

  return (
    <rect
      x={padding}
      y={padding}
      width={width - padding * 2}
      height={height - padding * 2}
      rx={cornerRadius}
      ry={cornerRadius}
      fill={colors.fill}
      stroke={colors.stroke}
      strokeWidth={2}
    />
  );
};

// Decision - Diamond (Gateway)
const DecisionShape: React.FC<{ width: number; height: number; colors: typeof STEP_COLORS.decision }> = ({
  width,
  height,
  colors,
}) => {
  const padding = 8;
  const cx = width / 2;
  const cy = height / 2;

  const points = [
    `${cx},${padding}`,           // top
    `${width - padding},${cy}`,   // right
    `${cx},${height - padding}`,  // bottom
    `${padding},${cy}`,           // left
  ].join(' ');

  return (
    <polygon
      points={points}
      fill={colors.fill}
      stroke={colors.stroke}
      strokeWidth={2}
    />
  );
};

// Delay - Timer/Clock shape (rounded on right side)
const DelayShape: React.FC<{ width: number; height: number; colors: typeof STEP_COLORS.delay }> = ({
  width,
  height,
  colors,
}) => {
  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const radius = h / 2;

  // Path for pill shape with flat left side
  const d = `
    M ${padding} ${padding}
    L ${padding + w - radius} ${padding}
    A ${radius} ${radius} 0 0 1 ${padding + w - radius} ${padding + h}
    L ${padding} ${padding + h}
    Z
  `;

  return (
    <g>
      <path
        d={d}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={2}
      />
      {/* Clock icon */}
      <circle
        cx={width - padding - radius}
        cy={height / 2}
        r={radius * 0.5}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={1.5}
      />
      <line
        x1={width - padding - radius}
        y1={height / 2}
        x2={width - padding - radius}
        y2={height / 2 - radius * 0.35}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <line
        x1={width - padding - radius}
        y1={height / 2}
        x2={width - padding - radius + radius * 0.25}
        y2={height / 2}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  );
};

// Shape renderer based on step type
const ShapeRenderer: React.FC<{ type: StepType; width: number; height: number }> = ({
  type,
  width,
  height,
}) => {
  const colors = STEP_COLORS[type];

  switch (type) {
    case 'start':
      return <StartShape width={width} height={height} colors={colors} />;
    case 'end':
      return <EndShape width={width} height={height} colors={colors} />;
    case 'task':
      return <TaskShape width={width} height={height} colors={colors} />;
    case 'decision':
      return <DecisionShape width={width} height={height} colors={colors} />;
    case 'delay':
      return <DelayShape width={width} height={height} colors={colors} />;
    default:
      return <TaskShape width={width} height={height} colors={colors} />;
  }
};

// Text wrapper for multiline text
const wrapText = (text: string, maxChars: number = 18): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 2); // Max 2 lines
};

export const ProcessNode: React.FC<ProcessNodeProps> = ({
  step,
  config = DEFAULT_LAYOUT_CONFIG,
  isSelected = false,
  onClick,
}) => {
  const { stepWidth, stepHeight } = config;
  const colors = STEP_COLORS[step.type];
  const lines = wrapText(step.name);

  // For start/end nodes, use smaller dimensions (circular)
  const isCircular = step.type === 'start' || step.type === 'end';
  const width = isCircular ? stepHeight : stepWidth;
  const height = stepHeight;

  // Adjust position for circular nodes to keep centered in flow
  const offsetX = isCircular ? (stepWidth - stepHeight) / 2 : 0;

  return (
    <g
      transform={`translate(${step.position.x + offsetX}, ${step.position.y})`}
      onClick={() => onClick?.(step)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className="process-node"
    >
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={-4}
          y={-4}
          width={width + 8}
          height={height + 8}
          rx={12}
          ry={12}
          fill="none"
          stroke="#00d9ff"
          strokeWidth={2}
          strokeDasharray="5,3"
          className="selection-highlight"
        />
      )}

      {/* Shape */}
      <ShapeRenderer type={step.type} width={width} height={height} />

      {/* Label */}
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize={isCircular ? 10 : 12}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight={500}
      >
        {lines.length === 1 ? (
          <tspan>{lines[0]}</tspan>
        ) : (
          lines.map((line, i) => (
            <tspan
              key={i}
              x={width / 2}
              dy={i === 0 ? '-0.4em' : '1.2em'}
            >
              {line}
            </tspan>
          ))
        )}
      </text>
    </g>
  );
};

export default ProcessNode;
