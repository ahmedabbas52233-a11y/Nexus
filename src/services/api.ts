const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Helper to get auth token
const getToken = () => localStorage.getItem('business_nexus_token');

// Helper for fetch with auth
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

// Auth types
interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

// Auth APIs
export const authAPI = {
  register: (userData: RegisterData) => 
    fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (credentials: LoginCredentials) => 
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  verifyLoginOtp: (userId: number, otp: string) =>
    fetchWithAuth('/auth/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ userId, otp }),
    }),

  toggle2FA: (enabled: boolean) =>
    fetchWithAuth('/auth/2fa/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  forgotPassword: (email: string) =>
    fetchWithAuth('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    fetchWithAuth(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchWithAuth('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getMe: () => fetchWithAuth('/auth/me'),

  logout: () => fetchWithAuth('/auth/logout', { method: 'POST' }),
};

// Profile APIs
export const profileAPI = {
  getMyProfile: () => fetchWithAuth('/profiles/me'),
  
  updateProfile: (profileData: Record<string, unknown>) => 
    fetchWithAuth('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  getAllProfiles: (role?: string) => 
    fetchWithAuth(`/profiles${role ? `?role=${role}` : ''}`),
    
  getProfileById: (userId: string) => fetchWithAuth(`/profiles/${userId}`),
};

// Meeting types
interface MeetingData {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  recipientId?: number;
  [key: string]: unknown;
}

// Meeting APIs
export const meetingAPI = {
  createMeeting: (meetingData: MeetingData) => 
    fetchWithAuth('/meetings', {
      method: 'POST',
      body: JSON.stringify(meetingData),
    }),

  getMyMeetings: () => fetchWithAuth('/meetings'),
  
  updateStatus: (id: string, status: string) => 
    fetchWithAuth(`/meetings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

// Document APIs
export const documentAPI = {
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    
    const token = getToken();
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    return response.json();
  },

  getMyDocuments: () => fetchWithAuth('/documents/my'),
  getAllDocuments: () => fetchWithAuth('/documents/all'),
  deleteDocument: (id: number) => fetchWithAuth(`/documents/${id}`, { method: 'DELETE' }),
  signDocument: (id: number, signature: string) =>
    fetchWithAuth(`/documents/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    }),
};

// Transaction types
interface TransactionData {
  type?: string;
  amount?: number;
  description?: string;
  [key: string]: unknown;
}

// Transaction APIs
export const transactionAPI = {
  createTransaction: (data: TransactionData) => 
    fetchWithAuth('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyTransactions: () => fetchWithAuth('/transactions'),
};

// Messages API
export const messageAPI = {
  getConversations: () => fetchWithAuth('/messages/conversations'),
  getMessages: (userId: string) => fetchWithAuth(`/messages/${userId}`),
  sendMessage: (userId: string, content: string) => 
    fetchWithAuth(`/messages/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};