// usePanZoom.ts - Hook for pan and zoom functionality
import { useState, useCallback, useRef, useEffect } from 'react';
import { ViewportState } from '../types/process';

interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
}

interface UsePanZoomReturn {
  viewport: ViewportState;
  containerRef: React.RefObject<HTMLDivElement>;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToContent: (contentWidth: number, contentHeight: number) => void;
  isPanning: boolean;
}

export function usePanZoom(options: UsePanZoomOptions = {}): UsePanZoomReturn {
  const { minScale = 0.1, maxScale = 3, scaleStep = 0.1 } = options;

  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null!);

  const clampScale = useCallback(
    (scale: number) => Math.min(Math.max(scale, minScale), maxScale),
    [minScale, maxScale]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Get mouse position relative to container
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
      const newScale = clampScale(viewport.scale + delta);

      // Zoom toward mouse position
      const scaleRatio = newScale / viewport.scale;
      const newOffsetX = mouseX - (mouseX - viewport.offsetX) * scaleRatio;
      const newOffsetY = mouseY - (mouseY - viewport.offsetY) * scaleRatio;

      setViewport({
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    },
    [viewport, scaleStep, clampScale]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with left mouse button or middle button
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;

      setViewport(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY,
      }));

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  const zoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: clampScale(prev.scale + scaleStep),
    }));
  }, [clampScale, scaleStep]);

  const zoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: clampScale(prev.scale - scaleStep),
    }));
  }, [clampScale, scaleStep]);

  const resetView = useCallback(() => {
    setViewport({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  }, []);

  const fitToContent = useCallback(
    (contentWidth: number, contentHeight: number) => {
      const container = containerRef.current;
      if (!container) return;

      const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

      // Calculate scale to fit content with padding
      const padding = 40;
      const scaleX = (containerWidth - padding * 2) / contentWidth;
      const scaleY = (containerHeight - padding * 2) / contentHeight;
      const scale = clampScale(Math.min(scaleX, scaleY, 1));

      // Center the content
      const offsetX = (containerWidth - contentWidth * scale) / 2;
      const offsetY = (containerHeight - contentHeight * scale) / 2;

      setViewport({ scale, offsetX, offsetY });
    },
    [clampScale]
  );

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetView]);

  return {
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
  };
}
