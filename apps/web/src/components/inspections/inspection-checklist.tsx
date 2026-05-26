'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Camera, PenTool, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  label: string;
  category: 'Living' | 'Kitchen' | 'Bedrooms' | 'Bathrooms' | 'Utilities' | 'Exterior';
}

const MOVE_IN_CHECKLIST: ChecklistItem[] = [
  { id: 'lr-walls',      label: 'Walls (no cracks, fresh paint)',         category: 'Living' },
  { id: 'lr-floor',      label: 'Flooring (no scratches, clean)',          category: 'Living' },
  { id: 'lr-windows',    label: 'Windows & blinds operate correctly',      category: 'Living' },
  { id: 'k-appliances',  label: 'Appliances tested (fridge, oven, hob)',   category: 'Kitchen' },
  { id: 'k-cabinets',    label: 'Cabinets & drawers operate',              category: 'Kitchen' },
  { id: 'k-plumbing',    label: 'Sink, drainage, taps',                    category: 'Kitchen' },
  { id: 'br-doors',      label: 'Bedroom doors & locks',                   category: 'Bedrooms' },
  { id: 'br-wardrobes',  label: 'Built-in wardrobes (hinges, shelves)',    category: 'Bedrooms' },
  { id: 'br-ac',         label: 'AC tested in every bedroom',              category: 'Bedrooms' },
  { id: 'b-fixtures',    label: 'Toilet, shower, basin all working',       category: 'Bathrooms' },
  { id: 'b-tiles',       label: 'Tiles & grout (no cracks)',               category: 'Bathrooms' },
  { id: 'b-ventilation', label: 'Extractor fan operational',               category: 'Bathrooms' },
  { id: 'u-power',       label: 'Power connected (DEWA active)',           category: 'Utilities' },
  { id: 'u-water',       label: 'Water connected',                         category: 'Utilities' },
  { id: 'u-gas',         label: 'Gas connection (if applicable)',          category: 'Utilities' },
  { id: 'u-internet',    label: 'Internet/du active (if included)',        category: 'Utilities' },
  { id: 'e-parking',     label: 'Parking bay confirmed (number + access)', category: 'Exterior' },
  { id: 'e-keys',        label: 'All keys handed over (count verified)',   category: 'Exterior' },
];

const MOVE_OUT_CHECKLIST: ChecklistItem[] = [
  { id: 'mo-cleaning',     label: 'Property professionally cleaned',          category: 'Living' },
  { id: 'mo-walls',        label: 'Walls (paint condition, no holes)',        category: 'Living' },
  { id: 'mo-floor',        label: 'Flooring damage assessment',               category: 'Living' },
  { id: 'mo-appliances',   label: 'All appliances tested & working',          category: 'Kitchen' },
  { id: 'mo-fixtures',     label: 'Bathroom fixtures intact',                 category: 'Bathrooms' },
  { id: 'mo-dewa-final',   label: 'DEWA final bill paid',                     category: 'Utilities' },
  { id: 'mo-internet-cancel', label: 'Internet/du contract cancelled',        category: 'Utilities' },
  { id: 'mo-keys-returned',label: 'All keys + access cards returned',         category: 'Exterior' },
  { id: 'mo-parking',      label: 'Parking bay vacated',                      category: 'Exterior' },
];

interface Props {
  type: 'move-in' | 'move-out';
  leaseId: string;
  tenantName?: string;
  onComplete?: () => void;
}

export function InspectionChecklist({ type, leaseId, tenantName, onComplete }: Props) {
  const [open, setOpen] = useState(false);
  const items = type === 'move-in' ? MOVE_IN_CHECKLIST : MOVE_OUT_CHECKLIST;
  const [checks, setChecks] = useState<Record<string, 'ok' | 'issue' | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [globalNotes, setGlobalNotes] = useState('');
  const [signed, setSigned] = useState(false);

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const total = items.length;
  const completed = Object.values(checks).filter(Boolean).length;
  const issues = Object.values(checks).filter((v) => v === 'issue').length;
  const pct = Math.round((completed / total) * 100);

  const submit = () => {
    if (completed < total) {
      if (!confirm(`${total - completed} items not yet inspected. Submit anyway?`)) return;
    }
    if (!signed) {
      toast.error('Tenant signature required to submit inspection');
      return;
    }
    toast.success(`${type === 'move-in' ? 'Move-in' : 'Move-out'} inspection submitted${issues > 0 ? ` with ${issues} issue(s) — maintenance tickets will be auto-created` : ' — no issues found'}`);
    setOpen(false);
    onComplete?.();
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-amber-200 text-amber-700 hover:bg-amber-50"
      >
        <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
        {type === 'move-in' ? 'Start move-in inspection' : 'Start move-out inspection'}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
              {type === 'move-in' ? 'Move-In Inspection' : 'Move-Out Inspection'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {tenantName && `Tenant: ${tenantName} · `}Lease #{leaseId.slice(0, 8)}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 py-3 border-b bg-amber-50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-amber-800">
              {completed} of {total} inspected · {issues} issue(s)
            </span>
            <span className="text-xs font-bold text-amber-700">{pct}%</span>
          </div>
          <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {Object.entries(grouped).map(([category, list]) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((item) => {
                  const state = checks[item.id];
                  return (
                    <div key={item.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <p className="flex-1 text-sm text-gray-700 pt-0.5">{item.label}</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setChecks({ ...checks, [item.id]: state === 'ok' ? null : 'ok' })}
                          className={`p-1.5 rounded transition-colors ${
                            state === 'ok'
                              ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                              : 'bg-gray-50 text-gray-400 hover:bg-emerald-50'
                          }`}
                          title="OK"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setChecks({ ...checks, [item.id]: state === 'issue' ? null : 'issue' })}
                          className={`p-1.5 rounded transition-colors ${
                            state === 'issue'
                              ? 'bg-red-100 text-red-700 ring-2 ring-red-400'
                              : 'bg-gray-50 text-gray-400 hover:bg-red-50'
                          }`}
                          title="Issue"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Mock photo capture
                            const cur = photos[item.id] ?? [];
                            setPhotos({ ...photos, [item.id]: [...cur, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'] });
                            toast.success('Photo attached');
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            (photos[item.id]?.length ?? 0) > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-50 text-gray-400 hover:bg-blue-50'
                          }`}
                          title="Add photo"
                        >
                          <Camera className="w-4 h-4" />
                          {(photos[item.id]?.length ?? 0) > 0 && (
                            <span className="ml-0.5 text-[9px] font-bold">{photos[item.id].length}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {/* Global notes */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Additional notes</label>
            <textarea
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              rows={3}
              placeholder="Any general observations about the property condition…"
              className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Signature */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block flex items-center gap-1">
              <PenTool className="w-3 h-3" /> Tenant signature
            </label>
            <button
              onClick={() => setSigned(!signed)}
              className={`w-full py-6 rounded-md border-2 border-dashed text-sm font-medium transition-colors ${
                signed
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-amber-400'
              }`}
            >
              {signed ? '✓ Signed by tenant' : 'Tap here to capture signature (mock)'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={submit}
            className="bg-amber-600 hover:bg-amber-700"
            disabled={completed === 0 || !signed}
          >
            Submit inspection
            {issues > 0 && <Badge variant="destructive" className="ml-2 text-xs">{issues} issues</Badge>}
          </Button>
        </div>
      </div>
    </div>
  );
}
