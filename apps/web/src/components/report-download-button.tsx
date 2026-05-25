'use client';

import { useState } from 'react';
import { Download, ChevronDown, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type EntityType = 'owner' | 'tenant';

interface ReportDownloadButtonProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  fetchStatement: (startDate: string, endDate: string) => Promise<any>;
}

const PERIODS = [
  { label: 'This Month', getValue: () => thisMonth() },
  { label: 'Last Month', getValue: () => lastMonth() },
  { label: 'Last Quarter', getValue: () => lastQuarter() },
  { label: 'Last 6 Months', getValue: () => last6Months() },
  { label: 'This Year', getValue: () => thisYear() },
  { label: 'Last Year', getValue: () => lastYear() },
  { label: 'Custom Range', getValue: () => null },
] as const;

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}
function thisMonth() {
  const now = new Date();
  return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}
function lastMonth() {
  const now = new Date();
  return { start: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), end: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
}
function lastQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const startMonth = (q - 1) * 3;
  return { start: fmt(new Date(now.getFullYear(), startMonth < 0 ? startMonth + 12 : startMonth, 1)), end: fmt(new Date(now.getFullYear(), startMonth < 0 ? startMonth + 15 : startMonth + 3, 0)) };
}
function last6Months() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  return { start: fmt(start), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}
function thisYear() {
  const y = new Date().getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}
function lastYear() {
  const y = new Date().getFullYear() - 1;
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

function toCSV(data: any, entityType: EntityType): string {
  const lines: string[] = [];
  const period = `${data.period?.startDate?.split('T')[0] ?? ''} to ${data.period?.endDate?.split('T')[0] ?? ''}`;

  if (entityType === 'owner') {
    lines.push(`Owner Statement`);
    lines.push(`Name,${data.owner?.fullName}`);
    lines.push(`Email,${data.owner?.email ?? ''}`);
    lines.push(`Phone,${data.owner?.phone ?? ''}`);
    lines.push(`Management Fee,${data.owner?.mgmtFeePct}%`);
    lines.push(`Period,${period}`);
    lines.push('');
    lines.push(`SUMMARY`);
    lines.push(`Total Rent Collected,AED ${Number(data.summary?.totalCollected ?? 0).toLocaleString()}`);
    lines.push(`Management Fee Deducted,AED ${Number(data.summary?.managementFee ?? 0).toFixed(2)}`);
    lines.push(`Net Owner Payout,AED ${Number(data.summary?.netOwnerPayout ?? 0).toFixed(2)}`);
    lines.push('');
    lines.push(`RENT COLLECTIONS`);
    lines.push(`Date,Property,Unit,Tenant,Amount,Method`);
    for (const c of (data.collections ?? [])) {
      lines.push(`${new Date(c.collectedAt).toLocaleDateString('en-AE')},${c.propertyName ?? ''},${c.unitNumber ?? ''},${c.tenantName ?? ''},AED ${Number(c.amount).toLocaleString()},${c.method ?? ''}`);
    }
    lines.push('');
    lines.push(`PDC CHEQUES`);
    lines.push(`Due Date,Property,Unit,Tenant,Amount,Cheque No,Bank,Status`);
    for (const c of (data.cheques ?? [])) {
      lines.push(`${new Date(c.dueDate).toLocaleDateString('en-AE')},${c.propertyName ?? ''},${c.unitNumber ?? ''},${c.tenantName ?? ''},AED ${Number(c.amount).toLocaleString()},${c.chequeNumber ?? ''},${c.bankName ?? ''},${c.status}`);
    }
  } else {
    lines.push(`Tenant Payment Statement`);
    lines.push(`Name,${data.tenant?.fullName}`);
    lines.push(`Email,${data.tenant?.email ?? ''}`);
    lines.push(`Phone,${data.tenant?.phone ?? ''}`);
    lines.push(`Nationality,${data.tenant?.nationality ?? ''}`);
    lines.push(`Period,${period}`);
    lines.push('');
    lines.push(`SUMMARY`);
    lines.push(`Total Paid,AED ${Number(data.summary?.totalPaid ?? 0).toLocaleString()}`);
    lines.push(`Total Cheques,${data.summary?.totalCheques ?? 0}`);
    lines.push(`Cleared Cheques,${data.summary?.clearedCheques ?? 0}`);
    lines.push(`Pending Cheques,${data.summary?.pendingCheques ?? 0}`);
    lines.push('');
    if ((data.leases ?? []).length > 0) {
      lines.push(`LEASE DETAILS`);
      lines.push(`Property,Unit,Status,Start Date,End Date,Annual Rent`);
      for (const l of data.leases) {
        lines.push(`${l.unit?.property?.name ?? ''},${l.unit?.unitNumber ?? ''},${l.status},${new Date(l.startDate).toLocaleDateString('en-AE')},${new Date(l.endDate).toLocaleDateString('en-AE')},AED ${Number(l.annualRent).toLocaleString()}`);
      }
      lines.push('');
    }
    lines.push(`PAYMENT COLLECTIONS`);
    lines.push(`Date,Property,Unit,Amount,Method`);
    for (const c of (data.collections ?? [])) {
      lines.push(`${new Date(c.collectedAt).toLocaleDateString('en-AE')},${c.lease?.unit?.property?.name ?? ''},${c.lease?.unit?.unitNumber ?? ''},AED ${Number(c.amount).toLocaleString()},${c.method ?? ''}`);
    }
    lines.push('');
    lines.push(`PDC CHEQUES`);
    lines.push(`Due Date,Cheque No,Bank,Amount,Status`);
    for (const c of (data.cheques ?? [])) {
      lines.push(`${new Date(c.dueDate).toLocaleDateString('en-AE')},${c.chequeNumber ?? ''},${c.bankName ?? ''},AED ${Number(c.amount).toLocaleString()},${c.status}`);
    }
  }

  return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportDownloadButton({ entityType, entityId, entityName, fetchStatement }: ReportDownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  async function handleDownload(startDate: string, endDate: string) {
    setLoading(true);
    setOpen(false);
    try {
      const data = await fetchStatement(startDate, endDate);
      const result = (data as any)?.data ?? data;
      const csv = toCSV(result, entityType);
      const safeName = entityName.replace(/\s+/g, '_');
      downloadCSV(csv, `${safeName}_Statement_${startDate}_${endDate}.csv`);
    } catch (e) {
      console.error('Failed to download report', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-8 gap-1.5"
        onClick={() => setOpen(v => !v)}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Download Report
        <ChevronDown className="w-3 h-3 opacity-60" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setShowCustom(false); }} />
          <div className="absolute right-0 top-9 z-20 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Period</p>
            </div>
            <div className="py-1">
              {PERIODS.map((p) => (
                <button
                  key={p.label}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 transition-colors flex items-center gap-2"
                  onClick={() => {
                    if (p.label === 'Custom Range') {
                      setShowCustom(true);
                    } else {
                      const range = p.getValue();
                      if (range) handleDownload(range.start, range.end);
                    }
                  }}
                >
                  <Calendar className="w-3.5 h-3.5 opacity-50" />
                  {p.label}
                </button>
              ))}
            </div>

            {showCustom && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3 space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">From</Label>
                  <Input type="date" className="h-7 text-xs mt-0.5" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">To</Label>
                  <Input type="date" className="h-7 text-xs mt-0.5" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-amber-600 hover:bg-amber-700"
                  disabled={!customStart || !customEnd}
                  onClick={() => {
                    if (customStart && customEnd) handleDownload(customStart, customEnd);
                  }}
                >
                  Download CSV
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
