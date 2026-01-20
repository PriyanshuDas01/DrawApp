import React, { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface User {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('user-assigned', (data: { userId: string; color: string; name: string }) => {
      setCurrentUserId(data.userId);
    });

    socket.on('initial-state', (data: { users: User[] }) => {
      setUsers(data.users);
    });

    socket.on('user-joined', (user: User) => {
      setUsers((prev) => {
        if (!prev.find(u => u.id === user.id)) {
          return [...prev, user];
        }
        return prev;
      });
    });

    socket.on('user-left', (data: { userId: string }) => {
      setUsers((prev) => prev.filter(u => u.id !== data.userId));
    });

    socket.on('user-cursor', (data: { userId: string; cursor: { x: number; y: number } }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.userId ? { ...u, cursor: data.cursor } : u))
      );
    });

    return () => {
      socket.off('user-assigned');
      socket.off('initial-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-cursor');
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Online Users ({users.length})</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className={`flex items-center gap-2 p-2 rounded ${
              user.id === currentUserId ? 'bg-blue-50 border border-blue-200' : ''
            }`}
          >
            <div
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: user.color }}
            />
            <span className="text-sm font-medium">{user.name}</span>
            {user.id === currentUserId && (
              <span className="text-xs text-blue-600">(You)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}