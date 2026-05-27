'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Circle, FileText, IdCard, Building2, FileSignature,
  CreditCard, FileCheck, ChevronRight, ChevronLeft, Upload,
  Briefcase, MapPin, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { propertiesApi, ownersApi } from '@/lib/api';

const STEPS = [
  { id: 1, label: 'Landlord & KYC',     icon: IdCard,        description: 'Owner identity + KYC docs' },
  { id: 2, label: 'Property',           icon: Building2,     description: 'Property details + title deed' },
  { id: 3, label: 'PMA Terms',          icon: Briefcase,     description: 'Management fee, term, services' },
  { id: 4, label: 'Routing',            icon: FileSignature, description: 'Route for authorised signature' },
  { id: 5, label: 'Admin Fee',          icon: CreditCard,    description: 'Collect PM company admin fee' },
  { id: 6, label: 'Ejari',              icon: FileCheck,     description: 'Register PMA with DLD Ejari' },
];

interface FormState {
  // Step 1 — Landlord
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  emiratesId: string;
  passportNo: string;
  visaNo: string;
  ppDocUploaded: boolean;
  eidDocUploaded: boolean;
  visaDocUploaded: boolean;

  // Step 2 — Property
  propertyName: string;
  propertyType: string;
  city: string;
  area: string;
  address: string;
  titleDeedNo: string;
  titleDeedUploaded: boolean;
  yearBuilt: string;
  totalUnits: string;

  // Step 3 — PMA Terms
  mgmtFeePct: string;
  pmaDurationMonths: string;
  servicesIncluded: Record<string, boolean>;

  // Step 4 — Routing
  signatoryName: string;
  signatoryEmail: string;
  signatorySent: boolean;
  signatoryReturned: boolean;

  // Step 5 — Payment
  adminFeeAed: string;
  paymentMethod: string;
  paymentReceived: boolean;

  // Step 6 — Ejari
  ejariSubmitted: boolean;
  ejariNumber: string;
}

const DEFAULT_SERVICES = {
  'Rent collection': true,
  'Tenant screening': true,
  'Maintenance coordination': true,
  'Ejari registration': true,
  'Marketing & leasing': true,
  'Eviction handling': false,
  'Insurance coordination': false,
  'Utilities setup': false,
};

const PROPERTY_TYPES = ['APARTMENT', 'VILLA', 'COMPOUND', 'OFFICE', 'RETAIL', 'WAREHOUSE'];

const initialState: FormState = {
  fullName: '', email: '', phone: '+971', nationality: '', emiratesId: '', passportNo: '', visaNo: '',
  ppDocUploaded: false, eidDocUploaded: false, visaDocUploaded: false,
  propertyName: '', propertyType: 'APARTMENT', city: 'Dubai', area: '', address: '',
  titleDeedNo: '', titleDeedUploaded: false, yearBuilt: '', totalUnits: '1',
  mgmtFeePct: '5', pmaDurationMonths: '12', servicesIncluded: { ...DEFAULT_SERVICES },
  signatoryName: '', signatoryEmail: '', signatorySent: false, signatoryReturned: false,
  adminFeeAed: '5000', paymentMethod: 'BANK_TRANSFER', paymentReceived: false,
  ejariSubmitted: false, ejariNumber: '',
};

