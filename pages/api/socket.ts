import { Server as NetServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { Socket as NetSocket } from 'net';
import type { NextApiRequest, NextApiResponse } from 'next';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & {
      io: SocketServer;
    };
  };
};

// Store drawing operations for global undo/redo
interface DrawingOperation {
  id: string;
  userId: string;
  type: 'draw' | 'erase';
  points: Array<{ x: number; y: number; pressure?: number }>;
  color: string;
  strokeWidth: number;
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

const drawingHistory: DrawingOperation[] = [];
const users = new Map<string, User>();
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];
let colorIndex = 0;

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const httpServer = res.socket.server as NetServer;
    const io = new SocketServer(httpServer, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Assign user color and create user entry
      const color = userColors[colorIndex % userColors.length];
      colorIndex++;
      const userName = `User ${users.size + 1}`;
      
      const user: User = {
        id: socket.id,
        name: userName,
        color,
        cursor: null,
      };
      
      users.set(socket.id, user);

      // Send current user info
      socket.emit('user-assigned', { userId: socket.id, color, name: userName });

      // Send existing users and drawing history
      socket.emit('initial-state', {
        users: Array.from(users.values()),
        history: drawingHistory,
      });

      // Notify others of new user
      socket.broadcast.emit('user-joined', user);

      // Handle drawing events
      socket.on('draw-start', (data: Omit<DrawingOperation, 'timestamp'>) => {
        const operation: DrawingOperation = {
          ...data,
          timestamp: Date.now(),
        };
        drawingHistory.push(operation);
        socket.broadcast.emit('draw-start', operation);
      });

      socket.on('draw-move', (data: {
        operationId: string;
        points: Array<{ x: number; y: number; pressure?: number }>;
      }) => {
        // Update the last operation's points
        const operation = drawingHistory.find(op => op.id === data.operationId);
        if (operation) {
          operation.points.push(...data.points);
        }
        socket.broadcast.emit('draw-move', data);
      });

      socket.on('draw-end', (data: { operationId: string }) => {
        socket.broadcast.emit('draw-end', data);
      });

      // Handle cursor movement
      socket.on('cursor-move', (cursor: { x: number; y: number }) => {
        const user = users.get(socket.id);
        if (user) {
          user.cursor = cursor;
          socket.broadcast.emit('user-cursor', {
            userId: socket.id,
            cursor,
            user: {
              id: user.id,
              name: user.name,
              color: user.color,
            },
          });
        }
      });

      // Handle get user request
      socket.on('get-user', (userId: string, callback: (user: User | null) => void) => {
        const user = users.get(userId);
        callback(user || null);
      });

      // Handle undo/redo
      socket.on('undo', () => {
        if (drawingHistory.length > 0) {
          const removedOp = drawingHistory.pop();
          io.emit('operation-removed', { operationId: removedOp?.id });
        }
      });

      socket.on('redo', (data: { operation: DrawingOperation }) => {
        drawingHistory.push(data.operation);
        io.emit('operation-added', { operation: data.operation });
      });

      // Handle eraser
      socket.on('erase', (data: {
        operationId: string;
        points: Array<{ x: number; y: number; radius: number }>;
      }) => {
        const operation: DrawingOperation = {
          id: data.operationId,
          userId: socket.id,
          type: 'erase',
          points: data.points.map(p => ({ x: p.x, y: p.y })),
          color: '#FFFFFF',
          strokeWidth: data.points[0]?.radius || 20,
          timestamp: Date.now(),
        };
        drawingHistory.push(operation);
        socket.broadcast.emit('erase', operation);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        users.delete(socket.id);
        socket.broadcast.emit('user-left', { userId: socket.id });
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}