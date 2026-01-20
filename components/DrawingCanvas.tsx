import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { 
  Point, 
  DrawingPath, 
  optimizePath, 
  drawSmoothPath, 
  drawPathWithPressure,
  eraseArea,
  createBatcher
} from '@/lib/canvas-utils';

interface DrawingCanvasProps {
  currentColor: string;
  strokeWidth: number;
  tool: 'brush' | 'eraser';
  onUndoAvailable: (available: boolean) => void;
  onRedoAvailable: (available: boolean) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export default function DrawingCanvas({
  currentColor,
  strokeWidth,
  tool,
  onUndoAvailable,
  onRedoAvailable,
  canvasRef: externalCanvasRef,
}: DrawingCanvasProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<DrawingPath | null>(null);
  const historyRef = useRef<DrawingPath[]>([]);
  const futureRef = useRef<DrawingPath[]>([]);
  const allPathsRef = useRef<Map<string, DrawingPath>>(new Map());
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Batch drawing events for efficient network usage
  const batchDrawMove = useRef(
    createBatcher<{ operationId: string; points: Point[] }>((batched) => {
      const socket = getSocket();
      batched.forEach(({ operationId, points }) => {
        socket.emit('draw-move', { operationId, points });
      });
    }, 50) // Batch every 50ms
  ).current;

  // Initialize canvas and socket
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Create offscreen canvas for layer management
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = canvas.width;
      offscreenCanvasRef.current.height = canvas.height;
      
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize socket
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Receive initial state
    socket.on('initial-state', (data: { users: any[]; history: DrawingPath[] }) => {
      data.history.forEach((path) => {
        allPathsRef.current.set(path.id, path);
      });
      historyRef.current = [...data.history];
      redrawCanvas();
      onUndoAvailable(historyRef.current.length > 0);
    });

    // Receive drawing events from other users
    socket.on('draw-start', (path: DrawingPath) => {
      allPathsRef.current.set(path.id, path);
      historyRef.current.push(path);
      redrawCanvas();
    });

    socket.on('draw-move', (data: { operationId: string; points: Point[] }) => {
      const path = allPathsRef.current.get(data.operationId);
      if (path) {
        path.points.push(...data.points);
        redrawCanvas();
      }
    });

    socket.on('draw-end', () => {
      // Final redraw after drawing ends
      redrawCanvas();
    });

    // Receive erase events
    socket.on('erase', (path: DrawingPath) => {
      allPathsRef.current.set(path.id, path);
      historyRef.current.push(path);
      redrawCanvas();
    });

    // Handle global undo/redo
    socket.on('operation-removed', (data: { operationId: string }) => {
      const path = allPathsRef.current.get(data.operationId);
      if (path) {
        allPathsRef.current.delete(data.operationId);
        const index = historyRef.current.findIndex(p => p.id === data.operationId);
        if (index !== -1) {
          futureRef.current.unshift(historyRef.current[index]);
          historyRef.current.splice(index, 1);
        }
        redrawCanvas();
        onUndoAvailable(historyRef.current.length > 0);
        onRedoAvailable(futureRef.current.length > 0);
      }
    });

    socket.on('operation-added', (data: { operation: DrawingPath }) => {
      allPathsRef.current.set(data.operation.id, data.operation);
      historyRef.current.push(data.operation);
      redrawCanvas();
      onUndoAvailable(true);
      onRedoAvailable(futureRef.current.length > 1);
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('initial-state');
      socket.off('draw-start');
      socket.off('draw-move');
      socket.off('draw-end');
      socket.off('erase');
      socket.off('operation-removed');
      socket.off('operation-added');
    };
  }, [onUndoAvailable, onRedoAvailable]);

  // Efficient redraw using offscreen canvas for layer management
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    const offscreenCtx = offscreen.getContext('2d');
    if (!ctx || !offscreenCtx) return;

    // Clear offscreen canvas
    offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    offscreenCtx.save();
    
