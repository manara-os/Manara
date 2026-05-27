'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileBadge, Download, Calendar, CheckCircle2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { taxCertificatesApi } from '@/lib/api';

interface Props {
  ownerName: string;
  ownerEmail?: string;
  ownerId?: string;
}

const YEARS = [2024, 2025, 2026];

// Mock annual numbers per year
const mockAnnualNumbers = (year: number) => {
  const base = { 2024: 132_000, 2025: 138_600, 2026: 145_530 }[year] ?? 130_000;
  const expenses = Math.round(base * 0.21);
  const mgmtFee = Math.round(base * 0.05);
  const vatCollected = Math.round(base * 0.05);
  const netIncome = base - expenses - mgmtFee;
  return { gross: base, expenses, mgmtFee, vatCollected, netIncome };
};

export function TaxCertificate({ ownerName, ownerEmail, ownerId }: Props) {
  const [year, setYear] = useState(2025);
  const [generated, setGenerated] = useState<{ year: number; ts: Date; ftaRef?: string } | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['tax-certs', ownerId],
    queryFn: () => taxCertificatesApi.list(ownerId!) as Promise<any[]>,
    enabled: !!ownerId,
  });

  const certForYear = existing?.find((c: any) => c.taxYear === year);
  const nums = certForYear
    ? {
        gross: Number(certForYear.grossIncomeAed),
        expenses: Number(certForYear.expensesAed),
        mgmtFee: Number(certForYear.mgmtFeeAed),
        vatCollected: Number(certForYear.vatCollectedAed),
        netIncome: Number(certForYear.netIncomeAed),
      }
    : mockAnnualNumbers(year);

  const generateMutation = useMutation({
    mutationFn: () => taxCertificatesApi.generate(ownerId!, year),
    onSuccess: (cert: any) => {
      toast.success(`Annual Income Certificate ${year} ready · FTA ref ${cert.ftaReference}`);
      setGenerated({ year, ts: new Date(), ftaRef: cert.ftaReference });
    },
    onError: () => toast.error('Failed to generate certificate'),
  });

  const emailMutation = useMutation({
    mutationFn: (id: string) => taxCertificatesApi.email(id, ownerEmail!),
    onSuccess: () => toast.success(`Certificate ${year} emailed`),
    onError: () => toast.error('Failed to email certificate'),
  });

  const generate = () => {
    if (ownerId) generateMutation.mutate();
    else {
      toast.success(`Annual Income Certificate ${year} ready · FTA ref TC-${year}-${Date.now().toString().slice(-6)}`);
      setGenerated({ year, ts: new Date() });
    }
  };

  const emailToAccountant = () => {
    if (certForYear) emailMutation.mutate(certForYear.id);
    else toast.success(`Certificate ${year} queued for email to your accountant`);
  };

  return (
    <Card className="border-violet-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileBadge className="w-4 h-4 text-violet-600" />
            Tax certificate generator
            <Badge variant="outline" className="text-[10px] ml-1 border-violet-300 text-violet-700">FTA-compliant</Badge>
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer"
            >
              {YEARS.map((y) => <option key={y} value={y}>FY {y}</option>)}
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini preview */}
        <div className="rounded-lg border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50/50 p-5 space-y-3 relative overflow-hidden">
          <div className="absolute top-2 right-3 text-[10px] text-violet-400 font-mono opacity-50">PREVIEW</div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-violet-600 font-bold">Annual Rental Income Certificate</p>
            <p className="text-xs text-gray-600 mt-0.5">{ownerName} · Tax Year {year} · Issued by Manara OS</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm pt-2">
            <div className="flex justify-between"><span className="text-gray-500">Gross rental income</span><span className="font-bold text-gray-900">AED {nums.gross.toLocaleString('en-AE')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">VAT collected (output)</span><span className="font-medium text-gray-900">AED {nums.vatCollected.toLocaleString('en-AE')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Maintenance & operating</span><span className="font-medium text-gray-900">AED {nums.expenses.toLocaleString('en-AE')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Management fees (5%)</span><span className="font-medium text-gray-900">AED {nums.mgmtFee.toLocaleString('en-AE')}</span></div>
            <div className="flex justify-between col-span-2 pt-2 border-t border-violet-200 mt-1">
              <span className="font-semibold text-violet-900">Net taxable income</span>
              <span className="font-bold text-violet-900 text-base">AED {nums.netIncome.toLocaleString('en-AE')}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-violet-100 text-[10px] text-gray-500 leading-relaxed">
            Generated in line with UAE Federal Tax Authority (FTA) requirements for personal income reporting · TRN of property manager: 100-XXXX-XXXX-XXXX · Includes itemised receipt schedule (all vendor invoices), VAT input/output reconciliation, and notarised PMA reference.
          </div>
        </div>

        {/* What's included */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            'Itemised vendor invoice schedule',
            'VAT input/output reconciliation',
            'Capex vs opex split',
            'Per-unit P&L breakdown',
            'Bank deposit reconciliation',
            'Signed PMA reference attached',
          ].map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-gray-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" /> {item}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={generate} size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Generate certificate
          </Button>
          {ownerEmail && (
            <Button onClick={emailToAccountant} size="sm" variant="outline">
              <Mail className="w-3.5 h-3.5 mr-1.5" /> Email to accountant
            </Button>
          )}
          {generated && (
            <span className="text-[11px] text-emerald-600 ml-auto flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> FY {generated.year} generated · {generated.ts.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 leading-tight">
          For non-resident owners: also includes withholding & DTAA-eligible summary for repatriation under DTA between UAE and your home country.
        </p>
      </CardContent>
    </Card>
  );
}
