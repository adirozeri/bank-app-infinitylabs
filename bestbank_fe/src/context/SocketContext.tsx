import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface TransferNotification {
  senderEmail: string;
  amount: number;
}

interface SocketContextType {
  notification: TransferNotification | null;
  clearNotification: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notification, setNotification] = useState<TransferNotification | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io('/', { withCredentials: true });
    socketRef.current = socket;

    socket.on('transfer:received', (payload: TransferNotification) => setNotification(payload));
    socket.on('connect_error', (err: Error) => console.warn('[socket]', err.message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ notification, clearNotification: () => setNotification(null) }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
