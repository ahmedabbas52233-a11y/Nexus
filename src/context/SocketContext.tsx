import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../services/api';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Record<number, boolean>;
}

const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: {} });

const TOKEN_STORAGE_KEY = 'business_nexus_token';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        forceRender((n) => n + 1);
      }
      return;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('presence', ({ userId, online }: { userId: number; online: boolean }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: online }));
    });

    socket.on('connect_error', (err) => {
      // Most commonly an expired/invalid JWT. Logged rather than surfaced as a
      // toast on every page, since REST calls will independently redirect to
      // login once the token is actually rejected there.
      console.warn('Socket connection failed:', err.message);
    });

    socketRef.current = socket;
    forceRender((n) => n + 1);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => useContext(SocketContext);
