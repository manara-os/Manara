'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, PenTool, Send, CreditCard, FileCheck, Building2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ownersApi } from '@/lib/api';

type Stage = 'DRAFT' | 'SENT_LANDLORD' | 'LANDLORD_SIGNED' | 'SENT_SIGNATORY' | 'COUNTERSIGNED' | 'PAYMENT_PENDING' | 'PAID' | 'EJARI_REGISTERED' | 'ACTIVE';

const STAGES: { id: Stage; label: string; icon: any; description: string }[] = [
  { id: 'DRAFT',             label: 'Draft PMA',           icon: FileText,   description: 'Initial PMA document prepared' },
  { id: 'SENT_LANDLORD',     label: 'Sent to Landlord',    icon: Send,       description: 'Awaiting landlord signature' },
  { id: 'LANDLORD_SIGNED',   label: 'Landlord Signed',     icon: PenTool,    description: 'Routing to RRE authorised signatory' },
  { id: 'SENT_SIGNATORY',    label: 'Sent to RRE',         icon: Send,       description: 'Awaiting countersignature' },
  { id: 'COUNTERSIGNED',     label: 'Countersigned',       icon: PenTool,    description: 'PMA fully executed' },
  { id: 'PAYMENT_PENDING',   label: 'Payment Pending',     icon: CreditCard, description: 'Awaiting PM admin fee payment' },
  { id: 'PAID',              label: 'Payment Received',    icon: CheckCircle2, description: 'Ready for Ejari registration' },
  { id: 'EJARI_REGISTERED',  label: 'Ejari Registered',    icon: FileCheck,  description: 'DLD registration complete' },
  { id: 'ACTIVE',            label: 'PMA Active',          icon: Building2,  description: 'Property management in force' },
];

const stageIndex = (s: Stage | undefined) => STAGES.findIndex((x) => x.id === s);

export function PmaSigningPipeline({ ownerId, currentStage = 'DRAFT' }: { ownerId: string; currentStage?: Stage }) {
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>(currentStage);
  const idx = stageIndex(stage);

  const advance = useMutation({
    mutationFn: (next: Stage) =>
      // We piggyback on the owner update endpoint, storing the pipeline state in meta.
      ownersApi.update(ownerId, { meta: { pmaSigningStage: next } }),
    onSuccess: (_, next) => {
      setStage(next);
      qc.invalidateQueries({ queryKey: ['owner', ownerId] });
      toast.success(`PMA moved to: ${STAGES.find((s) => s.id === next)?.label}`);
    },
    onError: () => toast.error('Failed to advance PMA stage'),
  });

  const next = idx < STAGES.length - 1 ? STAGES[idx + 1] : null;

  const nextLabel = (s: Stage): string => {
    switch (s) {
      case 'SENT_LANDLORD':    return 'Mark landlord signed';
      case 'LANDLORD_SIGNED':  return 'Send to RRE signatory';
      case 'SENT_SIGNATORY':   return 'Mark countersigned';
      case 'COUNTERSIGNED':    return 'Request payment';
      case 'PAYMENT_PENDING':  return 'Mark payment received';
      case 'PAID':             return 'Submit to Ejari';
      case 'EJARI_REGISTERED': return 'Activate PMA';
      case 'ACTIVE':           return '✓ Complete';
      default:                 return `Send to landlord`;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            PMA Signing Pipeline
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Step {idx + 1} of {STAGES.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Step list (compact) */}
        <ol className="space-y-2">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const done = i < idx;
            const current = i === idx;
            return (
              <li key={s.id} className="flex items-start gap-3">
                <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  done ? 'bg-emerald-100 text-emerald-700' :
                  current ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : current ? <Icon className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${current ? 'text-amber-900' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                  <p className={`text-xs ${current ? 'text-amber-700' : 'text-gray-400'}`}>{s.description}</p>
                </div>
                {current && (
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
              </li>
            );
          })}
        </ol>

        {/* Action footer */}
        {next && stage !== 'ACTIVE' && (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button
              size="sm"
              onClick={() => advance.mutate(next.id)}
              disabled={advance.isPending}
              className="bg-amber-600 hover:bg-amber-700 flex-1"
            >
              {advance.isPending ? 'Updating…' : nextLabel(stage)} →
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm('Cancel and reset PMA signing pipeline?')) {
                  advance.mutate('DRAFT');
                }
              }}
              disabled={advance.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Reset
            </Button>
          </div>
        )}

        {stage === 'ACTIVE' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-emerald-800">PMA is fully active</p>
            <p className="text-xs text-emerald-700 mt-1">Property management agreement is in force.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
