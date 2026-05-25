'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, tenantsApi, unitsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Wrench } from 'lucide-react';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'AC_HVAC', 'PEST_CONTROL', 'PAINTING', 'CARPENTRY', 'CLEANING', 'LANDSCAPING', 'APPLIANCE', 'STRUCTURAL', 'GENERAL'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];

const SLA_HOURS: Record<string, number> = {
  EMERGENCY: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 120,
};

export default function NewTicketPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: unitsData } = useQuery({
    queryKey: ['units-all'],
    queryFn: () => unitsApi.list(),
  });
  const units: any[] = Array.isArray(unitsData) ? unitsData : (unitsData as any)?.data ?? [];

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: () => tenantsApi.list(),
  });
  const tenants: any[] = Array.isArray(tenantsData) ? tenantsData : (tenantsData as any)?.data ?? [];

  const [form, setForm] = useState({
    unitId: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    title: '',
    description: '',
    raisedByTenantId: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => ticketsApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['tickets-board'] });
      qc.invalidateQueries({ queryKey: ['tickets-list'] });
      toast.success('Maintenance ticket created');
      const id = res?.id ?? res?.data?.id;
      router.push(id ? `/tickets/${id}` : '/tickets');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to create ticket'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unitId || !form.title) {
      toast.error('Unit and title are required');
      return;
    }
    mutation.mutate({
      unitId: form.unitId,
      category: form.category,
      priority: form.priority,
      title: form.title,
      ...(form.description && { description: form.description }),
      ...(form.raisedByTenantId && { raisedByTenantId: form.raisedByTenantId }),
      slaHours: SLA_HOURS[form.priority] ?? 48,
    });
  };

  const selectedUnit = units.find((u: any) => u.id === form.unitId);
  const unitTenants = tenants.filter((t: any) =>
    t.leases?.some((l: any) => l.unitId === form.unitId && l.status === 'ACTIVE')
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
          <Wrench className="w-4 h-4 text-orange-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">New Maintenance Ticket</h1>
          <p className="text-xs text-gray-500">Log a maintenance request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Unit <span className="text-red-500">*</span></Label>
              <select value={form.unitId} onChange={set('unitId')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Select unit...</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber} — {u.property?.name}
                  </option>
                ))}
              </select>
            </div>
            {form.unitId && (
              <div className="space-y-1.5">
                <Label>Reported by (Tenant)</Label>
                <select value={form.raisedByTenantId} onChange={set('raisedByTenantId')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">System / PM (no tenant)</option>
                  {tenants.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Issue Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={form.category} onChange={set('category')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select value={form.priority} onChange={set('priority')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{p} — {SLA_HOURS[p]}h SLA</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. AC not cooling in master bedroom" value={form.title} onChange={set('title')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <textarea
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px] resize-none"
                  placeholder="Describe the issue in detail..."
                  value={form.description}
                  onChange={set('description')}
                />
              </div>
            </div>
            <div className={`p-3 rounded-lg text-xs ${form.priority === 'EMERGENCY' ? 'bg-red-50 text-red-700' : form.priority === 'HIGH' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
              SLA: {SLA_HOURS[form.priority]}h response time required for {form.priority.toLowerCase()} priority
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
            {mutation.isPending ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </div>
  );
}
