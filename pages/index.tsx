import React, { useState, useRef, useEffect } from 'react';
import DrawingCanvas from '@/components/DrawingCanvas';
import Toolbar from '@/components/Toolbar';
import UserList from '@/components/UserList';
import CursorIndicator from '@/components/CursorIndicator';
import { getSocket } from '@/lib/socket';

export default function Home() {
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = getSocket();

    return () => {
      // Cleanup on unmount
      socket.disconnect();
    };
  }, []);

  const handleUndo = () => {
    if ((window as any).handleUndo) {
      (window as any).handleUndo();
    }
  };

  const handleRedo = () => {
    if ((window as any).handleRedo) {
      (window as any).handleRedo();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Collaborative Drawing App
          </h1>
          <p className="text-gray-600">
            Draw together in real-time with multiple users
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Canvas Area */}
          <div className="lg:col-span-3">
            <Toolbar
              currentColor={currentColor}
              onColorChange={setCurrentColor}
              strokeWidth={strokeWidth}
              onStrokeWidthChange={setStrokeWidth}
              tool={tool}
              onToolChange={setTool}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
            
            <div className="bg-white rounded-lg shadow-lg overflow-hidden relative" style={{ height: '600px' }}>
              <DrawingCanvas
                currentColor={currentColor}
                strokeWidth={strokeWidth}
                tool={tool}
                onUndoAvailable={setCanUndo}
                onRedoAvailable={setCanRedo}
                canvasRef={canvasRef}
              />
              <CursorIndicator canvasRef={canvasRef} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <UserList />
          </div>
        </div>
      </div>
    </div>
  );
}