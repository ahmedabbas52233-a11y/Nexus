import React, { useState, useEffect } from 'react';
import { Bell, MessageCircle, UserPlus, DollarSign, Check } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: string;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  time: string;
  unread: boolean;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // For now, load from localStorage or show empty
    // Backend notifications API not implemented yet
    const loadNotifications = () => {
      try {
        const stored = localStorage.getItem('business_nexus_notifications');
        if (stored) {
          setNotifications(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadNotifications();
  }, []);
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle size={16} className="text-primary-600" />;
      case 'connection': return <UserPlus size={16} className="text-secondary-600" />;
      case 'investment': return <DollarSign size={16} className="text-accent-600" />;
      default: return <Bell size={16} className="text-gray-600" />;
    }
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    localStorage.setItem('business_nexus_notifications', JSON.stringify(notifications.map(n => ({ ...n, unread: false }))));
    toast.success('All notifications marked as read');
  };
  
  const markAsRead = (id: number) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, unread: false } : n);
      localStorage.setItem('business_nexus_notifications', JSON.stringify(updated));
      return updated;
    });
  };
  
  const unreadCount = notifications.filter(n => n.unread).length;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with your network activity</p>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} leftIcon={<Check size={16} />}>
            Mark all as read
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardBody className="flex items-start p-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-4" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map(notification => (
            <Card
              key={notification.id}
              className={`transition-colors duration-200 ${notification.unread ? 'bg-primary-50' : ''}`}
            >
              <CardBody className="flex items-start p-4">
                <Avatar
                  src={notification.user.avatar}
                  alt={notification.user.name}
                  size="md"
                  className="flex-shrink-0 mr-4"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{notification.user.name}</span>
                    {notification.unread && (
                      <Badge variant="primary" size="sm" rounded>New</Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mt-1">{notification.content}</p>
                  
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    {getNotificationIcon(notification.type)}
                    <span>{notification.time}</span>
                  </div>
                </div>
                
                {notification.unread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Check size={16} />
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Bell size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
          <p className="text-gray-500 mt-1">When you get messages or connection requests, they'll appear here</p>
        </div>
      )}
    </div>
  );
};