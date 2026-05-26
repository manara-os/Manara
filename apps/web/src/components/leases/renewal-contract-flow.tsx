'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText, Send, Wallet, Mail, CreditCard, FileCheck, CheckCircle2, Circle, Clock,
  ChevronRight, X,
} from 'lucide-react';
import { toast } from 'sonner';

// Maps directly to Flow Image 1 — Tenant Renewing? YES branch.
type Stage =
  | 'NOT_STARTED'
  | 'CONTRACT_SENT'
  | 'TENANT_DOCS_COLLECTED'
  | 'PMA_EMAILED_LANDLORD'
  | 'RENEWAL_FEE_COLLECTED'
  | 'CHEQUES_SUBMITTED'
  | 'EJARI_REISSUED'
  | 'COMPLETE';

const STAGES: { id: Stage; label: string; icon: any; description: string }[] = [
  { id: 'CONTRACT_SENT',          label: 'Renewal contract sent',  icon: FileText,   description: 'Renewal lease drafted and sent to tenant' },
  { id: 'TENANT_DOCS_COLLECTED',  label: 'Tenant docs + cheques',   icon: Wallet,     description: 'Signed contract, EID copy and post-dated cheques received' },
  { id: 'PMA_EMAILED_LANDLORD',   label: 'Landlord notified',       icon: Mail,       description: 'Renewed PMA forwarded to the property owner' },
  { id: 'RENEWAL_FEE_COLLECTED',  label: 'Renewal fee collected',   icon: CreditCard, description: 'PM company renewal admin fee paid by tenant' },
  { id: 'CHEQUES_SUBMITTED',      label: 'Cheques to landlord',     icon: Send,       description: 'Post-dated rent cheques forwarded to the owner' },
  { id: 'EJARI_REISSUED',         label: 'Ejari re-issued',         icon: FileCheck,  description: 'New Ejari registration filed with DLD' },
  { id: 'COMPLETE',               label: 'Renewal complete',        icon: CheckCircle2, description: 'Lease successfully renewed — 120/60/30/15-day automation re-armed' },
];

const stageIndex = (s: Stage) => Math.max(0, STAGES.findIndex((x) => x.id === s));

function fmtDays(endDate?: string) {
  if (!endDate) return null;
  const d = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  return d;
}

interface Props {
  lease: any;
}

export function RenewalContractFlow({ lease }: Props) {
  const [stage, setStage] = useState<Stage>(
    (lease?.meta?.renewalStage as Stage) ?? 'NOT_STARTED',
  );
  const [renewalFee, setRenewalFee] = useState('5');
  const [newAnnualRent, setNewAnnualRent] = useState(String(lease?.annualRent ?? ''));
  const [showStartForm, setShowStartForm] = useState(false);

  const daysToEnd = fmtDays(lease?.endDate);
  const isExpiringSoon = daysToEnd !== null && daysToEnd <= 120 && daysToEnd > 0;
  const idx = stageIndex(stage);

  // Hide entire card unless lease is within renewal window OR a renewal flow has been started
  if (!isExpiringSoon && stage === 'NOT_STARTED') return null;

  const next = STAGES[idx + 1] ?? null;

  const advance = (n: Stage) => {
    setStage(n);
    toast.success(`Renewal advanced: ${STAGES.find((s) => s.id === n)?.label}`);
  };

  // ── Not started yet ────────────────────────────────────────────
  if (stage === 'NOT_STARTED' && !showStartForm) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            Renewal Contract Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Lease expires in {daysToEnd} day{daysToEnd === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Start the renewal contract workflow. We'll walk through: draft renewal,
                collect cheques + tenant docs, notify landlord with updated PMA, collect renewal fee,
                forward cheques, and re-issue Ejari.
              </p>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 mt-3"
                onClick={() => setShowStartForm(true)}
              >
                Start renewal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Start form ────────────────────────────────────────────────
  if (stage === 'NOT_STARTED' && showStartForm) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Configure renewal
            </span>
            <button onClick={() => setShowStartForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">New annual rent (AED)</Label>
            <Input
              type="number"
              value={newAnnualRent}
              onChange={(e) => setNewAnnualRent(e.target.value)}
              placeholder="e.g. 95000"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Current: AED {Number(lease?.annualRent ?? 0).toLocaleString()} · RERA cap: 0–20%
              based on rent index
            </p>
          </div>
          <div>
            <Label className="text-xs">Renewal admin fee (%)</Label>
            <Input
              type="number"
              value={renewalFee}
              onChange={(e) => setRenewalFee(e.target.value)}
              placeholder="5"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              ≈ AED {Math.round(Number(newAnnualRent) * (Number(renewalFee) / 100)).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setShowStartForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 flex-1"
              onClick={() => {
                advance('CONTRACT_SENT');
                setShowStartForm(false);
              }}
            >
              Send renewal contract
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Active pipeline ───────────────────────────────────────────
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            Renewal Contract Flow
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Step {Math.min(idx + 1, STAGES.length)} of {STAGES.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-2">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const done = i < idx;
            const current = i === idx;
            return (
              <li key={s.id} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done
                      ? 'bg-emerald-100 text-emerald-700'
                      : current
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : current ? <Icon className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${current ? 'text-amber-900' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                  <p className={`text-xs ${current ? 'text-amber-700' : 'text-gray-400'}`}>{s.description}</p>
                </div>
                {current && stage !== 'COMPLETE' && <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
              </li>
            );
          })}
        </ol>

        {next && stage !== 'COMPLETE' && (
          <div className="pt-2 border-t border-gray-100 flex gap-2">
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 flex-1"
              onClick={() => advance(next.id)}
            >
              {next.label} <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm('Reset the renewal flow? Tenant will need to be re-contacted.')) advance('NOT_STARTED');
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Reset
            </Button>
          </div>
        )}

        {stage === 'COMPLETE' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-emerald-800">Lease renewed</p>
            <p className="text-xs text-emerald-700 mt-1">
              New lease record created · Renewal alerts re-armed at 120 / 60 / 30 / 15 days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