export default function NewPropertyOnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialState);
  const set = (k: keyof FormState) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create owner
      const ownerRes: any = await ownersApi.create({
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone,
        nationality: form.nationality || undefined,
        emiratesId: form.emiratesId || undefined,
        passportNo: form.passportNo || undefined,
        mgmtFeePct: Number(form.mgmtFeePct),
      });
      const owner = ownerRes.data ?? ownerRes;

      // 2. Create property linked to owner
      const propertyRes: any = await propertiesApi.create({
        name: form.propertyName,
        type: form.propertyType,
        city: form.city,
        area: form.area,
        address: form.address,
        titleDeedNo: form.titleDeedNo || undefined,
        yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
        totalUnits: Number(form.totalUnits) || 1,
        ownerId: owner.id,
      });
      return propertyRes.data ?? propertyRes;
    },
    onSuccess: (property: any) => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success(`${form.propertyName} onboarded successfully`);
      router.push(`/properties/${property.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Onboarding failed — check the form');
    },
  });

  const canAdvance = (s: number): boolean => {
    switch (s) {
      case 1: return !!form.fullName && form.phone.length >= 10 && form.ppDocUploaded && form.eidDocUploaded;
      case 2: return !!form.propertyName && !!form.area && !!form.address && form.titleDeedUploaded;
      case 3: return Number(form.mgmtFeePct) > 0 && Number(form.pmaDurationMonths) > 0;
      case 4: return form.signatoryReturned;
      case 5: return form.paymentReceived;
      case 6: return form.ejariSubmitted;
      default: return false;
    }
  };

  const isLast = step === STEPS.length;
  const advance = () => {
    if (!canAdvance(step)) {
      toast.error('Complete this step before advancing');
      return;
    }
    if (isLast) {
      createMutation.mutate();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href="/properties" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
          ← Back to Properties
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-amber-500" />
          Onboard New Property
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Walk through landlord KYC, property details, PMA signing, admin fee, and Ejari registration in one flow.
        </p>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="p-5">
          <ol className="flex items-center gap-2 overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const current = step === s.id;
              return (
                <li key={s.id} className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => done && setStep(s.id)}
                    disabled={!done}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      current
                        ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400'
                        : done
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      done ? 'bg-emerald-500 text-white' :
                      current ? 'bg-amber-600 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {(() => { const S = STEPS[step - 1]; const I = S.icon; return <I className="w-5 h-5 text-amber-600" />; })()}
            Step {step}: {STEPS[step - 1].label}
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">{STEPS[step - 1].description}</p>
        </CardHeader>
        <CardContent>
          {step === 1 && <Step1Landlord form={form} setForm={setForm} />}
          {step === 2 && <Step2Property form={form} setForm={setForm} />}
          {step === 3 && <Step3PmaTerms form={form} setForm={setForm} />}
          {step === 4 && <Step4Routing form={form} setForm={setForm} />}
          {step === 5 && <Step5Payment form={form} setForm={setForm} />}
          {step === 6 && <Step6Ejari form={form} setForm={setForm} />}
        </CardContent>
      </Card>

      {/* Footer nav */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1 || createMutation.isPending}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <Button
          onClick={advance}
          disabled={!canAdvance(step) || createMutation.isPending}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {createMutation.isPending
            ? 'Creating…'
            : isLast
              ? <>Complete onboarding <CheckCircle2 className="w-4 h-4 ml-1" /></>
              : <>Next: {STEPS[step]?.label} <ChevronRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step components
// ─────────────────────────────────────────────────────────────────────

function FileUploadBox({ label, uploaded, onUpload }: { label: string; uploaded: boolean; onUpload: () => void }) {
  return (
    <button
      type="button"
      onClick={onUpload}
      className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
        uploaded
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50'
      }`}
    >
      {uploaded ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Upload className="w-5 h-5 text-gray-400" />}
      <div className="flex-1">
        <p className={`text-sm font-medium ${uploaded ? 'text-emerald-800' : 'text-gray-700'}`}>{label}</p>
        <p className="text-xs text-gray-500">{uploaded ? 'Uploaded · click to replace' : 'Click to upload (PDF or image)'}</p>
      </div>
    </button>
  );
}

