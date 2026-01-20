import React, { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface User {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

interface CursorIndicatorProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export default function CursorIndicator({ canvasRef }: CursorIndicatorProps) {
  const [userCursors, setUserCursors] = useState<Map<string, User>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('user-assigned', (data: { userId: string }) => {
      setCurrentUserId(data.userId);
    });

    socket.on('initial-state', (data: { users: User[] }) => {
      const map = new Map<string, User>();
      data.users.forEach((user) => {
        if (user.cursor) {
          map.set(user.id, user);
        }
      });
      setUserCursors(map);
    });

    socket.on('user-joined', (user: User) => {
      if (user.cursor) {
        setUserCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(user.id, user);
          return newMap;
        });
      }
    });

    socket.on('user-left', (data: { userId: string }) => {
      setUserCursors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    });

    socket.on('user-cursor', (data: { 
      userId: string; 
      cursor: { x: number; y: number };
      user?: { id: string; name: string; color: string };
    }) => {
      if (data.userId === currentUserId) return;

      if (data.user) {
        setUserCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.userId, { ...data.user!, cursor: data.cursor });
          return newMap;
        });

        // Hide cursor after 2 seconds of inactivity
        const timeoutId = setTimeout(() => {
          setUserCursors((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        }, 2000);

        // Store timeout to clear if needed
        (window as any)[`cursor-timeout-${data.userId}`] = timeoutId;
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off('user-assigned');
      socket.off('initial-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-cursor');
    };
  }, [currentUserId]);

  const [canvasPos, setCanvasPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateCanvasPosition = () => {
      const canvas = canvasRef?.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setCanvasPos({ x: rect.left, y: rect.top });
      }
    };

    updateCanvasPosition();
    window.addEventListener('resize', updateCanvasPosition);
    window.addEventListener('scroll', updateCanvasPosition, true);

    const interval = setInterval(updateCanvasPosition, 100);

    return () => {
      window.removeEventListener('resize', updateCanvasPosition);
      window.removeEventListener('scroll', updateCanvasPosition, true);
      clearInterval(interval);
    };
  }, [canvasRef]);

  return (
    <>
      {Array.from(userCursors.values())
        .filter((user) => user.id !== currentUserId && user.cursor)
        .map((user) => (
          <div
            key={user.id}
            className="absolute pointer-events-none z-50 transition-all duration-100"
            style={{
              left: `${canvasPos.x + (user.cursor?.x || 0)}px`,
              top: `${canvasPos.y + (user.cursor?.y || 0)}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: user.color }}
            />
            <div
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        ))}
    </>
  );
}