import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Check, X, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { meetingAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Meeting {
  id: number;
  title: string;
  description: string;
  requesterId: number;
  recipientId: number;
  requesterName: string;
  requesterEmail: string;
  recipientName: string;
  recipientEmail: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const statusBadge = (status: Meeting['status']) => {
  switch (status) {
    case 'accepted':
      return <Badge variant="success">Accepted</Badge>;
    case 'rejected':
      return <Badge variant="error">Rejected</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      const data = await meetingAPI.getMyMeetings();
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleRespond = async (meeting: Meeting, status: 'accepted' | 'rejected') => {
    setRespondingId(meeting.id);
    try {
      const data = await meetingAPI.updateStatus(String(meeting.id), status);
      if (!data.success) throw new Error(data.message || 'Failed to update meeting');
      setMeetings((prev) => prev.map((m) => (m.id === meeting.id ? data.meeting : m)));
      toast.success(status === 'accepted' ? 'Meeting accepted' : 'Meeting declined');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update meeting');
    } finally {
      setRespondingId(null);
    }
  };

  const meetingDates = meetings.map((m) => new Date(m.startTime));
  const meetingsOnSelectedDate = meetings
    .filter((m) => sameDay(new Date(m.startTime), selectedDate))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const upcoming = meetings
    .filter((m) => m.status !== 'rejected' && new Date(m.endTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pending = meetings.filter((m) => m.status === 'pending' && String(m.recipientId) === String(user?.id));

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <p className="text-gray-600">Schedule and manage meetings with your connections</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Calendar</h2>
          </CardHeader>
          <CardBody>
            <Calendar
              onChange={(value) => setSelectedDate(value as Date)}
              value={selectedDate}
              tileContent={({ date, view }) => {
                if (view !== 'month') return null;
                const hasMeeting = meetingDates.some((d) => sameDay(d, date));
                return hasMeeting ? (
                  <div className="flex justify-center mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  </div>
                ) : null;
              }}
              className="!w-full !border-none"
            />

            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              {meetingsOnSelectedDate.length === 0 ? (
                <p className="text-sm text-gray-500">No meetings scheduled</p>
              ) : (
                <div className="space-y-2">
                  {meetingsOnSelectedDate.map((m) => (
                    <div key={m.id} className="text-sm border-l-2 border-primary-400 pl-2">
                      <p className="font-medium text-gray-900">{m.title}</p>
                      <p className="text-gray-500">
                        {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(m.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Pending your response</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {pending.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{m.title}</p>
                      <p className="text-sm text-gray-500">
                        with {m.requesterName} · {new Date(m.startTime).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={respondingId === m.id}
                        onClick={() => handleRespond(m, 'rejected')}
                      >
                        <X size={16} />
                      </Button>
                      <Button
                        size="sm"
                        disabled={respondingId === m.id}
                        onClick={() => handleRespond(m, 'accepted')}
                      >
                        <Check size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Upcoming meetings</h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : upcoming.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No upcoming meetings</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Visit a profile and click "Schedule Meeting" to set one up
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((m) => {
                    const otherParty = String(m.requesterId) === String(user.id) ? m.recipientName : m.requesterName;
                    return (
                      <div key={m.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{m.title}</p>
                            {statusBadge(m.status)}
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Clock size={14} /> with {otherParty} · {new Date(m.startTime).toLocaleString()}
                          </p>
                          {m.description && <p className="text-sm text-gray-600 mt-1">{m.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
