'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertOctagon, CheckCircle2, Calendar, Bell, Plus, X, FileText, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceItem {
  id: string;
  category: 'TRADE_LICENSE' | 'VAT_FILING' | 'RERA' | 'DLD' | 'INSURANCE' | 'STAFF_VISA' | 'FIRE_SAFETY' | 'CIVIL_DEFENCE';
  name: string;
  reference?: string;
  expiryDate: Date;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'PENDING_RENEWAL';
  remindersSent: number;
  cost?: number;
  responsibleStaff?: string;
}

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  TRADE_LICENSE: { label: 'Trade License',      emoji: '🏢', color: 'bg-blue-100 text-blue-700' },
  VAT_FILING:    { label: 'VAT Filing',         emoji: '📊', color: 'bg-emerald-100 text-emerald-700' },
  RERA:          { label: 'RERA',               emoji: '🏛️', color: 'bg-amber-100 text-amber-700' },
  DLD:           { label: 'DLD / Ejari',        emoji: '🏗️', color: 'bg-purple-100 text-purple-700' },
  INSURANCE:     { label: 'Insurance',          emoji: '🛡️', color: 'bg-cyan-100 text-cyan-700' },
  STAFF_VISA:    { label: 'Staff Visa / EID',   emoji: '🪪', color: 'bg-rose-100 text-rose-700' },
  FIRE_SAFETY:   { label: 'Fire Safety',        emoji: '🔥', color: 'bg-orange-100 text-orange-700' },
  CIVIL_DEFENCE: { label: 'Civil Defence',      emoji: '🚨', color: 'bg-red-100 text-red-700' },
};

// Seed data
const MOCK_ITEMS: ComplianceItem[] = [
  { id: 'c1', category: 'TRADE_LICENSE', name: 'Rocky Real Estate L.L.C. trade license',           reference: 'DED-1234567',     expiryDate: new Date('2026-09-15'), status: 'VALID',           remindersSent: 0, cost: 12000, responsibleStaff: 'Ruqaiya Al Rashidi' },
  { id: 'c2', category: 'VAT_FILING',    name: 'Q2 2026 VAT return',                                reference: 'TRN-100123456700003', expiryDate: new Date('2026-07-28'), status: 'EXPIRING_SOON',   remindersSent: 1, responsibleStaff: 'Ruqaiya Al Rashidi' },
  { id: 'c3', category: 'RERA',          name: 'RERA broker registration',                          reference: 'BRN-0245',          expiryDate: new Date('2026-08-04'), status: 'EXPIRING_SOON',   remindersSent: 1, cost: 5000, responsibleStaff: 'Omar Al Hashimi' },
  { id: 'c4', category: 'INSURANCE',     name: 'Marina Heights — building insurance',               reference: 'POL-2025-MH-0044',  expiryDate: new Date('2026-06-12'), status: 'EXPIRING_SOON',   remindersSent: 2, cost: 18000 },
  { id: 'c5', category: 'STAFF_VISA',    name: 'Omar Al Hashimi — employment visa',                 reference: 'UID-784198567',    expiryDate: new Date('2027-01-08'), status: 'VALID',           remindersSent: 0 },
  { id: 'c6', category: 'STAFF_VISA',    name: 'Ruqaiya Al Rashidi — Emirates ID',                  reference: '784-1985-...',     expiryDate: new Date('2026-06-30'), status: 'EXPIRING_SOON',   remindersSent: 1 },
  { id: 'c7', category: 'FIRE_SAFETY',   name: 'Downtown Palms — fire alarm AMC',                   reference: 'AMC-DP-2025',      expiryDate: new Date('2026-11-22'), status: 'VALID',           remindersSent: 0, cost: 8500 },
  { id: 'c8', category: 'CIVIL_DEFENCE', name: 'Marina Heights — civil defence certificate',        reference: 'CD-2024-887',     expiryDate: new Date('2026-08-30'), status: 'EXPIRING_SOON',   remindersSent: 0 },
  { id: 'c9', category: 'DLD',           name: 'JVC Gardens — Mulkiya (title)',                     reference: 'JVC-DEED-2020-GN003', expiryDate: new Date('2030-12-31'), status: 'VALID',         remindersSent: 0 },
  { id: 'c10',category: 'VAT_FILING',    name: 'Q1 2026 VAT return',                                reference: 'TRN-100123456700003', expiryDate: new Date('2026-04-28'), status: 'EXPIRED',       remindersSent: 3 },
];

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function deriveStatus(d: Date): ComplianceItem['status'] {
  const days = daysUntil(d);
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING_SOON';
  return 'VALID';
}

