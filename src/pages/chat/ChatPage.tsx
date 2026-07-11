import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Info, ArrowLeft, MessageCircle } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { VideoCallModal } from '../../components/chat/VideoCallModal';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ChatConversation } from '../../types';
import { profileAPI, messageAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ChatMessageData {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface UserProfile {
  id: number;
  name: string;
  avatarUrl: string;
  isOnline?: boolean;
  role?: string;
}

interface IncomingCallState {
  fromUserId: number;
  offer: RTCSessionDescriptionInit;
  callType: 'video' | 'audio';
}

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatPartner, setChatPartner] = useState<UserProfile | null>(null);
  const [loadingPartner, setLoadingPartner] = useState(false);
  const [sending, setSending] = useState(false);

  const [outgoingInvite, setOutgoingInvite] = useState<'video' | 'audio' | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);

  // Build conversations list: real threads first, then any opposite-role
  // profile without a thread yet so a new conversation can be started.
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [convoData, targetRole] = await Promise.all([
        messageAPI.getConversations(),
        Promise.resolve(currentUser.role === 'entrepreneur' ? 'investor' : 'entrepreneur')
      ]);

      const realConvos: ChatConversation[] = (convoData.conversations || []).map(
        (c: { otherUserId: number; lastMessage: string; lastMessageAt: string; unreadCount: number }) => ({
          id: String(c.otherUserId),
          participants: [String(currentUser.id), String(c.otherUserId)],
          lastMessage: {
            id: '0',
            senderId: '',
            receiverId: String(currentUser.id),
            content: c.lastMessage,
            timestamp: c.lastMessageAt,
            isRead: c.unreadCount === 0
          },
          unreadCount: c.unreadCount,
          updatedAt: c.lastMessageAt
        })
      );

      const existingIds = new Set(realConvos.map(c => c.id));
      const profileData = await profileAPI.getAllProfiles(targetRole);
      const extraConvos: ChatConversation[] = (profileData.profiles || [])
        .map((profile: Record<string, unknown>) => String(profile.userId || profile.id || 0))
        .filter((id: string) => !existingIds.has(id))
        .map((profileId: string) => ({
          id: profileId,
          participants: [String(currentUser.id), profileId],
          lastMessage: {
            id: '0',
            senderId: String(currentUser.id),
            receiverId: profileId,
            content: 'Click to start a conversation',
            timestamp: new Date().toISOString(),
            isRead: true
          },
          unreadCount: 0,
          updatedAt: new Date(0).toISOString()
        }));

      setConversations([...realConvos, ...extraConvos]);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load chat partner profile when userId changes
  useEffect(() => {
    if (!userId) {
      setChatPartner(null);
      return;
    }

    const fetchPartner = async () => {
      setLoadingPartner(true);
      try {
        const data = await profileAPI.getProfileById(userId);
        const profile = data.profile || data;
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

  // Load message history for the active thread
  useEffect(() => {
    if (!userId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      try {
        const data = await messageAPI.getMessages(userId);
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    loadMessages();
  }, [userId]);

  // Real-time inbound messages + calls
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: ChatMessageData) => {
      if (userId && String(message.senderId) === String(userId)) {
        setMessages(prev => [...prev, message]);
      }
      loadConversations();
    };

    const handleCallInvite = (payload: IncomingCallState) => {
      setIncomingCall(payload);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('call:invite', handleCallInvite);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('call:invite', handleCallInvite);
    };
  }, [socket, userId, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const data = await messageAPI.sendMessage(userId, content);
      setMessages(prev => [...prev, data.message]);
      loadConversations();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startCall = (callType: 'video' | 'audio') => {
    if (!chatPartner) return;
    setOutgoingInvite(callType);
  };

  const closeCall = () => {
    setOutgoingInvite(null);
    setIncomingCall(null);
  };

  if (!currentUser) return null;

  const activePartnerIsOnline = chatPartner ? !!onlineUsers[chatPartner.id] || chatPartner.isOnline : false;
  const callTargetId = incomingCall ? incomingCall.fromUserId : chatPartner?.id;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
      {(outgoingInvite || incomingCall) && callTargetId && (
        <VideoCallModal
          socket={socket}
          partnerId={callTargetId}
          partnerName={chatPartner?.name || 'User'}
          partnerAvatar={chatPartner?.avatarUrl || `https://ui-avatars.com/api/?name=User`}
          outgoingInvite={outgoingInvite}
          incomingCall={incomingCall}
          onClose={closeCall}
        />
      )}

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
                      status={activePartnerIsOnline ? 'online' : 'offline'}
                      className="mr-3"
                    />
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{chatPartner.name}</h2>
                      <p className="text-sm text-gray-500">
                        {activePartnerIsOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" className="rounded-full p-2" title="Voice call" onClick={() => startCall('audio')}>
                  <Phone size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full p-2" title="Video call" onClick={() => startCall('video')}>
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
                      message={{ content: message.content, timestamp: message.createdAt }}
                      isCurrentUser={String(message.senderId) === String(currentUser.id)}
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
                  disabled={!newMessage.trim() || sending}
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