function Step1Landlord({ form, setForm }: any) {
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Full name <span className="text-red-500">*</span></Label>
          <Input value={form.fullName} onChange={set('fullName')} placeholder="e.g. Khalifa Al Mansoori" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
          <Input value={form.phone} onChange={set('phone')} placeholder="+971 50 ..." className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={form.email} onChange={set('email')} placeholder="owner@example.com" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Nationality</Label>
          <Input value={form.nationality} onChange={set('nationality')} placeholder="Emirati" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Emirates ID</Label>
          <Input value={form.emiratesId} onChange={set('emiratesId')} placeholder="784-1985-..." className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Passport No.</Label>
          <Input value={form.passportNo} onChange={set('passportNo')} placeholder="A12345678" className="h-9 text-sm" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Required KYC documents</p>
        <div className="space-y-2">
          <FileUploadBox
            label="Passport copy"
            uploaded={form.ppDocUploaded}
            onUpload={() => setForm((f: any) => ({ ...f, ppDocUploaded: !f.ppDocUploaded }))}
          />
          <FileUploadBox
            label="Emirates ID (front + back)"
            uploaded={form.eidDocUploaded}
            onUpload={() => setForm((f: any) => ({ ...f, eidDocUploaded: !f.eidDocUploaded }))}
          />
          <FileUploadBox
            label="UAE residence visa (if applicable)"
            uploaded={form.visaDocUploaded}
            onUpload={() => setForm((f: any) => ({ ...f, visaDocUploaded: !f.visaDocUploaded }))}
          />
        </div>
      </div>
    </div>
  );
}

function Step2Property({ form, setForm }: any) {
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="text-xs">Property name <span className="text-red-500">*</span></Label>
          <Input value={form.propertyName} onChange={set('propertyName')} placeholder="e.g. Marina Heights" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Property type</Label>
          <select value={form.propertyType} onChange={set('propertyType')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Year built</Label>
          <Input type="number" value={form.yearBuilt} onChange={set('yearBuilt')} placeholder="2020" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input value={form.city} onChange={set('city')} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Area / community <span className="text-red-500">*</span></Label>
          <Input value={form.area} onChange={set('area')} placeholder="e.g. Dubai Marina" className="h-9 text-sm" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Full address <span className="text-red-500">*</span></Label>
          <Input value={form.address} onChange={set('address')} placeholder="Building, street, area, emirate" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Total units configured</Label>
          <Input type="number" value={form.totalUnits} onChange={set('totalUnits')} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Title deed number</Label>
          <Input value={form.titleDeedNo} onChange={set('titleDeedNo')} placeholder="DM-DEED-2020-..." className="h-9 text-sm" />
        </div>
      </div>

      <FileUploadBox
        label="Title deed (Tabu) document"
        uploaded={form.titleDeedUploaded}
        onUpload={() => setForm((f: any) => ({ ...f, titleDeedUploaded: !f.titleDeedUploaded }))}
      />
    </div>
  );
}

