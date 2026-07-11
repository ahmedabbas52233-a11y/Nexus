import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { transactionAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

type TxType = 'deposit' | 'withdraw' | 'transfer';
type TxStatus = 'pending' | 'completed' | 'failed';

interface Transaction {
  id: number;
  userId: number;
  type: TxType;
  amount: number;
  status: TxStatus;
  description: string;
  createdAt: string;
}

const statusBadge = (status: TxStatus) => {
  switch (status) {
    case 'completed':
      return <Badge variant="success"><span className="flex items-center gap-1"><CheckCircle2 size={12} /> Completed</span></Badge>;
    case 'failed':
      return <Badge variant="error"><span className="flex items-center gap-1"><XCircle size={12} /> Failed</span></Badge>;
    default:
      return <Badge variant="secondary"><span className="flex items-center gap-1"><Clock size={12} /> Pending</span></Badge>;
  }
};

export const PaymentsPage: React.FC = () => {
  const { socket } = useSocket();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<TxType>('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await transactionAPI.getMyTransactions();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Live settlement updates pushed by the mock payment gateway
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updated: Transaction) => {
      setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      if (updated.status === 'completed') {
        toast.success(`${updated.type} of $${updated.amount} completed`);
      } else if (updated.status === 'failed') {
        toast.error(`${updated.type} of $${updated.amount} failed`);
      }
    };
    socket.on('transaction:update', handleUpdate);
    return () => { socket.off('transaction:update', handleUpdate); };
  }, [socket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      const data = await transactionAPI.createTransaction({ type, amount: numAmount, description });
      setTransactions(prev => [data.transaction, ...prev]);
      setAmount('');
      setDescription('');
      toast.success('Payment submitted — processing via sandbox gateway…');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.status !== 'completed') return acc;
      if (t.type === 'deposit') acc.balance += t.amount;
      if (t.type === 'withdraw') acc.balance -= t.amount;
      if (t.type === 'transfer') acc.balance -= t.amount;
      return acc;
    },
    { balance: 0 }
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600">Sandbox payment gateway — deposits, withdrawals, and transfers</p>
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-gray-600">Available balance (from completed transactions)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${totals.balance.toFixed(2)}</p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">New Transaction</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'deposit', label: 'Deposit', icon: <ArrowDownCircle size={16} /> },
                  { value: 'withdraw', label: 'Withdraw', icon: <ArrowUpCircle size={16} /> },
                  { value: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={16} /> },
                ] as { value: TxType; label: string; icon: React.ReactNode }[]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex flex-col items-center gap-1 py-2 px-2 rounded-md border text-xs ${
                      type === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>

              <Input
                label="Amount (USD)"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
              />

              <Input
                label="Description (optional)"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
              />

              <Button type="submit" fullWidth isLoading={submitting}>
                Submit {type}
              </Button>

              <p className="text-xs text-gray-500">
                This is a sandbox/mock gateway for demo purposes — transactions settle automatically within a few seconds.
              </p>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-sm capitalize text-gray-900">{t.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">${t.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">{statusBadge(t.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{t.description || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
