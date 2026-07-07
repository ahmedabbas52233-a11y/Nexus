import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ChatConversation } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { profileAPI } from '../../Services/api';

interface ChatUserListProps {
  conversations: ChatConversation[];
}

interface CachedUser {
  name: string;
  avatarUrl: string;
  isOnline?: boolean;
}

export const ChatUserList: React.FC<ChatUserListProps> = ({ conversations }) => {
  const navigate = useNavigate();
  const { userId: activeUserId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [userCache, setUserCache] = useState<Record<string, CachedUser>>({});
  
  useEffect(() => {
    if (!currentUser || conversations.length === 0) return;
    
    const fetchMissingUsers = async () => {
      const missingIds: string[] = [];
      
      for (const conversation of conversations) {
        const otherId = conversation.participants.find(id => String(id) !== String(currentUser.id));
        if (!otherId) continue;
        const key = String(otherId);
        if (!userCache[key]) {
          missingIds.push(key);
        }
      }
      
      if (missingIds.length === 0) return;
      
      // Fetch all missing users
      for (const userId of missingIds) {
        try {
          const profile = await profileAPI.getProfileById(userId);
          setUserCache(prev => ({
            ...prev,
            [userId]: {
              name: profile.name || 'Unknown',
              avatarUrl: profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'Unknown')}&background=random`,
              isOnline: profile.isOnline
            }
          }));
        } catch {
          setUserCache(prev => ({
            ...prev,
            [userId]: {
              name: 'Unknown User',
              avatarUrl: `https://ui-avatars.com/api/?name=Unknown&background=random`,
              isOnline: false
            }
          }));
        }
      }
    };
    
    fetchMissingUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, currentUser]);
  
  if (!currentUser) return null;
  
  const handleSelectUser = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  return (
    <div className="bg-white border-r border-gray-200 w-full md:w-64 overflow-y-auto">
      <div className="py-4">
        <h2 className="px-4 text-lg font-semibold text-gray-800 mb-4">Messages</h2>
        
        <div className="space-y-1">
          {conversations.length > 0 ? (
            conversations.map(conversation => {
              const otherParticipantId = conversation.participants.find(
                id => String(id) !== String(currentUser.id)
              );
              if (!otherParticipantId) return null;
              
              const otherUser = userCache[String(otherParticipantId)];
              const lastMessage = conversation.lastMessage;
              const isActive = activeUserId === String(otherParticipantId);
              
              return (
                <div
                  key={conversation.id}
                  className={`px-4 py-3 flex cursor-pointer transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 border-l-4 border-primary-600'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleSelectUser(String(otherParticipantId))}
                >
                  {otherUser ? (
                    <Avatar
                      src={otherUser.avatarUrl}
                      alt={otherUser.name}
                      size="md"
                      status={otherUser.isOnline ? 'online' : 'offline'}
                      className="mr-3 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse mr-3 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {otherUser?.name || 'Loading...'}
                      </h3>
                      
                      {lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      {lastMessage && (
                        <p className="text-xs text-gray-600 truncate">
                          {String(lastMessage.senderId) === String(currentUser.id) ? 'You: ' : ''}
                          {lastMessage.content}
                        </p>
                      )}
                      
                      {lastMessage && !lastMessage.isRead && String(lastMessage.senderId) !== String(currentUser.id) && (
                        <Badge variant="primary" size="sm" rounded>New</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No conversations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};