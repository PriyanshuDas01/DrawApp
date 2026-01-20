# Collaborative Drawing App

A real-time multi-user drawing application built with Next.js, TypeScript, Socket.io, and HTML5 Canvas.

## 🎯 Features

### Core Functionality
- **Real-time Drawing**: Multiple users can draw simultaneously on the same canvas
- **Drawing Tools**: Brush and eraser with adjustable stroke width
- **Color Selection**: Multiple color options with custom color picker
- **Real-time Synchronization**: See other users' drawings as they draw (not after they finish)
- **User Indicators**: Visual cursor indicators showing where other users are drawing
- **Global Undo/Redo**: Undo and redo operations that work across all connected users
- **User Management**: See who's online with assigned user colors

### Technical Highlights

#### Canvas Mastery
- **Path Optimization**: Efficient path simplification to reduce network traffic
- **Layer Management**: Offscreen canvas for efficient redrawing
- **Smooth Drawing**: Quadratic bezier curves for smooth stroke rendering
- **High-frequency Event Handling**: Batched drawing events for optimal performance

#### Real-time Architecture
- **Event Streaming**: Efficient serialization and batching of drawing data
- **Network Optimization**: Batched draw-move events to reduce network overhead
- **Client-side Prediction**: Immediate local rendering before server confirmation

#### State Synchronization
- **Operation History**: Centralized history management on the server
- **Conflict Resolution**: Server-authoritative state with client synchronization
- **Global Undo/Redo**: Consistent operation history across all clients

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Open multiple browser tabs/windows to test multi-user functionality

## 🏗️ Project Structure

```
DrawApp/
├── components/
│   ├── DrawingCanvas.tsx    # Main canvas component with drawing logic
│   ├── Toolbar.tsx          # Drawing tools and controls
│   ├── UserList.tsx         # Online users panel
│   └── CursorIndicator.tsx  # Other users' cursor indicators
├── lib/
│   ├── canvas-utils.ts      # Canvas utility functions
│   └── socket.ts            # Socket.io client setup
├── pages/
│   ├── api/
│   │   └── socket.ts        # Socket.io server setup
│   ├── _app.tsx            # Next.js app wrapper
│   └── index.tsx           # Main page
├── styles/
│   └── globals.css         # Global styles with Tailwind
└── package.json
```

## 🔧 Technical Implementation

### Canvas Operations

The application implements efficient canvas operations from scratch:

- **Path Optimization**: Removes redundant points while maintaining smooth curves
- **Smooth Path Drawing**: Uses quadratic bezier curves for natural-looking strokes
- **Pressure Sensitivity**: Supports pressure-sensitive drawing (for compatible devices)
- **Layer Management**: Offscreen canvas for efficient redraws

### Real-time Synchronization

- **Event Batching**: Drawing move events are batched every 50ms to reduce network traffic
- **Operation Serialization**: Drawing operations are serialized with minimal data
- **State Management**: Server maintains authoritative state with operation history

### Global Undo/Redo

- **Operation Tracking**: Each drawing operation has a unique ID
- **History Management**: Server maintains a single source of truth for operation history
- **Synchronization**: All clients receive undo/redo events for consistent state

## 📝 Usage

1. **Drawing**: Click and drag on the canvas to draw
2. **Brush Tool**: Select brush, choose color and size
3. **Eraser Tool**: Select eraser and adjust size
4. **Undo/Redo**: Use toolbar buttons (works globally for all users)
5. **View Users**: Check the sidebar to see online users and their colors

## 🎨 Customization

- Adjust stroke width using the slider
- Choose from preset colors or use the color picker
- Switch between brush and eraser tools

## 🐛 Known Limitations

- Canvas state resets on page refresh (no persistence)
- Maximum 8 user colors (cycles after)
- Cursor indicators disappear after 2 seconds of inactivity

## 📚 Technologies Used

- **Next.js 14**: React framework with API routes
- **TypeScript**: Type safety
- **Socket.io**: Real-time bidirectional communication
- **HTML5 Canvas**: Drawing operations
- **Tailwind CSS**: Styling
