import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Info, Smile, ArrowLeft, MessageCircle } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';
import { ChatConversation } from '../../types';
import { profileAPI } from '../../services/api';

interface ChatMessageData {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface UserProfile {
  id: number;
  name: string;
  avatarUrl: string;
  isOnline?: boolean;
  role?: string;
}

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatPartner, setChatPartner] = useState<UserProfile | null>(null);
  const [loadingPartner, setLoadingPartner] = useState(false);
  
  // Load conversations list
  useEffect(() => {
    if (!currentUser) return;
    
    const loadConversations = async () => {
      try {
        const targetRole = currentUser.role === 'entrepreneur' ? 'investor' : 'entrepreneur';
        const data = await profileAPI.getAllProfiles(targetRole);
        
        const convos: ChatConversation[] = data.profiles.map((profile: Record<string, unknown>) => {
          const profileId = String(profile.userId || profile.id || 0);
          return {
            id: profileId,
            participants: [String(currentUser.id), profileId],
            lastMessage: {
              content: 'Click to start a conversation',
              timestamp: new Date().toISOString(),
              isRead: true,
              senderId: String(currentUser.id)
            },
            unreadCount: 0,
            updatedAt: new Date().toISOString()
          };
        });
        
        setConversations(convos);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    };
    
    loadConversations();
  }, [currentUser]);
  
  // Load chat partner when userId changes
  useEffect(() => {
    if (!userId) {
      setChatPartner(null);
      return;
    }
    
    const fetchPartner = async () => {
      setLoadingPartner(true);
      try {
        const profile = await profileAPI.getProfileById(userId);
        setChatPartner({
          id: Number(userId),
          name: String(profile.name || 'Unknown'),
          avatarUrl: String(profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(String(profile.name || 'Unknown'))}&background=random`),
          isOnline: Boolean(profile.isOnline),
          role: String(profile.role || '')
        });
      } catch (err) {
        console.error('Failed to fetch partner:', err);
        setChatPartner({
          id: Number(userId),
          name: 'Unknown User',
          avatarUrl: `https://ui-avatars.com/api/?name=Unknown&background=random`,
          isOnline: false
        });
      } finally {
        setLoadingPartner(false);
      }
    };
    
    fetchPartner();
  }, [userId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId) return;
    
    const message: ChatMessageData = {
      id: Date.now().toString(),
      senderId: String(currentUser.id),
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Update conversation last message
    setConversations(prev => prev.map(c => 
      c.id === userId ? {
        ...c,
        lastMessage: {
          id: message.id,
          senderId: String(currentUser.id),
          receiverId: userId,
          content: message.content,
          timestamp: message.timestamp,
          isRead: false,
          status: 'sent'
        },
        updatedAt: message.timestamp
      } : c
    ));
  };
  
  if (!currentUser) return null;
  
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
      {/* Conversations sidebar */}
      <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-gray-200">
        <ChatUserList conversations={conversations} />
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {userId ? (
          <>
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <button 
                  onClick={() => navigate('/messages')}
                  className="md:hidden mr-3 p-1 hover:bg-gray-100 rounded"
                  title="Back to messages"
                  type="button"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
                
                {loadingPartner || !chatPartner ? (
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse mr-3" />
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <Avatar
                      src={chatPartner.avatarUrl}
                      alt={chatPartner.name}
                      size="md"
                      status={chatPartner.isOnline ? 'online' : 'offline'}
                      className="mr-3"
                    />
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{chatPartner.name}</h2>
                      <p className="text-sm text-gray-500">
                        {chatPartner.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" className="rounded-full p-2" title="Voice call">
                  <Phone size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full p-2" title="Video call">
                  <Video size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full p-2" title="Info">
                  <Info size={18} />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map(message => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isCurrentUser={message.senderId === String(currentUser.id)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <MessageCircle size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
                  <p className="text-gray-500 mt-1">Send a message to start the conversation</p>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Button type="button" variant="ghost" size="sm" className="rounded-full p-2" title="Add emoji">
                  <Smile size={20} />
                </Button>
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  fullWidth
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim()}
                  className="rounded-full p-2 w-10 h-10 flex items-center justify-center"
                  title="Send message"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <MessageCircle size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-700">Select a conversation</h2>
            <p className="text-gray-500 mt-2 text-center">
              Choose a contact from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
