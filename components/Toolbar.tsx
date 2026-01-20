import React from 'react';

interface ToolbarProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  tool: 'brush' | 'eraser';
  onToolChange: (tool: 'brush' | 'eraser') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
];

export default function Toolbar({
  currentColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Tool Selection */}
        <div className="flex gap-2">
          <button
            onClick={() => onToolChange('brush')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              tool === 'brush'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Brush
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              tool === 'eraser'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Eraser
          </button>
        </div>

        {/* Color Picker */}
        {tool === 'brush' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Color:</label>
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`w-8 h-8 rounded border-2 transition-transform ${
                    currentColor === color
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
            />
          </div>
        )}

        {/* Stroke Width */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Size:</label>
          <input
            type="range"
            min="1"
            max="50"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-600 w-8">{strokeWidth}px</span>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              canUndo
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              canRedo
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Redo
          </button>
        </div>
      </div>
    </div>
  );
}