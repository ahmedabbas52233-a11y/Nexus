import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Building2, MapPin, BarChart3, Briefcase, ArrowLeft, Edit, Save, X, CalendarClock } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { profileAPI } from '../../services/api';
import { ScheduleMeetingModal } from '../../components/meetings/ScheduleMeetingModal';
import toast from 'react-hot-toast';

interface ProfileData {
  id?: number;
  userId: number;
  startupName?: string;
  pitchSummary?: string;
  fundingNeeded?: string;
  industry?: string;
  location?: string;
  foundedYear?: number;
  teamSize?: number;
  investmentInterests?: string[];
  investmentStage?: string[];
  portfolioCompanies?: string[];
  totalInvestments?: number;
  minimumInvestment?: string;
  maximumInvestment?: string;
  website?: string;
  experience?: string[];
  education?: string[];
  preferences?: Record<string, unknown>;
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
  createdAt?: string;
}

export const InvestorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    investmentInterests: '',
    investmentStage: '',
    portfolioCompanies: '',
    totalInvestments: '',
    minimumInvestment: '',
    maximumInvestment: '',
    location: '',
    bio: '',
  });

  const isCurrentUser = !id || String(currentUser?.id) === String(id);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let data;
        if (id) {
          data = await profileAPI.getProfileById(id);
        } else {
          data = await profileAPI.getMyProfile();
        }
        
        const profileData: ProfileData = data.profile;
        setProfile(profileData);
        setUser(profileData);
        
        setFormData({
          investmentInterests: Array.isArray(profileData.investmentInterests) 
            ? profileData.investmentInterests.join(', ') 
            : (profileData.investmentInterests || ''),
          investmentStage: Array.isArray(profileData.investmentStage) 
            ? profileData.investmentStage.join(', ') 
            : (profileData.investmentStage || ''),
          portfolioCompanies: Array.isArray(profileData.portfolioCompanies) 
            ? profileData.portfolioCompanies.join(', ') 
            : (profileData.portfolioCompanies || ''),
          totalInvestments: String(profileData.totalInvestments || ''),
          minimumInvestment: profileData.minimumInvestment || '',
          maximumInvestment: profileData.maximumInvestment || '',
          location: profileData.location || '',
          bio: profileData.bio || '',
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const updateData = {
        investmentInterests: formData.investmentInterests.split(',').map((s: string) => s.trim()).filter(Boolean),
        investmentStage: formData.investmentStage.split(',').map((s: string) => s.trim()).filter(Boolean),
        portfolioCompanies: formData.portfolioCompanies.split(',').map((s: string) => s.trim()).filter(Boolean),
        totalInvestments: formData.totalInvestments ? parseInt(formData.totalInvestments) : 0,
        minimumInvestment: formData.minimumInvestment,
        maximumInvestment: formData.maximumInvestment,
        location: formData.location,
        bio: formData.bio,
      };
      
      const data = await profileAPI.updateProfile(updateData);
      if (!data.success) throw new Error(data.message || 'Failed to save profile');

      setProfile(data.profile);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error((error as Error).message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!profile || !user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Investor not found</h2>
        <p className="text-gray-600 mt-2">The investor profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isEmpty = !profile.investmentInterests?.length && !profile.minimumInvestment && !profile.maximumInvestment;
  
  if (isCurrentUser && (isEmpty || isEditing)) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEmpty ? 'Create Your Investor Profile' : 'Edit Profile'}
          </h1>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Investment Interests (comma-separated)</label>
                <input
                  type="text"
                  value={formData.investmentInterests}
                  onChange={(e) => setFormData({...formData, investmentInterests: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., FinTech, SaaS, AI/ML"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Investment Stages (comma-separated)</label>
                <input
                  type="text"
                  value={formData.investmentStage}
                  onChange={(e) => setFormData({...formData, investmentStage: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Seed, Series A, Series B"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Investment</label>
                  <input
                    type="text"
                    value={formData.minimumInvestment}
                    onChange={(e) => setFormData({...formData, minimumInvestment: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., $250K"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Investment</label>
                  <input
                    type="text"
                    value={formData.maximumInvestment}
                    onChange={(e) => setFormData({...formData, maximumInvestment: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., $5M"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Investments</label>
                <input
                  type="number"
                  value={formData.totalInvestments}
                  onChange={(e) => setFormData({...formData, totalInvestments: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Companies (comma-separated)</label>
                <input
                  type="text"
                  value={formData.portfolioCompanies}
                  onChange={(e) => setFormData({...formData, portfolioCompanies: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Stripe, Airbnb, Uber"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Tell us about your investment philosophy"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                {!isEmpty && (
                  <Button variant="outline" onClick={() => setIsEditing(false)} leftIcon={<X size={18} />}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {showScheduleModal && (
        <ScheduleMeetingModal
          recipientId={Number(user.id)}
          recipientName={user.name}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={() => setShowScheduleModal(false)}
        />
      )}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&background=random`}
              alt={user.name || ''}
              size="xl"
              status={user.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Investor • {profile.totalInvestments || 0} investments
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {profile.location && (
                  <Badge variant="gray">
                    <MapPin size={14} className="mr-1" />
                    {profile.location}
                  </Badge>
                )}
                {Array.isArray(profile.investmentStage) && profile.investmentStage.map((stage: string, index: number) => (
                  <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <Link to={`/chat/${user.id}`}>
                <Button leftIcon={<MessageCircle size={18} />}>
                  Message
                </Button>
              </Link>
            )}
            {!isCurrentUser && (
              <Button variant="outline" leftIcon={<CalendarClock size={18} />} onClick={() => setShowScheduleModal(true)}>
                Schedule Meeting
              </Button>
            )}
            {isCurrentUser && (
              <Button variant="outline" leftIcon={<Edit size={18} />} onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">{user.bio || 'No bio available'}</p>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Interests</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900">Industries</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.isArray(profile.investmentInterests) && profile.investmentInterests.map((interest: string, index: number) => (
                      <Badge key={index} variant="primary" size="md">{interest}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900">Investment Stages</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.isArray(profile.investmentStage) && profile.investmentStage.map((stage: string, index: number) => (
                      <Badge key={index} variant="secondary" size="md">{stage}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {Array.isArray(profile.portfolioCompanies) && profile.portfolioCompanies.length > 0 && (
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Portfolio Companies</h2>
                <span className="text-sm text-gray-500">{profile.portfolioCompanies.length} companies</span>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.portfolioCompanies.map((company: string, index: number) => (
                    <div key={index} className="flex items-center p-3 border border-gray-200 rounded-md">
                      <div className="p-3 bg-primary-50 rounded-md mr-3">
                        <Briefcase size={18} className="text-primary-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{company}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Details</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {(profile.minimumInvestment || profile.maximumInvestment) && (
                  <div>
                    <span className="text-sm text-gray-500">Investment Range</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {profile.minimumInvestment || 'N/A'} - {profile.maximumInvestment || 'N/A'}
                    </p>
                  </div>
                )}
                
                {(profile.totalInvestments || 0) > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">Total Investments</span>
                    <p className="text-md font-medium text-gray-900">{profile.totalInvestments} companies</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Stats</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Total Investments</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">{profile.totalInvestments || 0}</p>
                    </div>
                    <BarChart3 size={24} className="text-primary-600" />
                  </div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Portfolio Companies</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">
                        {Array.isArray(profile.portfolioCompanies) ? profile.portfolioCompanies.length : 0}
                      </p>
                    </div>
                    <Briefcase size={24} className="text-primary-600" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
