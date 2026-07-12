import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { meetingAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ScheduleMeetingModalProps {
  recipientId: number;
  recipientName: string;
  onClose: () => void;
  onScheduled: () => void;
}

const toLocalInputValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  recipientId,
  recipientName,
  onClose,
  onScheduled,
}) => {
  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  defaultStart.setMinutes(0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 30 * 60 * 1000);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(toLocalInputValue(defaultStart));
  const [endTime, setEndTime] = useState(toLocalInputValue(defaultEnd));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      toast.error('End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      const data = await meetingAPI.createMeeting({
        title: title.trim(),
        description: description.trim(),
        recipientId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      if (!data.success) throw new Error(data.message || 'Failed to schedule meeting');
      toast.success('Meeting request sent');
      onScheduled();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Schedule a meeting</h3>
        <p className="text-sm text-gray-500 mb-4">with {recipientName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Series A pitch call"
            fullWidth
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              fullWidth
              required
            />
            <Input
              label="End time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              fullWidth
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={submitting}>Send request</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