export default function CompliancePage() {
  const [items, setItems] = useState<ComplianceItem[]>(MOCK_ITEMS.map((i) => ({ ...i, status: deriveStatus(i.expiryDate) })));
  const [showAdd, setShowAdd] = useState(false);

  const expired = items.filter((i) => i.status === 'EXPIRED');
  const expiringSoon = items.filter((i) => i.status === 'EXPIRING_SOON');
  const valid = items.filter((i) => i.status === 'VALID');
  const totalAnnualCost = items.reduce((s, i) => s + (i.cost ?? 0), 0);

  // Group expiring soon by date for the timeline
  const byMonth: Record<string, ComplianceItem[]> = {};
  [...expired, ...expiringSoon, ...valid].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime()).forEach((i) => {
    const key = i.expiryDate.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' });
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(i);
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Compliance Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            UAE expiry tracking · Trade license, VAT, RERA, DLD, insurance, staff visas, fire safety, civil defence. Auto-reminders at 60/30/7 days.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add item
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-red-700 uppercase tracking-wide font-semibold flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5" /> Expired
            </p>
            <p className="text-3xl font-bold text-red-700 mt-1">{expired.length}</p>
            <p className="text-[10px] text-red-600 mt-0.5">Immediate attention — fines accrue</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Expiring (30d)
            </p>
            <p className="text-3xl font-bold text-amber-700 mt-1">{expiringSoon.length}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Renewal window open</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
            </p>
            <p className="text-3xl font-bold text-emerald-700 mt-1">{valid.length}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">No action needed</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Annual cost
            </p>
            <p className="text-3xl font-bold text-blue-700 mt-1">AED {totalAnnualCost.toLocaleString()}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Compliance budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Expired alert */}
      {expired.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" /> {expired.length} item{expired.length === 1 ? '' : 's'} EXPIRED — fines may already be accruing
            </p>
            <div className="mt-2 space-y-1">
              {expired.map((i) => (
                <p key={i.id} className="text-xs text-red-700">• {i.name} — expired {Math.abs(daysUntil(i.expiryDate))} days ago</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline grouped by month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Upcoming renewal calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(byMonth).map(([month, monthItems]) => (
            <div key={month}>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{month}</p>
              <div className="space-y-2">
                {monthItems.map((item) => {
                  const days = daysUntil(item.expiryDate);
                  const meta = CATEGORY_META[item.category];
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        item.status === 'EXPIRED' ? 'bg-red-50 border-red-200' :
                        item.status === 'EXPIRING_SOON' ? 'bg-amber-50 border-amber-200' :
                        'bg-white border-gray-200'
                      }`}
                    >
                      <div className="text-2xl flex-shrink-0">{meta.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                          {item.remindersSent > 0 && (
                            <span className="text-[10px] text-amber-700 inline-flex items-center gap-0.5">
                              <Bell className="w-2.5 h-2.5" /> {item.remindersSent} reminder{item.remindersSent === 1 ? '' : 's'} sent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.reference && <span className="font-mono">{item.reference}</span>}
                          {item.responsibleStaff && <span> · {item.responsibleStaff}</span>}
                          {item.cost && <span> · AED {item.cost.toLocaleString()}/yr</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${
                          days < 0 ? 'text-red-700' : days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-700' : 'text-gray-700'
                        }`}>
                          {item.expiryDate.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `in ${days}d`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                        onClick={() => toast.success(`Renewal triggered for ${item.name}`)}
                      >
                        Renew
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Add compliance item</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">In production, supported via a UAE compliance template library. For now, this is a placeholder.</p>
            <Button onClick={() => { toast.success('Compliance item added'); setShowAdd(false); }} className="w-full bg-blue-600 hover:bg-blue-700">
              Save (mock)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
