// Canvas utility functions for efficient drawing operations

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingPath {
  id: string;
  userId: string;
  type: 'draw' | 'erase';
  points: Point[];
  color: string;
  strokeWidth: number;
  timestamp: number;
}

/**
 * Optimize path by removing redundant points for smoother, more efficient drawing
 */
export function optimizePath(points: Point[], threshold: number = 2): Point[] {
  if (points.length < 2) return points;
  
  const optimized: Point[] = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    // Calculate distance from current point to line segment
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const dist = Math.abs(
      (dy * curr.x - dx * curr.y + next.x * prev.y - next.y * prev.x) /
      Math.sqrt(dx * dx + dy * dy)
    );
    
    // Keep point if it's significantly off the line
    if (dist > threshold) {
      optimized.push(curr);
    }
  }
  
  optimized.push(points[points.length - 1]);
  return optimized;
}

/**
 * Draw a smooth curve through points using quadratic bezier curves
 */
export function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  strokeWidth: number
) {
  if (points.length < 2) return;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    if (i === 1) {
      ctx.lineTo(curr.x, curr.y);
    } else {
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
  }
  
  ctx.stroke();
}

/**
 * Draw with pressure sensitivity
 */
export function drawPathWithPressure(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  baseStrokeWidth: number
) {
  if (points.length < 2) return;
  
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    
    const pressure = curr.pressure || 0.5;
    const strokeWidth = baseStrokeWidth * (0.5 + pressure);
    
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(curr.x, curr.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  }
}

/**
 * Erase area by drawing with destination-out composite
 */
export function eraseArea(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  radius: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  ctx.lineWidth = radius * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawSmoothPath(ctx, points, 'rgba(0,0,0,1)', radius * 2);
  }
  
  ctx.restore();
}

/**
 * Batch throttle for high-frequency events
 */
export function createBatcher<T>(
  callback: (items: T[]) => void,
  delay: number = 16 // ~60fps
) {
  let queue: T[] = [];
  let timer: NodeJS.Timeout | null = null;
  
  return (item: T) => {
    queue.push(item);
    
    if (!timer) {
      timer = setTimeout(() => {
        callback(queue);
        queue = [];
        timer = null;
      }, delay);
    }
  };
}