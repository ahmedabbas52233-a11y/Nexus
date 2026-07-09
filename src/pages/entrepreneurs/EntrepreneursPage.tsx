import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, SlidersHorizontal } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { EntrepreneurCard } from '../../components/entrepreneur/EntrepreneurCard';
import { Button } from '../../components/ui/Button';
import { profileAPI } from '../../Services/api';

interface ApiEntrepreneur {
  id?: number;
  userId?: number;
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
  startupName?: string;
  industry?: string;
  location?: string;
  foundedYear?: number;
  pitchSummary?: string;
  fundingNeeded?: string;
  teamSize?: number;
  [key: string]: unknown;
}

export const EntrepreneursPage: React.FC = () => {
  const [entrepreneurs, setEntrepreneurs] = useState<ApiEntrepreneur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedFundingRange, setSelectedFundingRange] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchEntrepreneurs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await profileAPI.getAllProfiles('entrepreneur');
        
        if (data.profiles && Array.isArray(data.profiles)) {
          setEntrepreneurs(data.profiles);
        } else if (Array.isArray(data)) {
          setEntrepreneurs(data);
        } else {
          setError('Unexpected data format from server');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load startups';
        console.error('Failed to fetch entrepreneurs:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEntrepreneurs();
  }, []);

  const allIndustries = Array.from(new Set(entrepreneurs.map(e => e.industry).filter(Boolean))) as string[];
  const fundingRanges = ['< $500K', '$500K - $1M', '$1M - $5M', '> $5M'];
  
  const filteredEntrepreneurs = entrepreneurs.filter((entrepreneur: ApiEntrepreneur) => {
    const matchesSearch = searchQuery === '' || 
      (entrepreneur.name && entrepreneur.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entrepreneur.startupName && entrepreneur.startupName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entrepreneur.industry && entrepreneur.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entrepreneur.pitchSummary && entrepreneur.pitchSummary.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesIndustry = selectedIndustries.length === 0 ||
      (entrepreneur.industry && selectedIndustries.includes(entrepreneur.industry));
    
    const matchesFunding = selectedFundingRange.length === 0 || 
      selectedFundingRange.some(range => {
        const amountStr = entrepreneur.fundingNeeded || '0';
        const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
        switch (range) {
          case '< $500K': return amount < 500;
          case '$500K - $1M': return amount >= 500 && amount <= 1000;
          case '$1M - $5M': return amount > 1000 && amount <= 5000;
          case '> $5M': return amount > 5000;
          default: return true;
        }
      });
    
    return matchesSearch && matchesIndustry && matchesFunding;
  });
  
  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev => 
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  };
  
  const toggleFundingRange = (range: string) => {
    setSelectedFundingRange(prev => 
      prev.includes(range)
        ? prev.filter(r => r !== range)
        : [...prev, range]
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Find Startups</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">Find Startups</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Error loading startups</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Startups</h1>
        <p className="text-gray-600">Discover promising startups looking for investment</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Industry</h3>
                  <div className="space-y-2">
                    {allIndustries.map(industry => (
                      <button
                        key={industry}
                        onClick={() => toggleIndustry(industry)}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          selectedIndustries.includes(industry)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                    {allIndustries.length === 0 && (
                      <p className="text-sm text-gray-400 px-3">No industries available</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Funding Range</h3>
                  <div className="space-y-2">
                    {fundingRanges.map(range => (
                      <button
                        key={range}
                        onClick={() => toggleFundingRange(range)}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          selectedFundingRange.includes(range)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
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
              </div>
            </CardBody>
          </Card>
        </div>
        
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search startups by name, industry, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />
            
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredEntrepreneurs.length} results
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEntrepreneurs.map((entrepreneur) => (
              <EntrepreneurCard
                key={entrepreneur.userId || entrepreneur.id || 0}
                entrepreneur={entrepreneur}
              />
            ))}
          </div>
          
          {filteredEntrepreneurs.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Filter size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No startups found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};