function Step3PmaTerms({ form, setForm }: any) {
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  const toggleService = (svc: string) => setForm((f: any) => ({
    ...f,
    servicesIncluded: { ...f.servicesIncluded, [svc]: !f.servicesIncluded[svc] },
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Management fee % <span className="text-red-500">*</span></Label>
          <Input type="number" step="0.5" value={form.mgmtFeePct} onChange={set('mgmtFeePct')} className="h-9 text-sm" />
          <p className="text-[10px] text-gray-500 mt-1">UAE market range: 5–10% of annual rent</p>
        </div>
        <div>
          <Label className="text-xs">PMA duration (months) <span className="text-red-500">*</span></Label>
          <Input type="number" value={form.pmaDurationMonths} onChange={set('pmaDurationMonths')} className="h-9 text-sm" />
          <p className="text-[10px] text-gray-500 mt-1">Standard: 12 months</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Services included in this PMA</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(form.servicesIncluded).map((svc) => (
            <label key={svc} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.servicesIncluded[svc]}
                onChange={() => toggleService(svc)}
                className="accent-amber-600"
              />
              <span>{svc}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-amber-800">Draft PMA will be auto-generated</p>
        <p className="text-xs text-amber-700 mt-1">
          Based on the terms above, a Property Management Agreement will be drafted and sent for routing in the next step.
        </p>
      </div>
    </div>
  );
}

function Step4Routing({ form, setForm }: any) {
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Authorised signatory name <span className="text-red-500">*</span></Label>
          <Input value={form.signatoryName} onChange={set('signatoryName')} placeholder="e.g. Mohammed Al Hashimi" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Signatory email <span className="text-red-500">*</span></Label>
          <Input value={form.signatoryEmail} onChange={set('signatoryEmail')} placeholder="signatory@rocky-re.ae" className="h-9 text-sm" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={form.signatorySent ? 'outline' : 'default'}
          className={form.signatorySent ? '' : 'bg-amber-600 hover:bg-amber-700'}
          onClick={() => {
            setForm((f: any) => ({ ...f, signatorySent: true }));
            toast.success('PMA sent to authorised signatory');
          }}
          disabled={!form.signatoryName || !form.signatoryEmail}
        >
          {form.signatorySent ? '✓ PMA sent for signature' : 'Send for signature'}
        </Button>
        {form.signatorySent && !form.signatoryReturned && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setForm((f: any) => ({ ...f, signatoryReturned: true }));
              toast.success('Countersigned PMA received');
            }}
          >
            Mark countersigned
          </Button>
        )}
        {form.signatoryReturned && (
          <Badge variant="outline" className="text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Countersigned · routing complete
          </Badge>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        💡 In production, this triggers a DocuSign / Adobe Sign envelope with the auto-generated PMA PDF.
      </div>
    </div>
  );
}

function Step5Payment({ form, setForm }: any) {
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Admin fee (AED)</Label>
          <Input type="number" value={form.adminFeeAed} onChange={set('adminFeeAed')} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Payment method</Label>
          <select value={form.paymentMethod} onChange={set('paymentMethod')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CARD">Card</option>
            <option value="CASH">Cash (receipt required)</option>
          </select>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Amount to collect: <span className="text-lg">AED {Number(form.adminFeeAed).toLocaleString()}</span>
          </p>
          <p className="text-xs text-emerald-700 mt-1">Receipt will be auto-generated and emailed to the landlord.</p>
        </div>
        {!form.paymentReceived ? (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setForm((f: any) => ({ ...f, paymentReceived: true }));
              toast.success('Payment recorded');
            }}
          >
            Mark received
          </Button>
        ) : (
          <Badge variant="outline" className="text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Payment received
          </Badge>
        )}
      </div>
    </div>
  );
}

function Step6Ejari({ form, setForm }: any) {
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <FileCheck className="w-4 h-4" /> Submit PMA to Ejari
        </p>
        <p className="text-xs text-amber-700 mt-1">
          The PMA must be registered with the Dubai Land Department via Ejari within 30 days of signing.
          In production, the document is submitted via the DLD API.
        </p>
      </div>

      {!form.ejariSubmitted ? (
        <Button
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => {
            const ejariNum = 'EJ-' + Math.random().toString(36).slice(2, 10).toUpperCase();
            setForm((f: any) => ({ ...f, ejariSubmitted: true, ejariNumber: ejariNum }));
            toast.success(`Ejari registered · ${ejariNum}`);
          }}
        >
          Submit to Ejari (DLD)
        </Button>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">Ejari registered</p>
          </div>
          <p className="text-sm text-emerald-700">
            Ejari number: <code className="bg-white px-2 py-0.5 rounded font-mono">{form.ejariNumber}</code>
          </p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Onboarding summary</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-gray-500">Landlord</span><p className="font-medium text-gray-900">{form.fullName || '—'}</p></div>
          <div><span className="text-gray-500">Property</span><p className="font-medium text-gray-900">{form.propertyName || '—'}</p></div>
          <div><span className="text-gray-500">Mgmt fee</span><p className="font-medium text-gray-900">{form.mgmtFeePct}%</p></div>
          <div><span className="text-gray-500">Admin fee</span><p className="font-medium text-gray-900">AED {Number(form.adminFeeAed).toLocaleString()}</p></div>
        </div>
      </div>
    </div>
  );
}
