// SwimlaneDiagram.tsx - BPMN swimlane renderer with horizontal lanes
import React, { useMemo, useRef, useCallback } from 'react';
import {
  ProcessMap,
  ProcessStep,
  Role,
  Connection,
  LayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  ROLE_COLORS,
} from '../types/process';
import { layoutProcess, calculateCanvasDimensions, getConnectionPath } from '../utils/layoutEngine';
import { usePanZoom } from '../hooks/usePanZoom';
import ProcessNode from './ProcessNode';

interface SwimlaneDiagramProps {
  processMap: ProcessMap;
  config?: LayoutConfig;
  selectedStepId?: string | null;
  onStepClick?: (step: ProcessStep) => void;
  onExport?: (format: 'png' | 'svg') => void;
}

// Connection arrow component
const ConnectionArrow: React.FC<{
  connection: Connection;
  fromStep: ProcessStep;
  toStep: ProcessStep;
  config: LayoutConfig;
}> = ({ connection, fromStep, toStep, config }) => {
  const { start, end, controlPoints } = getConnectionPath(fromStep, toStep, config);

  // Build path
  let pathD: string;
  if (controlPoints && controlPoints.length > 0) {
    // Path with control points (for cross-lane connections)
    pathD = `M ${start.x} ${start.y}`;
    controlPoints.forEach(cp => {
      pathD += ` L ${cp.x} ${cp.y}`;
    });
    pathD += ` L ${end.x} ${end.y}`;
  } else {
    // Direct path
    pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  // Calculate arrow angle
  const lastPoint = controlPoints && controlPoints.length > 0
    ? controlPoints[controlPoints.length - 1]
    : start;
  const angle = Math.atan2(end.y - lastPoint.y, end.x - lastPoint.x);
  const arrowSize = 8;

  // Arrow head points
  const arrowPoints = [
    { x: end.x, y: end.y },
    {
      x: end.x - arrowSize * Math.cos(angle - Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle - Math.PI / 6),
    },
    {
      x: end.x - arrowSize * Math.cos(angle + Math.PI / 6),
      y: end.y - arrowSize * Math.sin(angle + Math.PI / 6),
    },
  ];

  // Label position
  const labelX = (start.x + end.x) / 2;
  const labelY = (start.y + end.y) / 2 - 8;

  return (
    <g className="connection">
      <path
        d={pathD}
        fill="none"
        stroke="#64748b"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={arrowPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="#64748b"
      />
      {connection.label && (
        <g>
          <rect
            x={labelX - 20}
            y={labelY - 10}
            width={40}
            height={16}
            rx={3}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={1}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#94a3b8"
            fontSize={10}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            {connection.label}
          </text>
        </g>
      )}
    </g>
  );
};

// Swimlane header and background
const Swimlane: React.FC<{
  role: Role;
  index: number;
  width: number;
  config: LayoutConfig;
}> = ({ role, index, width, config }) => {
  const { laneHeight, laneHeaderWidth } = config;
  const y = index * laneHeight;
  const roleColor = ROLE_COLORS[role.type] || '#00d9ff';

  return (
    <g className="swimlane">
      {/* Lane background */}
      <rect
        x={0}
        y={y}
        width={width}
        height={laneHeight}
        fill={index % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(30, 41, 59, 0.3)'}
        stroke="rgba(71, 85, 105, 0.3)"
        strokeWidth={1}
      />
      {/* Lane header */}
      <rect
        x={0}
        y={y}
        width={laneHeaderWidth}
        height={laneHeight}
        fill="rgba(15, 23, 42, 0.8)"
        stroke="rgba(71, 85, 105, 0.5)"
        strokeWidth={1}
      />
      {/* Role type indicator */}
      <rect
        x={4}
        y={y + 4}
        width={4}
        height={laneHeight - 8}
        rx={2}
        fill={roleColor}
      />
      {/* Role name */}
      <text
        x={laneHeaderWidth / 2 + 4}
        y={y + laneHeight / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#e0e0e0"
        fontSize={13}
        fontWeight={600}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        {role.name}
      </text>
      {/* Role type badge */}
      <text
        x={laneHeaderWidth / 2 + 4}
        y={y + laneHeight / 2 + 16}
        textAnchor="middle"
        dominantBaseline="central"
        fill={roleColor}
        fontSize={10}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        {role.type.toUpperCase()}
      </text>
    </g>
  );
};

export const SwimlaneDiagram: React.FC<SwimlaneDiagramProps> = ({
  processMap,
  config = DEFAULT_LAYOUT_CONFIG,
  selectedStepId,
  onStepClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Layout the process steps
  const layoutedSteps = useMemo(
    () => layoutProcess(processMap, config),
    [processMap, config]
  );

  // Create a map of steps for quick lookup
  const stepsMap = useMemo(
    () => new Map(layoutedSteps.map(s => [s.id, s])),
    [layoutedSteps]
  );

  // Calculate canvas dimensions
  const dimensions = useMemo(
    () => calculateCanvasDimensions(processMap.roles, layoutedSteps, config),
    [processMap.roles, layoutedSteps, config]
  );

  // Pan/zoom functionality
  const {
    viewport,
    containerRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    zoomIn,
    zoomOut,
    resetView,
    fitToContent,
    isPanning,
  } = usePanZoom();

  // Fit to content on initial load
  React.useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      setTimeout(() => fitToContent(dimensions.width, dimensions.height), 100);
    }
  }, [dimensions.width, dimensions.height, fitToContent]);

  // Export functions
  const exportAsSVG = useCallback(() => {
    if (!svgRef.current) return;

    const svgData = svgRef.current.outerHTML;
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${processMap.name || 'process'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [processMap.name]);

  const exportAsPNG = useCallback(() => {
    if (!svgRef.current) return;

    const svgData = svgRef.current.outerHTML;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Scale up for better quality
      const scale = 2;
      canvas.width = dimensions.width * scale;
      canvas.height = dimensions.height * scale;

      // Fill background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw SVG
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      // Export
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${processMap.name || 'process'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [processMap.name, dimensions]);

  return (
    <div className="swimlane-diagram-container">
      {/* Toolbar */}
      <div className="diagram-toolbar">
        <div className="toolbar-group">
          <button onClick={zoomOut} className="toolbar-btn" title="Zoom Out (-)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <span className="zoom-level">{Math.round(viewport.scale * 100)}%</span>
          <button onClick={zoomIn} className="toolbar-btn" title="Zoom In (+)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button onClick={resetView} className="toolbar-btn" title="Reset View (0)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button onClick={() => fitToContent(dimensions.width, dimensions.height)} className="toolbar-btn" title="Fit to Content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
        <div className="toolbar-group">
          <button onClick={exportAsSVG} className="toolbar-btn export-btn" title="Export SVG">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            SVG
          </button>
          <button onClick={exportAsPNG} className="toolbar-btn export-btn" title="Export PNG">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            PNG
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`diagram-canvas ${isPanning ? 'panning' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background */}
          <rect
            x={0}
            y={0}
            width={dimensions.width}
            height={dimensions.height}
            fill="#0f172a"
          />

          {/* Swimlanes */}
          <g className="swimlanes">
            {processMap.roles.map((role, index) => (
              <Swimlane
                key={role.id}
                role={role}
                index={index}
                width={dimensions.width}
                config={config}
              />
            ))}
          </g>

          {/* Connections */}
          <g className="connections">
            {processMap.connections.map(conn => {
              const fromStep = stepsMap.get(conn.fromStepId);
              const toStep = stepsMap.get(conn.toStepId);
              if (!fromStep || !toStep) return null;

              return (
                <ConnectionArrow
                  key={conn.id}
                  connection={conn}
                  fromStep={fromStep}
                  toStep={toStep}
                  config={config}
                />
              );
            })}
          </g>

          {/* Process Nodes */}
          <g className="nodes">
            {layoutedSteps.map(step => (
              <ProcessNode
                key={step.id}
                step={step}
                config={config}
                isSelected={step.id === selectedStepId}
                onClick={onStepClick}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Process info */}
      <div className="diagram-info">
        <span className="process-name">{processMap.name}</span>
        <span className="process-stats">
          {processMap.roles.length} roles | {processMap.steps.length} steps | {processMap.connections.length} connections
        </span>
      </div>
    </div>
  );
};

export default SwimlaneDiagram;
