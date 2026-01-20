const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store drawing operations for global undo/redo
const drawingHistory = [];
const users = new Map();
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];
let colorIndex = 0;

app.prepare().then(() => {
  console.log('Next.js app prepared successfully');
  
  const httpServer = createServer();

  const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  console.log('Socket.io server initialized');

  // Handle all HTTP requests - Socket.io handles its own routes automatically
  httpServer.on('request', async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Assign user color and create user entry
    const color = userColors[colorIndex % userColors.length];
    colorIndex++;
    const userName = `User ${users.size + 1}`;
    
    const user = {
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
    socket.on('draw-start', (data) => {
      const operation = {
        ...data,
        timestamp: Date.now(),
      };
      drawingHistory.push(operation);
      socket.broadcast.emit('draw-start', operation);
    });

    socket.on('draw-move', (data) => {
      // Update the last operation's points
      const operation = drawingHistory.find(op => op.id === data.operationId);
      if (operation) {
        operation.points.push(...data.points);
      }
      socket.broadcast.emit('draw-move', data);
    });

    socket.on('draw-end', (data) => {
      socket.broadcast.emit('draw-end', data);
    });

    // Handle cursor movement
    socket.on('cursor-move', (cursor) => {
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
    socket.on('get-user', (userId, callback) => {
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

    socket.on('redo', (data) => {
      drawingHistory.push(data.operation);
      io.emit('operation-added', { operation: data.operation });
    });

    // Handle eraser
    socket.on('erase', (data) => {
      const operation = {
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

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});