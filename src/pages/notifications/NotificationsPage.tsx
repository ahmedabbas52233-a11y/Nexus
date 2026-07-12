import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, DollarSign, Phone, Check, Trash2 } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useNotifications, AppNotification } from '../../context/NotificationsContext';

const getIcon = (type: AppNotification['type']) => {
  switch (type) {
    case 'message':
      return <MessageCircle size={16} className="text-primary-600" />;
    case 'payment':
      return <DollarSign size={16} className="text-accent-600" />;
    case 'call':
      return <Phone size={16} className="text-secondary-600" />;
    default:
      return <Bell size={16} className="text-gray-600" />;
  }
};

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead, markAsRead, clearAll } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You\'re all caught up'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" leftIcon={<Check size={16} />} onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" leftIcon={<Trash2 size={16} />} onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="bg-gray-100 p-6 rounded-full inline-flex mb-4">
                <Bell size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
              <p className="text-gray-500 mt-1">
                New messages, payment updates, and calls will show up here in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors ${
                    n.unread ? 'bg-primary-50/40' : ''
                  }`}
                >
                  <div className="mt-1 p-2 rounded-full bg-gray-100">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      {n.unread && <Badge variant="primary" size="sm">New</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.time)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
