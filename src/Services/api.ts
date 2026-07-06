const API_URL = 'http://localhost:5000/api';

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

// Auth APIs
export const authAPI = {
  register: (userData: { name: string; email: string; password: string; role: string }) => 
    fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (credentials: { email: string; password: string }) => 
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => fetchWithAuth('/auth/me'),

  logout: () => fetchWithAuth('/auth/logout', { method: 'POST' }),
};

// Profile APIs
export const profileAPI = {
  getMyProfile: () => fetchWithAuth('/profiles/me'),
  
  updateProfile: (profileData: any) => 
    fetchWithAuth('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  getAllProfiles: (role?: string) => 
    fetchWithAuth(`/profiles${role ? `?role=${role}` : ''}`),
    
  getProfileById: (userId: string) => fetchWithAuth(`/profiles/${userId}`),
};

// Meeting APIs
export const meetingAPI = {
  createMeeting: (meetingData: any) => 
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
};

// Transaction APIs
export const transactionAPI = {
  createTransaction: (data: any) => 
    fetchWithAuth('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyTransactions: () => fetchWithAuth('/transactions'),
};