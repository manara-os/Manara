'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { propertiesApi, unitsApi, ticketsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { X, User2, ChevronRight, Trash2, Calendar, Globe, Wallet, Info, Sparkles, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const OCCUPANCY_COLORS: Record<string, 'success' | 'warning' | 'secondary'> = {
  OCCUPIED: 'success',
  VACANT: 'warning',
  MAINTENANCE: 'secondary',
};

const PROPERTY_TYPES = ['APARTMENT', 'VILLA', 'STUDIO', 'COMMERCIAL', 'COMPOUND', 'TOWNHOUSE', 'PENTHOUSE', 'OFFICE', 'RETAIL', 'WAREHOUSE'];
const UNIT_TYPES = ['APARTMENT', 'STUDIO', 'VILLA', 'TOWNHOUSE', 'PENTHOUSE', 'OFFICE', 'RETAIL', 'WAREHOUSE', 'PARKING'];

function AddUnitModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    unitNumber: '',
    type: 'APARTMENT',
    bedroomCount: '1',
    bathroomCount: '1',
    areaSqft: '',
    floorNumber: '',
    annualRent: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => unitsApi.create(propertyId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units', { propertyId }] });
      qc.invalidateQueries({ queryKey: ['property', propertyId] });
      toast.success('Unit added');
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to add unit'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unitNumber) { toast.error('Unit number is required'); return; }
    mutation.mutate({
      unitNumber: form.unitNumber,
      type: form.type,
      bedroomCount: parseInt(form.bedroomCount) || 0,
      bathroomCount: parseInt(form.bathroomCount) || 0,
      ...(form.areaSqft && { areaSqft: parseFloat(form.areaSqft) }),
      ...(form.floorNumber && { floorNumber: parseInt(form.floorNumber) }),
      ...(form.annualRent && { annualRent: parseFloat(form.annualRent) }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Add Unit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Unit Number <span className="text-red-500">*</span></Label>
              <Input value={form.unitNumber} onChange={set('unitNumber')} placeholder="e.g. 101, B-204" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select value={form.type} onChange={set('type')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {UNIT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Floor</Label>
              <Input type="number" min="0" value={form.floorNumber} onChange={set('floorNumber')} placeholder="e.g. 3" />
            </div>
            <div className="space-y-1.5">
              <Label>Bedrooms</Label>
              <Input type="number" min="0" max="10" value={form.bedroomCount} onChange={set('bedroomCount')} />
            </div>
            <div className="space-y-1.5">
              <Label>Bathrooms</Label>
              <Input type="number" min="0" max="10" value={form.bathroomCount} onChange={set('bathroomCount')} />
            </div>
            <div className="space-y-1.5">
              <Label>Area (sqft)</Label>
              <Input type="number" min="0" value={form.areaSqft} onChange={set('areaSqft')} placeholder="e.g. 950" />
            </div>
            <div className="space-y-1.5">
              <Label>Annual Rent (AED)</Label>
              <Input type="number" min="0" value={form.annualRent} onChange={set('annualRent')} placeholder="e.g. 75000" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {mutation.isPending ? 'Adding...' : 'Add Unit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPropertyModal({ prop, onClose }: { prop: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: prop.name ?? '',
    address: prop.address ?? '',
    city: prop.city ?? '',
    area: prop.area ?? '',
    type: prop.type ?? 'APARTMENT',
    totalUnits: String(prop.totalUnits ?? ''),
    yearBuilt: String(prop.yearBuilt ?? ''),
    titleDeedNo: prop.titleDeedNo ?? '',
    developerName: prop.developerName ?? '',
    description: prop.description ?? '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => propertiesApi.update(prop.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property', prop.id] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property updated');
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to update property'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error('Property name is required'); return; }
    mutation.mutate({
      name: form.name,
      address: form.address || undefined,
      city: form.city || undefined,
      area: form.area || undefined,
      type: form.type,
      ...(form.totalUnits && { totalUnits: parseInt(form.totalUnits) }),
      ...(form.yearBuilt && { yearBuilt: parseInt(form.yearBuilt) }),
      ...(form.titleDeedNo && { titleDeedNo: form.titleDeedNo }),
      ...(form.developerName && { developerName: form.developerName }),
      ...(form.description && { description: form.description }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Edit Property</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Property Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Marina Heights Tower" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select value={form.type} onChange={set('type')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Units</Label>
              <Input type="number" min="1" value={form.totalUnits} onChange={set('totalUnits')} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={set('city')} placeholder="Dubai" />
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Input value={form.area} onChange={set('area')} placeholder="Dubai Marina" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={set('address')} placeholder="Street address" />
            </div>
            <div className="space-y-1.5">
              <Label>Title Deed No.</Label>
              <Input value={form.titleDeedNo} onChange={set('titleDeedNo')} />
            </div>
            <div className="space-y-1.5">
              <Label>Year Built</Label>
              <Input type="number" min="1900" max="2030" value={form.yearBuilt} onChange={set('yearBuilt')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Developer</Label>
              <Input value={form.developerName} onChange={set('developerName')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'units' | 'tickets' | 'documents'>('units');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesApi.getOne(id),
    enabled: !!id,
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units', { propertyId: id }],
    queryFn: () => unitsApi.list({ propertyId: id }),
    enabled: !!id,
  });

  const { data: ticketsData } = useQuery({
    queryKey: ['tickets', { propertyId: id }],
    queryFn: () => ticketsApi.list({ propertyId: id }),
    enabled: !!id && activeTab === 'tickets',
  });

  const prop = (property as any)?.data ?? property;
  const units: any[] = Array.isArray(unitsData) ? (unitsData as any[]) : ((unitsData as any)?.data ?? []);
  const tickets: any[] = Array.isArray(ticketsData) ? (ticketsData as any[]) : ((ticketsData as any)?.data ?? []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!prop) return <div className="p-6 text-gray-500">Property not found.</div>;

  const occupied = units.filter((u) => u.occupancyStatus === 'OCCUPIED').length;
  const vacant = units.filter((u) => u.occupancyStatus === 'VACANT').length;
  const occupancyRate = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0;
  const photos: string[] = Array.isArray(prop.photos) ? prop.photos : [];
  const amenities: string[] = Array.isArray(prop.amenities) ? prop.amenities : [];

  return (
    <div className="p-6 space-y-6">
      {showEditModal && <EditPropertyModal prop={prop} onClose={() => setShowEditModal(false)} />}
      {showAddUnitModal && <AddUnitModal propertyId={id} onClose={() => setShowAddUnitModal(false)} />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/properties" className="hover:text-amber-600 hover:underline">Properties</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium">{prop.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{prop.name}</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-1">
            📍 {prop.address}, {prop.city}
          </p>
          {prop.owner && (
            <Link
              href={`/owners/${prop.owner.id ?? prop.ownerId}`}
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-amber-600 hover:text-amber-700 hover:underline"
            >
              <User2 className="w-3.5 h-3.5" />
              Owned by {prop.owner.fullName ?? prop.owner.name ?? 'Owner'}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{prop.type?.replace(/_/g, ' ')}</Badge>
          <Button size="sm" onClick={() => setShowEditModal(true)} className="bg-amber-600 hover:bg-amber-700">
            ✎  Edit Property
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              if (units.length > 0) {
                toast.error(`Cannot delete: ${units.length} units linked. Remove or reassign units first.`);
                return;
              }
              if (confirm(`Delete ${prop.name}? This cannot be undone.`)) {
                toast.info('Delete is guarded by backend — only properties with zero units and zero history can be removed.');
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-72 rounded-xl overflow-hidden">
          <button
            onClick={() => setLightboxIndex(0)}
            className="col-span-2 row-span-2 relative group overflow-hidden"
          >
            <img src={photos[0]} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </button>
          {photos.slice(1, 5).map((src: string, i: number) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i + 1)}
              className="relative group overflow-hidden"
            >
              <img src={src} alt={`${prop.name} ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              {i === 3 && photos.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                  +{photos.length - 5} more
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="h-48 rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center border border-amber-200">
          <div className="text-center">
            <ImageIcon className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-amber-700 font-medium">No photos yet</p>
            <p className="text-xs text-amber-600 mt-1">Add property photos to bring this listing to life</p>
          </div>
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 cursor-zoom-out"
        >
          <img src={photos[lightboxIndex]} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute top-4 right-4 text-white hover:text-amber-400"
          >
            <X className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Stats — color coded */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Units in system</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{prop.totalUnits ?? units.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-emerald-50">
              <CardContent className="p-4">
                <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold">Occupied</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{occupied}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-amber-50">
              <CardContent className="p-4">
                <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Vacant</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{vacant}</p>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {prop.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">About this property</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">{prop.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Amenities ({amenities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a: string) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-full"
                    >
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Property Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {[
                  ['City', prop.city],
                  ['Area', prop.area],
                  ['Type', prop.type?.replace(/_/g, ' ')],
                  ['Year Built', prop.yearBuilt ?? '—'],
                  ['Total Floors', prop.meta?.totalFloors ?? '—'],
                  ['Configured Units', prop.totalUnits ?? '—'],
                  ['Plot No.', prop.plotNo ?? '—'],
                  ['Makani No.', prop.makaniNo ?? '—'],
                  ['Title Deed', prop.titleDeedNo ?? '—'],
                  ['Developer', prop.developerName ?? '—'],
                  ['Service Charge', prop.serviceCharge ? `AED ${Number(prop.serviceCharge).toFixed(2)}/sqft` : '—'],
                  ['Building Age', prop.buildingAge ? `${prop.buildingAge} yrs` : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-gray-400 text-xs uppercase tracking-wide">{label}</p>
                    <p className="font-medium text-gray-900 mt-0.5">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Record metadata */}
          <Card>
            <CardHeader><CardTitle className="text-base">Record</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Created
                </p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {prop.createdAt ? new Date(prop.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Country
                </p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {prop.countryCode === 'AE' ? '🇦🇪 United Arab Emirates' : prop.countryCode}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Currency
                </p>
                <p className="font-medium text-gray-900 mt-0.5">{prop.currencyCode ?? 'AED'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Status</p>
                <Badge variant={prop.status === 'ACTIVE' ? 'success' : 'secondary'} className="mt-1">
                  {prop.status ?? 'ACTIVE'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          {prop.latitude && prop.longitude && (
            <Card>
              <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
              <CardContent className="p-0">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(prop.longitude) - 0.005},${Number(prop.latitude) - 0.003},${Number(prop.longitude) + 0.005},${Number(prop.latitude) + 0.003}&layer=mapnik&marker=${prop.latitude},${prop.longitude}`}
                  width="100%"
                  height="180"
                  className="rounded-b-xl"
                  loading="lazy"
                />
                <a
                  href={`https://www.openstreetmap.org/?mlat=${prop.latitude}&mlon=${prop.longitude}#map=17/${prop.latitude}/${prop.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-2 text-xs text-amber-600 hover:underline border-t"
                >
                  Open larger map →
                </a>
              </CardContent>
            </Card>
          )}

          {/* Operational note */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1 mb-2">
                <Info className="w-3 h-3" /> Operational note
              </p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Property delete is guarded by backend truth. If this property has units or any historical lease or ticket data, the delete action will stay blocked.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-gray-200 gap-1 mb-4">
          {(['units', 'tickets', 'documents'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'tickets' && tickets.length > 0 && (
                <span className="ml-1.5 bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 text-[10px]">{tickets.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'units' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-xs"
                onClick={() => setShowAddUnitModal(true)}
              >
                + Add Unit
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.length === 0 ? (
                <p className="text-gray-400 col-span-3 py-8 text-center">No units found for this property.</p>
              ) : (
                units.map((unit: any) => {
                  const activeLease = unit.leases?.find((l: any) => l.status === 'ACTIVE');
                  return (
                    <Link key={unit.id} href={`/units/${unit.id}`} className="block">
                      <Card className="hover:shadow-md hover:border-amber-300 transition-all cursor-pointer h-full">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900 group-hover:text-amber-600">{unit.unitNumber}</span>
                            <Badge variant={OCCUPANCY_COLORS[unit.occupancyStatus] ?? 'secondary'}>
                              {unit.occupancyStatus}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>{unit.type?.replace(/_/g, ' ')} · {unit.bedroomCount > 0 ? `${unit.bedroomCount}BR ` : ''}{unit.bathroomCount > 0 ? `${unit.bathroomCount}BA` : ''}</p>
                            <p>{unit.areaSqft ? `${Number(unit.areaSqft).toLocaleString()} sqft` : ''}</p>
                            {unit.annualRent && (
                              <p className="text-gray-700 font-medium">AED {Number(unit.annualRent).toLocaleString()}/yr</p>
                            )}
                            {activeLease?.tenant && (
                              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-xs">
                                <User2 className="w-3 h-3 text-amber-600" />
                                <span className="text-amber-700 font-medium truncate">{activeLease.tenant.fullName}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-gray-400 text-sm mb-3">No maintenance tickets for this property</p>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs" onClick={() => router.push(`/tickets/new`)}>
                    Create Ticket
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ref</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tickets.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/tickets/${t.id}`)}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.ticketRef}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.unit?.unitNumber}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.category?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            t.priority === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                            t.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{t.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'OPEN' ? 'warning' : 'secondary'} className="text-xs">
                            {t.status}
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

        {activeTab === 'documents' && (
          <div className="py-10 text-center text-gray-400 text-sm">
            Document management coming soon
          </div>
        )}
      </div>
    </div>
  );
}
