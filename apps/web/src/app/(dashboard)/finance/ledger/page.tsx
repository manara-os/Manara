'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles, BookOpen, Coins, ShieldCheck, FileText,
  TrendingUp, ArrowDownToLine, ArrowUpFromLine, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type Tab = 'coa' | 'journal' | 'trust' | 'vat';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'coa',     label: 'Chart of Accounts', icon: BookOpen },
  { id: 'journal', label: 'Journal Entries',   icon: Coins },
  { id: 'trust',   label: 'Owner Trust',       icon: ShieldCheck },
  { id: 'vat',     label: 'VAT Report',        icon: FileText },
];

const TYPE_COLOR: Record<string, { bg: string; fg: string }> = {
  ASSET:     { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  LIABILITY: { bg: 'bg-red-100',     fg: 'text-red-700' },
  INCOME:    { bg: 'bg-blue-100',    fg: 'text-blue-700' },
  EXPENSE:   { bg: 'bg-amber-100',   fg: 'text-amber-700' },
};

export default function LedgerPage() {
  const [tab, setTab] = useState<Tab>('coa');

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/finance" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2">
            ← Back to Finance
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" />
            General Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Yardi/MRI-grade accounting: chart of accounts, double-entry journal, segregated owner trust, UAE 5% VAT reporting.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">AED · TRN-100123456700003</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                active ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'coa' && <ChartOfAccountsView />}
      {tab === 'journal' && <JournalView />}
      {tab === 'trust' && <TrustAccountsView />}
      {tab === 'vat' && <VatReportView />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Chart of Accounts
// ─────────────────────────────────────────────────────────────────────

function ChartOfAccountsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['coa'],
    queryFn: () => api.get('/finance/chart-of-accounts'),
  });

  if (isLoading) return <Skeleton className="h-72" />;

  const accounts: any[] = (data as any)?.data ?? data ?? [];
  const grouped: Record<string, any[]> = {};
  for (const a of accounts) {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  }

  const totals = Object.entries(grouped).map(([type, list]) => ({
    type,
    total: list.reduce((s, a) => s + Number(a.balance ?? 0), 0),
  }));

  return (
    <div className="space-y-4">
      {/* Type totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'].map((t) => {
          const total = totals.find((x) => x.type === t)?.total ?? 0;
          const c = TYPE_COLOR[t];
          return (
            <Card key={t} className={`border-0 ${c.bg.replace('100', '50')}`}>
              <CardContent className="p-4">
                <p className={`text-[10px] uppercase tracking-wide font-semibold ${c.fg}`}>{t}</p>
                <p className={`text-2xl font-bold mt-1 ${c.fg}`}>AED {total.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {Object.entries(grouped).map(([type, list]) => {
        const c = TYPE_COLOR[type];
        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${c.bg} ${c.fg}`}>{type}</span>
                {type === 'ASSET' && 'Assets'}
                {type === 'LIABILITY' && 'Liabilities'}
                {type === 'INCOME' && 'Income'}
                {type === 'EXPENSE' && 'Expenses'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-5 py-2 font-medium text-xs uppercase w-24">Code</th>
                    <th className="px-5 py-2 font-medium text-xs uppercase">Account</th>
                    <th className="px-5 py-2 font-medium text-xs uppercase">Subtype</th>
                    <th className="px-5 py-2 font-medium text-xs uppercase text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map((a) => (
                    <tr key={a.code} className="hover:bg-gray-50">
                      <td className="px-5 py-2 font-mono text-xs text-gray-600">{a.code}</td>
                      <td className="px-5 py-2 font-medium text-gray-900">{a.name}</td>
                      <td className="px-5 py-2 text-xs text-gray-500">{a.subtype}</td>
                      <td className={`px-5 py-2 text-right font-bold ${Number(a.balance) === 0 ? 'text-gray-400' : c.fg}`}>
                        AED {Number(a.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Journal Entries (double-entry display)
// ─────────────────────────────────────────────────────────────────────

function JournalView() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn: () => api.get('/finance/journal-entries?limit=50'),
  });

  if (isLoading) return <Skeleton className="h-72" />;

  const entries: any[] = (data as any)?.data ?? data ?? [];

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Coins className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No journal entries yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Recent journal entries</span>
          <Badge variant="outline" className="text-xs">Double-entry</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {entries.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <div key={e.id} className="hover:bg-gray-50">
                <button
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="w-full text-left px-5 py-3 flex items-center gap-3"
                >
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.description}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{e.ref} · {new Date(e.date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">AED {Number(e.total).toLocaleString()}</p>
                </button>
                {isOpen && (
                  <div className="px-5 pb-3 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b">
                          <th className="px-2 py-1 text-left font-medium">Account</th>
                          <th className="px-2 py-1 text-right font-medium">Debit</th>
                          <th className="px-2 py-1 text-right font-medium">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.lines.map((l: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="px-2 py-1.5">
                              <span className="font-mono text-gray-500 mr-2">{l.account}</span>
                              <span className="text-gray-800">{l.accountName}</span>
                            </td>
                            <td className="px-2 py-1.5 text-right text-emerald-700 font-mono">{l.debit > 0 ? Number(l.debit).toLocaleString() : '—'}</td>
                            <td className="px-2 py-1.5 text-right text-red-700 font-mono">{l.credit > 0 ? Number(l.credit).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Owner Trust Accounts
// ─────────────────────────────────────────────────────────────────────

function TrustAccountsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['trust-accounts'],
    queryFn: () => api.get('/finance/trust-accounts'),
  });

  if (isLoading) return <Skeleton className="h-72" />;

  const accounts: any[] = (data as any)?.data ?? data ?? [];
  const totalBalanceOwed = accounts.reduce((s, a) => s + Number(a.balanceOwed ?? 0), 0);
  const totalMgmtRetained = accounts.reduce((s, a) => s + Number(a.mgmtFeeRetained ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Trust accounting principle
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Tenant rent flows into the Cash–Trust account and is held on behalf of the property owner.
            The PM company retains only its management fee in the Cash–Operating account.
            The two accounts are <b>never commingled</b> — UAE trust accounting requires strict segregation.
          </p>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <p className="text-[10px] text-blue-700 uppercase tracking-wide font-semibold">Total trust balance</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">AED {totalBalanceOwed.toLocaleString()}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Owed to owners</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-4">
            <p className="text-[10px] text-emerald-700 uppercase tracking-wide font-semibold">Management fees retained</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">AED {totalMgmtRetained.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">PM operating income</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <p className="text-[10px] text-amber-700 uppercase tracking-wide font-semibold">Active owner accounts</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{accounts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-owner trust table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Per-owner trust balances</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-5 py-2 font-medium text-xs uppercase">Owner</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Properties</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Units</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Gross collected</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Mgmt fee</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Trust balance</th>
                <th className="px-5 py-2 font-medium text-xs uppercase">Last txn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map((a) => (
                <tr key={a.ownerId} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/owners/${a.ownerId}`} className="font-medium text-amber-600 hover:underline">{a.ownerName}</Link>
                    <p className="text-[10px] text-gray-500 mt-0.5">Mgmt fee {a.mgmtFeePct}%</p>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{a.properties}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{a.units}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">AED {Number(a.grossCollected).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-emerald-700 font-medium">AED {Number(a.mgmtFeeRetained).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-bold text-blue-700">AED {Number(a.balanceOwed).toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {a.lastTransactionAt ? new Date(a.lastTransactionAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VAT Report
// ─────────────────────────────────────────────────────────────────────

function VatReportView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['vat-report', year, quarter],
    queryFn: () => api.get('/finance/vat-report', { params: { year, ...(quarter ? { quarter } : {}) } }),
  });

  if (isLoading) return <Skeleton className="h-72" />;

  const rpt: any = (data as any)?.data ?? data ?? {};
  const totals = rpt.totals ?? {};
  const byMonth = rpt.byMonth ?? [];

  return (
    <div className="space-y-4">
      {/* TRN + period selector */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] text-amber-700 uppercase tracking-wide font-semibold">UAE Federal Tax Authority</p>
            <p className="text-sm font-bold text-amber-900 mt-1 font-mono">TRN {rpt.trn ?? '—'}</p>
            <p className="text-[10px] text-amber-700 mt-1">VAT rate · {((rpt.vatRate ?? 0.05) * 100).toFixed(0)}%</p>
          </div>
          <div className="flex gap-2">
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="text-sm border border-amber-300 rounded px-2 py-1 bg-white">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={quarter ?? ''} onChange={(e) => setQuarter(e.target.value ? parseInt(e.target.value) : undefined)} className="text-sm border border-amber-300 rounded px-2 py-1 bg-white">
              <option value="">Full year</option>
              <option value="1">Q1 (Jan–Mar)</option>
              <option value="2">Q2 (Apr–Jun)</option>
              <option value="3">Q3 (Jul–Sep)</option>
              <option value="4">Q4 (Oct–Dec)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-0 bg-white">
          <CardContent className="p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Rent collected (taxable)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">AED {Number(totals.rentCollected ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-[10px] text-emerald-700 uppercase tracking-wide font-semibold">Output VAT (collected)</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">AED {Number(totals.outputVat ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">VAT on management fee</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-red-50">
          <CardContent className="p-4">
            <p className="text-[10px] text-red-700 uppercase tracking-wide font-semibold">Input VAT (paid)</p>
            <p className="text-2xl font-bold text-red-700 mt-1">AED {Number(totals.inputVat ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-red-600 mt-0.5">Recoverable from FTA</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-amber-800 uppercase tracking-wide font-semibold">Net VAT payable to FTA</p>
            <p className="text-3xl font-bold text-amber-900 mt-1">AED {Number(totals.netVatPayable ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-amber-800 mt-1">Output VAT − Input VAT</p>
          </div>
          <TrendingUp className="w-10 h-10 text-amber-700" />
        </CardContent>
      </Card>

      {/* Monthly breakdown */}
      {byMonth.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly VAT breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="rent" fill="#94A3B8" name="Rent collected" />
                  <Bar dataKey="mgmt" fill="#10B981" name="Mgmt fee" />
                  <Bar dataKey="vat" fill="#D97706" name="VAT due" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
