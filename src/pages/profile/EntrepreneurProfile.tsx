import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Calendar, Building2, MapPin, DollarSign, Send, ArrowLeft, Edit, Save, X } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { profileAPI } from '../../services/api';

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasRequestedCollaboration, setHasRequestedCollaboration] = useState(false);
  
  const [formData, setFormData] = useState({
    startupName: '',
    pitchSummary: '',
    industry: '',
    location: '',
    fundingNeeded: '',
    foundedYear: '',
    teamSize: '',
    website: '',
    bio: '',
  });

  // FIX: Use String() to compare number vs string IDs
  const isCurrentUser = !id || String(currentUser?.id) === String(id);
  const isInvestor = currentUser?.role === 'investor';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let data;
        if (id) {
          data = await profileAPI.getProfileById(id);
        } else {
          data = await profileAPI.getMyProfile();
        }
        
        const profileData = data.profile;
        setProfile(profileData);
        setUser(profileData);
        
        setFormData({
          startupName: profileData.startupName || '',
          pitchSummary: profileData.pitchSummary || '',
          industry: profileData.industry || '',
          location: profileData.location || '',
          fundingNeeded: profileData.fundingNeeded || '',
          foundedYear: profileData.foundedYear || '',
          teamSize: profileData.teamSize || '',
          website: profileData.website || '',
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
    try {
      const data = await profileAPI.updateProfile(formData);
      setProfile(data.profile);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleSendRequest = () => {
    setHasRequestedCollaboration(true);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!profile || !user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Entrepreneur not found</h2>
        <p className="text-gray-600 mt-2">The entrepreneur profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // FIX: Check for empty/null/0 values properly
  const isEmpty = !profile.startupName && !profile.pitchSummary && !profile.industry;
  
  if (isCurrentUser && (isEmpty || isEditing)) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEmpty ? 'Create Your Startup Profile' : 'Edit Profile'}
          </h1>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startup Name</label>
                <input
                  type="text"
                  value={formData.startupName}
                  onChange={(e) => setFormData({...formData, startupName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your startup name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pitch Summary</label>
                <textarea
                  value={formData.pitchSummary}
                  onChange={(e) => setFormData({...formData, pitchSummary: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                  placeholder="Describe your startup in a few sentences"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Technology, Healthcare"
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Funding Needed</label>
                  <input
                    type="text"
                    value={formData.fundingNeeded}
                    onChange={(e) => setFormData({...formData, fundingNeeded: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., $500K"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                  <input
                    type="number"
                    value={formData.foundedYear}
                    onChange={(e) => setFormData({...formData, foundedYear: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="2024"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://yourstartup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Tell us about yourself"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" leftIcon={<Save size={18} />}>
                  Save Profile
                </Button>
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

  // Profile view
  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
              size="xl"
              status={user.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Founder at {profile.startupName || 'Unnamed Startup'}
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {profile.industry && <Badge variant="primary">{profile.industry}</Badge>}
                {profile.location && (
                  <Badge variant="gray">
                    <MapPin size={14} className="mr-1" />
                    {profile.location}
                  </Badge>
                )}
                {/* FIX: Don't show if 0 or empty */}
                {profile.foundedYear > 0 && (
                  <Badge variant="accent">
                    <Calendar size={14} className="mr-1" />
                    Founded {profile.foundedYear}
                  </Badge>
                )}
                {profile.teamSize > 0 && (
                  <Badge variant="secondary">
                    <Users size={14} className="mr-1" />
                    {profile.teamSize} team members
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${user.id}`}>
                  <Button variant="outline" leftIcon={<MessageCircle size={18} />}>
                    Message
                  </Button>
                </Link>
                {isInvestor && (
                  <Button leftIcon={<Send size={18} />} disabled={hasRequestedCollaboration} onClick={handleSendRequest}>
                    {hasRequestedCollaboration ? 'Request Sent' : 'Request Collaboration'}
                  </Button>
                )}
              </>
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
          
          {profile.pitchSummary && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Startup Overview</h2>
              </CardHeader>
              <CardBody>
                <p className="text-gray-700">{profile.pitchSummary}</p>
              </CardBody>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Details</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {profile.fundingNeeded && (
                  <div>
                    <span className="text-sm text-gray-500">Funding Needed</span>
                    <div className="flex items-center mt-1">
                      <DollarSign size={18} className="text-accent-600 mr-1" />
                      <p className="text-lg font-semibold text-gray-900">{profile.fundingNeeded}</p>
                    </div>
                  </div>
                )}
                {profile.website && (
                  <div>
                    <span className="text-sm text-gray-500">Website</span>
                    <p className="text-md font-medium text-gray-900 mt-1">
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        {profile.website}
                      </a>
                    </p>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin size={18} />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
