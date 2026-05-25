'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { propertiesApi, ownersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Building2 } from 'lucide-react';

const PROPERTY_TYPES = ['APARTMENT', 'VILLA', 'STUDIO', 'COMMERCIAL', 'COMPOUND', 'TOWNHOUSE', 'PENTHOUSE', 'OFFICE', 'RETAIL', 'WAREHOUSE'];

export default function NewPropertyPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: ownersData } = useQuery({
    queryKey: ['owners-list'],
    queryFn: () => ownersApi.list(),
  });
  const owners: any[] = Array.isArray(ownersData) ? ownersData : (ownersData as any)?.data ?? [];

  const [form, setForm] = useState({
    name: '',
    type: 'APARTMENT',
    city: 'Dubai',
    area: '',
    address: '',
    ownerId: '',
    titleDeedNo: '',
    yearBuilt: '',
    description: '',
    developerName: '',
    totalUnits: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => propertiesApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property created successfully');
      const id = res?.id ?? res?.data?.id;
      router.push(id ? `/properties/${id}` : '/properties');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to create property'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.city || !form.area || !form.address) {
      toast.error('Please fill in all required fields');
      return;
    }
    mutation.mutate({
      name: form.name,
      type: form.type,
      city: form.city,
      area: form.area,
      address: form.address,
      ...(form.ownerId && { ownerId: form.ownerId }),
      ...(form.titleDeedNo && { titleDeedNo: form.titleDeedNo }),
      ...(form.yearBuilt && { yearBuilt: parseInt(form.yearBuilt) }),
      ...(form.description && { description: form.description }),
      ...(form.developerName && { developerName: form.developerName }),
      ...(form.totalUnits && { totalUnits: parseInt(form.totalUnits) }),
      currencyCode: 'AED',
      countryCode: 'AE',
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Add Property</h1>
          <p className="text-xs text-gray-500">Create a new property in your portfolio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Property Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Green Valley Villas" value={form.name} onChange={set('name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Type <span className="text-red-500">*</span></Label>
                <select value={form.type} onChange={set('type')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <select value={form.ownerId} onChange={set('ownerId')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">No owner assigned</option>
                  {owners.map((o: any) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>City <span className="text-red-500">*</span></Label>
                <Input placeholder="Dubai" value={form.city} onChange={set('city')} />
              </div>
              <div className="space-y-1.5">
                <Label>Area / Community <span className="text-red-500">*</span></Label>
                <Input placeholder="Dubai Marina" value={form.area} onChange={set('area')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Full Address <span className="text-red-500">*</span></Label>
                <Input placeholder="Villa 12, Green Valley, Dubai Marina, Dubai, UAE" value={form.address} onChange={set('address')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Additional Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title Deed No.</Label>
                <Input placeholder="DEED-2024-DM-XXXXX" value={form.titleDeedNo} onChange={set('titleDeedNo')} />
              </div>
              <div className="space-y-1.5">
                <Label>Developer</Label>
                <Input placeholder="Emaar Properties" value={form.developerName} onChange={set('developerName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Year Built</Label>
                <Input type="number" placeholder="2020" min="1950" max="2030" value={form.yearBuilt} onChange={set('yearBuilt')} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Units</Label>
                <Input type="number" placeholder="1" min="1" value={form.totalUnits} onChange={set('totalUnits')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <textarea
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] resize-none"
                  placeholder="Brief description of the property..."
                  value={form.description}
                  onChange={set('description')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
            {mutation.isPending ? 'Creating...' : 'Create Property'}
          </Button>
        </div>
      </form>
    </div>
  );
}