    // Scale context
    const scale = window.devicePixelRatio;
    offscreenCtx.scale(scale, scale);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Redraw all paths
    historyRef.current.forEach((path) => {
      if (path.type === 'erase') {
        eraseArea(offscreenCtx, path.points, path.strokeWidth / 2);
      } else {
        if (path.points.some(p => p.pressure !== undefined)) {
          drawPathWithPressure(offscreenCtx, path.points, path.color, path.strokeWidth);
        } else {
          drawSmoothPath(offscreenCtx, path.points, path.color, path.strokeWidth);
        }
      }
    });

    offscreenCtx.restore();
    
    // Copy offscreen to main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0);
  }, []);

  // Handle mouse/touch events
  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
        pressure: (e.touches[0] as any).force || 0.5,
      };
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!isConnected) return;

    const point = getPointFromEvent(e);
    const operationId = `${Date.now()}-${Math.random()}`;

    const newPath: DrawingPath = {
      id: operationId,
      userId: getSocket().id || 'unknown',
      type: tool === 'eraser' ? 'erase' : 'draw',
      points: [point],
      color: tool === 'eraser' ? '#FFFFFF' : currentColor,
      strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
      timestamp: Date.now(),
    };

    currentPathRef.current = newPath;
    allPathsRef.current.set(operationId, newPath);
    historyRef.current.push(newPath);
    isDrawingRef.current = true;

    const socket = getSocket();
    if (tool === 'eraser') {
      socket.emit('erase', {
        operationId,
        points: [{ x: point.x, y: point.y, radius: strokeWidth }],
      });
    } else {
      socket.emit('draw-start', {
        id: operationId,
        userId: socket.id || 'unknown',
        type: 'draw',
        points: [point],
        color: currentColor,
        strokeWidth,
      });
    }

    redrawCanvas();
  }, [currentColor, strokeWidth, tool, isConnected, redrawCanvas]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!isDrawingRef.current || !currentPathRef.current) return;

    const point = getPointFromEvent(e);
    currentPathRef.current.points.push(point);

    // Optimize path before sending (reduce network traffic)
    const optimized = optimizePath(currentPathRef.current.points, 1);
    const newPoints = optimized.slice(currentPathRef.current.points.length - optimized.length);

    if (newPoints.length > 0) {
      currentPathRef.current.points = optimized;
      
      if (tool === 'eraser') {
        const socket = getSocket();
        socket.emit('erase', {
          operationId: currentPathRef.current.id,
          points: newPoints.map(p => ({ x: p.x, y: p.y, radius: strokeWidth })),
        });
      } else {
        batchDrawMove({
          operationId: currentPathRef.current.id,
          points: newPoints,
        });
      }

      redrawCanvas();
    }

    // Send cursor position for other users
    const socket = getSocket();
    socket.emit('cursor-move', { x: point.x, y: point.y });
  }, [tool, strokeWidth, redrawCanvas]);

  const stopDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!isDrawingRef.current || !currentPathRef.current) return;

    isDrawingRef.current = false;
    
    const socket = getSocket();
    if (tool !== 'eraser') {
      socket.emit('draw-end', { operationId: currentPathRef.current.id });
    }

    currentPathRef.current = null;
    onUndoAvailable(historyRef.current.length > 0);
    redrawCanvas();
  }, [tool, onUndoAvailable, redrawCanvas]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    
    const lastOp = historyRef.current[historyRef.current.length - 1];
    const socket = getSocket();
    socket.emit('undo');
  }, []);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    
    const nextOp = futureRef.current[0];
    futureRef.current.shift();
    const socket = getSocket();
    socket.emit('redo', { operation: nextOp });
  }, []);

  // Expose undo/redo to parent
  useEffect(() => {
    (window as any).handleUndo = handleUndo;
    (window as any).handleRedo = handleRedo;
    return () => {
      delete (window as any).handleUndo;
      delete (window as any).handleRedo;
    };
  }, [handleUndo, handleRedo]);

  // Add non-passive touch event listeners to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDrawing(e as any);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      draw(e as any);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stopDrawing(e as any);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [startDrawing, draw, stopDrawing]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      {!isConnected && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded">
          Connecting...
        </div>
      )}
    </div>
  );
}