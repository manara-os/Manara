'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, DollarSign, Receipt, Building2, X } from 'lucide-react';
import { financeApi, leasesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = ['Collections', 'PDC Cheques', 'Expenses', 'Overdue', 'Commissions'] as const;
type Tab = typeof TABS[number];

const CHEQUE_STATUS_STYLE: Record<string, string> = {
  CLEARED: 'bg-green-50 text-green-700 border-green-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  BOUNCED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
  DEPOSITED: 'bg-blue-50 text-blue-700 border-blue-200',
};

const EXPENSE_CATEGORIES = ['MAINTENANCE', 'UTILITIES', 'INSURANCE', 'MANAGEMENT_FEE', 'REPAIRS', 'CLEANING', 'LANDSCAPING', 'SECURITY', 'ADMIN', 'OTHER'];
const PAYMENT_METHODS = ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'ONLINE', 'CARD'];

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    leaseId: '',
    amount: '',
    collectedAt: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER',
    notes: '',
  });

  const { data: leasesData } = useQuery({
    queryKey: ['leases-active-finance'],
    queryFn: () => leasesApi.list({ status: 'ACTIVE' }),
  });
  const leases: any[] = Array.isArray(leasesData) ? leasesData : (leasesData as any)?.data ?? [];

  const mutation = useMutation({
    mutationFn: (data: any) => financeApi.recordPayment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-collections'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Payment recorded');
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to record payment'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaseId || !form.amount) {
      toast.error('Lease and amount are required');
      return;
    }
    mutation.mutate({
      leaseId: form.leaseId,
      amount: parseFloat(form.amount),
      collectedAt: new Date(form.collectedAt),
      method: form.method,
      ...(form.notes && { notes: form.notes }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Lease <span className="text-red-500">*</span></Label>
            <select
              value={form.leaseId}
              onChange={e => setForm(f => ({ ...f, leaseId: e.target.value }))}
              className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select lease...</option>
              {leases.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.tenant?.fullName} — {l.unit?.unitNumber} ({l.unit?.property?.name})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount (AED) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.collectedAt}
                onChange={e => setForm(f => ({ ...f, collectedAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <select
              value={form.method}
              onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
              className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              placeholder="Optional notes..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {mutation.isPending ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddExpenseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    description: '',
    category: 'MAINTENANCE',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => financeApi.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-expenses'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Expense added');
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to add expense'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) {
      toast.error('Description and amount are required');
      return;
    }
    mutation.mutate({
      description: form.description,
      category: form.category,
      amount: parseFloat(form.amount),
      expenseDate: new Date(form.expenseDate),
      ...(form.notes && { notes: form.notes }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Description <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. AC maintenance contract"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (AED) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              placeholder="Optional notes..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {mutation.isPending ? 'Saving...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Collections');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.getSummary(),
    staleTime: 60 * 1000,
  });

  const { data: collections = [], isLoading: collectionsLoading } = useQuery({
    queryKey: ['finance-collections'],
    queryFn: () => financeApi.getCollections(),
    staleTime: 2 * 60 * 1000,
    enabled: activeTab === 'Collections',
  });

  const { data: cheques = [], isLoading: chequesLoading } = useQuery({
    queryKey: ['finance-cheques'],
    queryFn: () => financeApi.getPdcCheques(),
    staleTime: 2 * 60 * 1000,
    enabled: activeTab === 'PDC Cheques',
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['finance-expenses'],
    queryFn: () => financeApi.getExpenses(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: overdue = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-cheques'],
    queryFn: () => financeApi.getOverdue(),
    staleTime: 2 * 60 * 1000,
    enabled: activeTab === 'Overdue',
  });

  const { data: commissionsData = [], isLoading: commissionsLoading } = useQuery({
    queryKey: ['finance-commissions'],
    queryFn: () => financeApi.listCommissions(),
    staleTime: 2 * 60 * 1000,
    enabled: activeTab === 'Commissions',
  });
  const commissionsArr = Array.isArray(commissionsData) ? commissionsData : (commissionsData as any)?.data ?? [];

  const updateChequeMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      financeApi.updateCheque(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-cheques'] });
      qc.invalidateQueries({ queryKey: ['overdue-cheques'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Cheque status updated');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to update cheque'),
  });

  const collectionsArr = Array.isArray(collections) ? collections : (collections as any)?.data ?? [];
  const chequesArr = Array.isArray(cheques) ? cheques : (cheques as any)?.data ?? [];
  const expensesArr = Array.isArray(expenses) ? expenses : (expenses as any)?.data ?? [];
  const overdueArr = Array.isArray(overdue) ? overdue : (overdue as any)?.data ?? [];

  const totalExpenses = expensesArr.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalCheques = chequesArr.filter((c: any) => c.status === 'PENDING').length;

  const stats = [
    {
      label: 'Revenue MTD',
      value: formatCurrency(Number((summary as any)?.revenueMtd ?? 0), 'AED'),
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      sub: 'Month to date',
    },
    {
      label: 'Overdue Rent',
      value: formatCurrency(Number((summary as any)?.overdueAmount ?? 0), 'AED'),
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      sub: `${(summary as any)?.overdueCount ?? 0} pending cheques`,
    },
    {
      label: 'Occupancy Rate',
      value: `${(summary as any)?.occupancyRate ?? 0}%`,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      sub: `${(summary as any)?.totalUnits ?? 0} total units`,
    },
    {
      label: 'YTD Expenses',
      value: formatCurrency(totalExpenses, 'AED'),
      icon: Receipt,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      sub: `${expensesArr.length} transactions`,
    },
  ];

  return (
    <div className="p-5">
      {showPaymentModal && <RecordPaymentModal onClose={() => setShowPaymentModal(false)} />}
      {showExpenseModal && <AddExpenseModal onClose={() => setShowExpenseModal(false)} />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Finance</h1>
          <p className="text-xs text-gray-500 mt-0.5">Rent collections, PDC cheques & expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8" asChild>
            <Link href="/finance/ledger">📒 General Ledger</Link>
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowPaymentModal(true)}>
            Record Payment
          </Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs h-8" onClick={() => setShowExpenseModal(true)}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  {stat.sub && <p className="text-[11px] text-gray-400">{stat.sub}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Overdue' && overdueArr.length > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-700 rounded-full px-1.5 py-0.5 text-[10px]">
                {overdueArr.length}
              </span>
            )}
            {tab === 'PDC Cheques' && totalCheques > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 text-[10px]">
                {totalCheques}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Collections Tab */}
      {activeTab === 'Collections' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {collectionsLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : collectionsArr.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm mb-3">No collections recorded yet</p>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs" onClick={() => setShowPaymentModal(true)}>
                  Record First Payment
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {collectionsArr.slice(0, 20).map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.lease?.tenant?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.lease?.unit?.unitNumber} · {c.lease?.unit?.property?.name}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(Number(c.amount), 'AED')}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.method?.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.collectedAt)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {c.periodStart ? new Date(c.periodStart).toLocaleDateString('en-AE', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* PDC Cheques Tab */}
      {activeTab === 'PDC Cheques' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {chequesLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : chequesArr.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No PDC cheques registered</div>
            ) : (
              <>
                <div className="flex gap-3 px-4 pt-4 pb-3 border-b border-gray-100 flex-wrap">
                  {(['CLEARED', 'PENDING', 'DEPOSITED', 'BOUNCED', 'CANCELLED'] as const).map(status => {
                    const count = chequesArr.filter((c: any) => c.status === status).length;
                    if (count === 0) return null;
                    const total = chequesArr.filter((c: any) => c.status === status).reduce((s: number, c: any) => s + Number(c.amount), 0);
                    return (
                      <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${CHEQUE_STATUS_STYLE[status]}`}>
                        <span className="font-semibold">{count} {status}</span>
                        <span className="opacity-70">· {formatCurrency(total, 'AED')}</span>
                      </div>
                    );
                  })}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cheque No.</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Bank</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {chequesArr.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.chequeNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{c.lease?.tenant?.fullName || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{c.bankName || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(Number(c.amount), 'AED')}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.dueDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs border px-2 py-0.5 rounded-full ${CHEQUE_STATUS_STYLE[c.status] ?? 'bg-gray-50 text-gray-500'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateChequeMutation.mutate({ id: c.id, status: 'CLEARED' })}
                                disabled={updateChequeMutation.isPending}
                                className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => updateChequeMutation.mutate({ id: c.id, status: 'DEPOSITED' })}
                                disabled={updateChequeMutation.isPending}
                                className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                Deposit
                              </button>
                              <button
                                onClick={() => updateChequeMutation.mutate({ id: c.id, status: 'BOUNCED' })}
                                disabled={updateChequeMutation.isPending}
                                className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                              >
                                Bounce
                              </button>
                            </div>
                          )}
                          {c.status === 'DEPOSITED' && (
                            <button
                              onClick={() => updateChequeMutation.mutate({ id: c.id, status: 'CLEARED' })}
                              disabled={updateChequeMutation.isPending}
                              className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              Mark Cleared
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expenses Tab */}
      {activeTab === 'Expenses' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {expensesLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : expensesArr.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm mb-3">No expenses recorded</p>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs" onClick={() => setShowExpenseModal(true)}>
                  Add First Expense
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expensesArr.map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.description}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{e.category?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(Number(e.amount), 'AED')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(e.expenseDate)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[200px]">{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Commissions Tab */}
      {activeTab === 'Commissions' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {commissionsLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : commissionsArr.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No commissions recorded</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lease</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissionsArr.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.lease?.unit?.unitNumber} · {c.lease?.unit?.property?.name}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.lease?.tenant?.fullName ?? '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{c.type}</span></td>
                      <td className="px-4 py-3 font-semibold text-amber-700">{formatCurrency(Number(c.amount), 'AED')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.submittedAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === 'VERIFIED' ? 'success' : c.status === 'PAID' ? 'success' : c.status === 'WAIVED' ? 'secondary' : 'warning'}>
                          {c.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overdue Tab */}
      {activeTab === 'Overdue' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {overdueLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : overdueArr.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <div className="text-green-600 font-medium mb-1">No overdue payments</div>
                All tenants are up to date
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cheque</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {overdueArr.map((cheque: any) => (
                    <tr key={cheque.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{cheque.lease?.tenant?.fullName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{cheque.lease?.unit?.unitNumber} · {cheque.lease?.unit?.property?.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{cheque.chequeNumber}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(Number(cheque.amount), 'AED')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(cheque.dueDate)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateChequeMutation.mutate({ id: cheque.id, status: 'CLEARED' })}
                          disabled={updateChequeMutation.isPending}
                          className="text-xs px-3 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                        >
                          Mark Cleared
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
