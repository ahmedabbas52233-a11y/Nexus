import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { InvestorCard } from '../../components/investor/InvestorCard';
import { profileAPI } from '../../services/api';

interface ApiInvestor {
  id?: number;
  userId?: number;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  totalInvestments?: number;
  investmentStage?: string[];
  investmentInterests?: string[];
  minimumInvestment?: string;
  maximumInvestment?: string;
  [key: string]: unknown;
}

export const InvestorsPage: React.FC = () => {
  const [investors, setInvestors] = useState<ApiInvestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    const fetchInvestors = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await profileAPI.getAllProfiles('investor');
        if (data.profiles && Array.isArray(data.profiles)) {
          setInvestors(data.profiles);
        } else {
          setError('Unexpected data format from server');
        }
      } catch (err) {
        console.error('Failed to fetch investors:', err);
        setError(err instanceof Error ? err.message : 'Failed to load investors');
      } finally {
        setLoading(false);
      }
    };

    fetchInvestors();
  }, []);

  // Get unique investment stages and interests from real data
  const allStages = Array.from(new Set(investors.flatMap(i => i.investmentStage || [])));
  const allInterests = Array.from(new Set(investors.flatMap(i => i.investmentInterests || [])));

  const filteredInvestors = investors.filter(investor => {
    const name = investor.name || '';
    const bio = investor.bio || '';
    const interests = investor.investmentInterests || [];
    const stages = investor.investmentStage || [];

    const matchesSearch = searchQuery === '' ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interests.some(interest => interest.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStages = selectedStages.length === 0 ||
      stages.some(stage => selectedStages.includes(stage));

    const matchesInterests = selectedInterests.length === 0 ||
      interests.some(interest => selectedInterests.includes(interest));

    return matchesSearch && matchesStages && matchesInterests;
  });

  const toggleStage = (stage: string) => {
    setSelectedStages(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Find Investors</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-6">
            <Card><CardHeader><div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" /></CardHeader><CardBody><div className="h-48 bg-gray-100 animate-pulse rounded" /></CardBody></Card>
          </div>
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 mr-4" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Find Investors</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Error loading investors</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Investors</h1>
        <p className="text-gray-600">Connect with investors who match your startup's needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Investment Stage</h3>
                <div className="space-y-2">
                  {allStages.length > 0 ? allStages.map(stage => (
                    <button
                      key={stage}
                      onClick={() => toggleStage(stage)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                        selectedStages.includes(stage)
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {stage}
                    </button>
                  )) : (
                    <p className="text-sm text-gray-400 px-3">No stages available yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Investment Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {allInterests.length > 0 ? allInterests.map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-2 py-1 rounded-full text-xs ${
                        selectedInterests.includes(interest)
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {interest}
                    </button>
                  )) : (
                    <p className="text-sm text-gray-400">No interests available yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Location</h3>
                <div className="space-y-2">
                  <button className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    <MapPin size={16} className="mr-2" />
                    San Francisco, CA
                  </button>
                  <button className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    <MapPin size={16} className="mr-2" />
                    New York, NY
                  </button>
                  <button className="flex items-center w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    <MapPin size={16} className="mr-2" />
                    Boston, MA
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search investors by name, interests, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredInvestors.length} results
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredInvestors.map(investor => (
              <InvestorCard
                key={investor.userId || investor.id || 0}
                investor={investor}
              />
            ))}
          </div>

          {filteredInvestors.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Filter size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No investors found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
