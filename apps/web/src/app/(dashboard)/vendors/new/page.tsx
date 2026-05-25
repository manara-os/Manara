'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Truck, X } from 'lucide-react';

const ALL_CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'AC_HVAC', 'PEST_CONTROL', 'PAINTING', 'CARPENTRY', 'CLEANING', 'LANDSCAPING', 'APPLIANCE', 'STRUCTURAL', 'GENERAL'];
const DUBAI_AREAS = ['Dubai Marina', 'JBR', 'JVC', 'Downtown Dubai', 'Business Bay', 'DIFC', 'Palm Jumeirah', 'Deira', 'Bur Dubai', 'Jumeirah', 'Al Barsha', 'Mirdif', 'Dubai Hills', 'Arabian Ranches'];

export default function NewVendorPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    phone: '+971',
    email: '',
    tradeLicenseNo: '',
    tradeLicenseExpiry: '',
    serviceCategories: [] as string[],
    coverageAreas: [] as string[],
  });
  const [areaInput, setAreaInput] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => vendorsApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor added successfully');
      const id = res?.id ?? res?.data?.id;
      router.push(id ? `/vendors/${id}` : '/vendors');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to add vendor'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      serviceCategories: f.serviceCategories.includes(cat)
        ? f.serviceCategories.filter(c => c !== cat)
        : [...f.serviceCategories, cat],
    }));
  };

  const toggleArea = (area: string) => {
    setForm(f => ({
      ...f,
      coverageAreas: f.coverageAreas.includes(area)
        ? f.coverageAreas.filter(a => a !== area)
        : [...f.coverageAreas, area],
    }));
  };

  const addCustomArea = () => {
    const a = areaInput.trim();
    if (a && !form.coverageAreas.includes(a)) {
      setForm(f => ({ ...f, coverageAreas: [...f.coverageAreas, a] }));
      setAreaInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.contactName || !form.phone) {
      toast.error('Company name, contact name and phone are required');
      return;
    }
    if (form.serviceCategories.length === 0) {
      toast.error('Select at least one service category');
      return;
    }
    mutation.mutate({
      companyName: form.companyName,
      contactName: form.contactName,
      phone: form.phone,
      ...(form.email && { email: form.email }),
      ...(form.tradeLicenseNo && { tradeLicenseNo: form.tradeLicenseNo }),
      ...(form.tradeLicenseExpiry && { tradeLicenseExpiry: new Date(form.tradeLicenseExpiry) }),
      serviceCategories: form.serviceCategories,
      coverageAreas: form.coverageAreas,
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <Truck className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Add Vendor</h1>
          <p className="text-xs text-gray-500">Add a new service provider to your network</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Company Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Company Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. QuickFix Maintenance LLC" value={form.companyName} onChange={set('companyName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person <span className="text-red-500">*</span></Label>
                <Input placeholder="Ali Hassan" value={form.contactName} onChange={set('contactName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone <span className="text-red-500">*</span></Label>
                <Input placeholder="+971501234567" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="ops@vendor.ae" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>Trade License No.</Label>
                <Input placeholder="TL-DUBAI-2024-XXXXX" value={form.tradeLicenseNo} onChange={set('tradeLicenseNo')} />
              </div>
              <div className="space-y-1.5">
                <Label>License Expiry</Label>
                <Input type="date" value={form.tradeLicenseExpiry} onChange={set('tradeLicenseExpiry')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Service Categories <span className="text-red-500">*</span></CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    form.serviceCategories.includes(cat)
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Coverage Areas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {DUBAI_AREAS.map(area => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    form.coverageAreas.includes(area)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom area..."
                value={areaInput}
                onChange={e => setAreaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomArea())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomArea}>Add</Button>
            </div>
            {form.coverageAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.coverageAreas.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {a}
                    <button type="button" onClick={() => toggleArea(a)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
            {mutation.isPending ? 'Adding...' : 'Add Vendor'}
          </Button>
        </div>
      </form>
    </div>
  );
}
