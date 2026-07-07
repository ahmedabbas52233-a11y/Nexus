import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { profileAPI } from '../../services/api';
import { ChatConversation } from '../../types';

interface ApiProfile {
  id?: number;
  userId?: number;
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchPotentialConversations = async () => {
      try {
        const targetRole = user.role === 'entrepreneur' ? 'investor' : 'entrepreneur';
        const data = await profileAPI.getAllProfiles(targetRole);
        
        const convos: ChatConversation[] = data.profiles.map((profile: ApiProfile) => {
          const profileId = String(profile.userId || profile.id || 0);
          
          return {
            id: profileId,
            participants: [String(user.id), profileId],
            lastMessage: {
              content: 'Click to start a conversation',
              timestamp: new Date().toISOString(),
              isRead: true,
              senderId: String(user.id)
            },
            unreadCount: 0,
            updatedAt: new Date().toISOString()
          };
        });
        
        setConversations(convos);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPotentialConversations();
  }, [user]);
  
  if (!user) return null;
  
  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <p className="text-gray-500">Loading conversations...</p>
      </div>
    );
  }
  
  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      {conversations.length > 0 ? (
        <ChatUserList conversations={conversations} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="bg-gray-100 p-6 rounded-full mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-900">No messages yet</h2>
          <p className="text-gray-600 text-center mt-2">
            Start connecting with {user.role === 'entrepreneur' ? 'investors' : 'entrepreneurs'} to begin conversations
          </p>
          <button 
            onClick={() => navigate(user.role === 'entrepreneur' ? '/investors' : '/startups')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Find {user.role === 'entrepreneur' ? 'Investors' : 'Startups'}
          </button>
        </div>
      )}
    </div>
  );
};