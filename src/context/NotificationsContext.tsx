import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  type: 'message' | 'payment' | 'call';
  title: string;
  content: string;
  time: string;
  unread: boolean;
  link?: string;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAllAsRead: () => {},
  markAsRead: () => {},
  clearAll: () => {},
});

const STORAGE_KEY = 'business_nexus_notifications';
const MAX_NOTIFICATIONS = 50;

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load persisted notifications when the user changes
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      setNotifications(stored ? JSON.parse(stored) : []);
    } catch {
      setNotifications([]);
    }
  }, [user]);

  const persist = useCallback((next: AppNotification[]) => {
    if (!user) return;
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(next.slice(0, MAX_NOTIFICATIONS)));
  }, [user]);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'time' | 'unread'>) => {
    setNotifications((prev) => {
      const next = [
        { ...notification, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, time: new Date().toISOString(), unread: true },
        ...prev,
      ].slice(0, MAX_NOTIFICATIONS);
      persist(next);
      return next;
    });
  }, [persist]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: { senderId: number; content: string }) => {
      addNotification({
        type: 'message',
        title: 'New message',
        content: message.content,
        link: `/chat/${message.senderId}`,
      });
    };

    const handleTransactionUpdate = (tx: { type: string; amount: number; status: string }) => {
      if (tx.status === 'pending') return;
      addNotification({
        type: 'payment',
        title: tx.status === 'completed' ? 'Payment completed' : 'Payment failed',
        content: `${tx.type} of $${tx.amount} ${tx.status === 'completed' ? 'was completed' : 'failed'}`,
        link: '/payments',
      });
    };

    const handleCallInvite = (payload: { fromUserId: number; callType: string }) => {
      addNotification({
        type: 'call',
        title: 'Incoming call',
        content: `Incoming ${payload.callType} call`,
        link: `/chat/${payload.fromUserId}`,
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('transaction:update', handleTransactionUpdate);
    socket.on('call:invite', handleCallInvite);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('transaction:update', handleTransactionUpdate);
      socket.off('call:invite', handleCallInvite);
    };
  }, [socket, addNotification]);

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, unread: false }));
      persist(next);
      return next;
    });
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, unread: false } : n));
      persist(next);
      return next;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    persist([]);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => useContext(NotificationsContext);
