import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Bell, Calendar, TrendingUp, AlertCircle, PlusCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CollaborationRequestCard } from '../../components/collaboration/CollaborationRequestCard';
import { useAuth } from '../../context/AuthContext';
import { CollaborationRequest } from '../../types';
import { profileAPI, meetingAPI, documentAPI, messageAPI } from '../../services/api';

interface InvestorProfile {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
  investmentInterests?: string[];
  investmentStage?: string[];
  minimumInvestment?: string;
  maximumInvestment?: string;
  totalInvestments?: number;
  location?: string;
}

export const EntrepreneurDashboard: React.FC = () => {
  const { user } = useAuth();
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([]);
  const [recommendedInvestors, setRecommendedInvestors] = useState<InvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingMeetingsCount, setUpcomingMeetingsCount] = useState(0);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  
  useEffect(() => {
    if (user) {
      // TODO: Replace with real API when backend has collaboration routes
      setCollaborationRequests([]);
      
      const fetchInvestors = async () => {
        try {
          const data = await profileAPI.getAllProfiles('investor');
          setRecommendedInvestors(data.profiles.slice(0, 3));
        } catch (err) {
          console.error('Failed to fetch investors:', err);
          setError('Failed to load investors');
        } finally {
          setLoading(false);
        }
      };
      fetchInvestors();

      meetingAPI.getMyMeetings()
        .then((data) => {
          const now = new Date();
          const count = (data.meetings || []).filter(
            (m: { status: string; endTime: string }) => m.status !== 'rejected' && new Date(m.endTime) >= now
          ).length;
          setUpcomingMeetingsCount(count);
        })
        .catch((err) => console.error('Failed to fetch meetings:', err));

      documentAPI.getMyDocuments()
        .then((data) => setDocumentsCount((data.documents || []).length))
        .catch((err) => console.error('Failed to fetch documents:', err));

      messageAPI.getConversations()
        .then((data) => setConnectionsCount((data.conversations || []).length))
        .catch((err) => console.error('Failed to fetch conversations:', err));
    }
  }, [user]);
  
  const handleRequestStatusUpdate = (requestId: string, status: 'accepted' | 'rejected') => {
    setCollaborationRequests(prevRequests => 
      prevRequests.map(req => 
        req.id === requestId ? { ...req, status } : req
      )
    );
  };
  
  if (!user) {
    return <div className="p-8 text-center">Loading user...</div>;
  }
  
  const pendingRequests = collaborationRequests.filter(req => req.status === 'pending');
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          <p className="text-gray-600">Here's what's happening with your startup today</p>
        </div>
        
        <Link to="/investors">
          <Button leftIcon={<PlusCircle size={18} />}>
            Find Investors
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary-50 border border-primary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-full mr-4">
                <Bell size={20} className="text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700">Pending Requests</p>
                <h3 className="text-xl font-semibold text-primary-900">{pendingRequests.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card className="bg-secondary-50 border border-secondary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 rounded-full mr-4">
                <Users size={20} className="text-secondary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-700">Total Connections</p>
                <h3 className="text-xl font-semibold text-secondary-900">
                  {connectionsCount}
                </h3>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card className="bg-accent-50 border border-accent-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-full mr-4">
                <Calendar size={20} className="text-accent-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-accent-700">Upcoming Meetings</p>
                <h3 className="text-xl font-semibold text-accent-900">{upcomingMeetingsCount}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card className="bg-success-50 border border-success-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full mr-4">
                <TrendingUp size={20} className="text-success-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-success-700">My Documents</p>
                <h3 className="text-xl font-semibold text-success-900">{documentsCount}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Collaboration Requests</h2>
              <Badge variant="primary">{pendingRequests.length} pending</Badge>
            </CardHeader>
            
            <CardBody>
              {collaborationRequests.length > 0 ? (
                <div className="space-y-4">
                  {collaborationRequests.map(request => (
                    <CollaborationRequestCard
                      key={request.id}
                      request={request}
                      onStatusUpdate={handleRequestStatusUpdate}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <AlertCircle size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-600">No collaboration requests yet</p>
                  <p className="text-sm text-gray-500 mt-1">When investors are interested in your startup, their requests will appear here</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recommended Investors</h2>
              <Link to="/investors" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                View all
              </Link>
            </CardHeader>
            
            <CardBody className="space-y-4">
              {loading ? (
                <p className="text-gray-500 text-center py-4">Loading investors...</p>
              ) : error ? (
                <p className="text-error-500 text-center py-4">{error}</p>
              ) : recommendedInvestors.length > 0 ? (
                recommendedInvestors.map((investor: InvestorProfile) => (
                  <div key={investor.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-2">
                      <img 
                        src={investor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(investor.name)}&background=random`} 
                        alt={investor.name}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{investor.name}</h3>
                        <p className="text-sm text-gray-500">Investor</p>
                      </div>
                    </div>
                    {Array.isArray(investor.investmentInterests) && investor.investmentInterests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {investor.investmentInterests.slice(0, 3).map((interest: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{investor.bio || 'No bio available'}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No investors found</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
