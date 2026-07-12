import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { Card, CardBody, CardFooter } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface InvestorProfile {
  id?: number;
  userId?: number;
  name?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  bio?: string;
  totalInvestments?: number;
  investmentStage?: string[];
  investmentInterests?: string[];
  minimumInvestment?: string;
  maximumInvestment?: string;
}

interface InvestorCardProps {
  investor: InvestorProfile;
  showActions?: boolean;
}

export const InvestorCard: React.FC<InvestorCardProps> = ({
  investor,
  showActions = true
}) => {
  const navigate = useNavigate();
  const investorId = investor.userId || investor.id;

  const handleViewProfile = () => {
    navigate(`/profile/investor/${investorId}`);
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    navigate(`/chat/${investorId}`);
  };

  const investmentStage = investor.investmentStage || [];
  const investmentInterests = investor.investmentInterests || [];

  return (
    <Card
      hoverable
      className="transition-all duration-300 h-full"
      onClick={handleViewProfile}
    >
      <CardBody className="flex flex-col">
        <div className="flex items-start">
          <Avatar
            src={investor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(investor.name || 'Investor')}&background=random`}
            alt={investor.name || 'Investor'}
            size="lg"
            status={investor.isOnline ? 'online' : 'offline'}
            className="mr-4"
          />

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{investor.name || 'Unnamed Investor'}</h3>
            <p className="text-sm text-gray-500 mb-2">Investor • {investor.totalInvestments || 0} investments</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {investmentStage.length > 0 ? (
                investmentStage.map((stage, index) => (
                  <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
                ))
              ) : (
                <span className="text-xs text-gray-400">No stage preference set</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Investment Interests</h4>
          <div className="flex flex-wrap gap-2">
            {investmentInterests.length > 0 ? (
              investmentInterests.map((interest, index) => (
                <Badge key={index} variant="primary" size="sm">{interest}</Badge>
              ))
            ) : (
              <span className="text-xs text-gray-400">No interests listed yet</span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-600 line-clamp-2">{investor.bio || 'No bio provided yet.'}</p>
        </div>

        {(investor.minimumInvestment || investor.maximumInvestment) && (
          <div className="mt-3 flex justify-between items-center">
            <div>
              <span className="text-xs text-gray-500">Investment Range</span>
              <p className="text-sm font-medium text-gray-900">
                {investor.minimumInvestment || '—'} - {investor.maximumInvestment || '—'}
              </p>
            </div>
          </div>
        )}
      </CardBody>

      {showActions && (
        <CardFooter className="border-t border-gray-100 bg-gray-50 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<MessageCircle size={16} />}
            onClick={handleMessage}
          >
            Message
          </Button>

          <Button
            variant="primary"
            size="sm"
            rightIcon={<ExternalLink size={16} />}
            onClick={handleViewProfile}
          >
            View Profile
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
