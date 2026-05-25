'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Users } from 'lucide-react';

const KYC_TYPES = ['UAE_NATIONAL', 'EXPAT_RESIDENT', 'NON_RESIDENT', 'TOURIST'];

export default function NewTenantPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    fullName: '',
    phone: '+971',
    email: '',
    nationality: '',
    kycType: 'EXPAT_RESIDENT',
    passportNo: '',
    emiratesId: '',
    visaNumber: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => tenantsApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
      const id = res?.id ?? res?.data?.id;
      router.push(id ? `/tenants/${id}` : '/tenants');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to create tenant'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone) {
      toast.error('Full name and phone are required');
      return;
    }
    mutation.mutate({
      fullName: form.fullName,
      phone: form.phone,
      ...(form.email && { email: form.email }),
      ...(form.nationality && { nationality: form.nationality }),
      ...(form.kycType && { kycType: form.kycType }),
      ...(form.passportNo && { passportNo: form.passportNo }),
      ...(form.emiratesId && { emiratesId: form.emiratesId }),
      ...(form.visaNumber && { visaNumber: form.visaNumber }),
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Users className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Add Tenant</h1>
          <p className="text-xs text-gray-500">Register a new tenant in the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input placeholder="John Smith" value={form.fullName} onChange={set('fullName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone <span className="text-red-500">*</span></Label>
                <Input placeholder="+971501234567" value={form.phone} onChange={set('phone')} />
                <p className="text-xs text-gray-400">This will be the tenant's login phone number</p>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="john@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input placeholder="Indian" value={form.nationality} onChange={set('nationality')} />
              </div>
              <div className="space-y-1.5">
                <Label>KYC Type</Label>
                <select value={form.kycType} onChange={set('kycType')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {KYC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Identity Documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Emirates ID</Label>
                <Input placeholder="784-XXXX-XXXXXXX-X" value={form.emiratesId} onChange={set('emiratesId')} />
              </div>
              <div className="space-y-1.5">
                <Label>Passport No.</Label>
                <Input placeholder="A1234567" value={form.passportNo} onChange={set('passportNo')} />
              </div>
              <div className="space-y-1.5">
                <Label>Visa Number</Label>
                <Input placeholder="UAE Visa No." value={form.visaNumber} onChange={set('visaNumber')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
            {mutation.isPending ? 'Creating...' : 'Create Tenant'}
          </Button>
        </div>
      </form>
    </div>
  );
}
