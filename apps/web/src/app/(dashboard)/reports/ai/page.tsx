'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sparkles, Crown, Shield, Home, User, Wrench, Download, RefreshCw } from 'lucide-react';

type Persona = 'PM_ADMIN' | 'PM_OPS' | 'OWNER' | 'TENANT' | 'VENDOR';

const PERSONAS: { id: Persona; label: string; icon: any; description: string; color: string }[] = [
  { id: 'PM_ADMIN', label: 'PM Admin',       icon: Crown,  description: 'Executive snapshot, action queue, strategic recommendations', color: 'text-amber-600' },
  { id: 'PM_OPS',   label: 'PM Operations',  icon: Shield, description: 'Live ops queue, SLA risk, daily route',                       color: 'text-blue-600' },
  { id: 'OWNER',    label: 'Owner',          icon: Home,   description: 'Portfolio P&L, market positioning, retention score',          color: 'text-emerald-600' },
  { id: 'TENANT',   label: 'Tenant',         icon: User,   description: 'Lease summary, payments, renewal countdown',                   color: 'text-purple-600' },
  { id: 'VENDOR',   label: 'Vendor',         icon: Wrench, description: 'Performance, earnings, growth tips',                            color: 'text-rose-600' },
];

export default function AIReportsPage() {
  const [persona, setPersona] = useState<Persona>('PM_ADMIN');
  const [entityId, setEntityId] = useState('');

  // Lists for the entity-picker dropdown — only loaded for persona that need it
  const { data: ownersList } = useQuery({
    queryKey: ['ai-report-owners'],
    queryFn: () => api.get('/owners'),
    enabled: persona === 'OWNER',
  });
  const { data: tenantsList } = useQuery({
    queryKey: ['ai-report-tenants'],
    queryFn: () => api.get('/tenants'),
    enabled: persona === 'TENANT',
  });
  const { data: vendorsList } = useQuery({
    queryKey: ['ai-report-vendors'],
    queryFn: () => api.get('/vendors'),
    enabled: persona === 'VENDOR',
  });

  const needsEntity = persona === 'OWNER' || persona === 'TENANT' || persona === 'VENDOR';

  const { data, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ['ai-report', persona, entityId],
    queryFn: () => api.get(`/ai/reports/${persona}`, { params: entityId ? { entityId } : {} }),
    enabled: !needsEntity || !!entityId,
  });

  const report: any = (data as any)?.data ?? data;
  const entityOptions = (
    persona === 'OWNER'  ? ((ownersList as any)?.data ?? ownersList ?? []) :
    persona === 'TENANT' ? ((tenantsList as any)?.data?.data ?? (tenantsList as any)?.data ?? tenantsList ?? []) :
    persona === 'VENDOR' ? ((vendorsList as any)?.data ?? vendorsList ?? []) :
    []
  );

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      {/* Header */}
      <div>
        <Link href="/reports" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2">
          ← Back to Reports
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-purple-500" />
          AI Intelligence Reports
          <span className="text-xs font-normal text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Powered by Manara AI</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalised intelligence briefings tailored to each role. Generated on-demand from live workspace data.
        </p>
      </div>

      {/* Persona picker */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          const active = persona === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { setPersona(p.id); setEntityId(''); }}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                active ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-200 bg-white hover:border-purple-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-purple-700' : p.color}`} />
              <p className={`font-semibold text-sm mt-2 ${active ? 'text-purple-900' : 'text-gray-900'}`}>{p.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{p.description}</p>
            </button>
          );
        })}
      </div>

      {/* Entity picker (if needed) */}
      {needsEntity && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">Generate for:</span>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[280px]"
            >
              <option value="">— select a {persona.toLowerCase()} —</option>
              {entityOptions.map((e: any) => (
                <option key={e.id} value={e.id}>{(e.fullName ?? e.companyName ?? e.name) as string}</option>
              ))}
            </select>
            <div className="flex-1" />
            {data && (
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Regenerate
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report content */}
      {needsEntity && !entityId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-10 h-10 text-purple-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Select a {persona.toLowerCase()} above to generate the report.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : !report ? (
        <Card><CardContent className="py-8 text-center text-sm text-gray-400">No data</CardContent></Card>
      ) : (
        <div className="space-y-3">
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                  {persona.replace('_', ' ')} INTELLIGENCE BRIEF
                </p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {report.ownerName ?? report.tenantName ?? report.vendorName ?? 'Workspace-wide'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase">Generated</p>
                <p className="text-xs text-gray-700">{report.generatedAt ? new Date(report.generatedAt).toLocaleString('en-AE') : '—'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="w-3.5 h-3.5 mr-1" /> Export
              </Button>
            </CardContent>
          </Card>

          {(report.sections ?? []).map((s: any, i: number) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {renderMarkdownish(s.body)}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-gray-50">
            <CardContent className="p-3">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                ⚡  This report was generated by Manara AI based on workspace data as of the timestamp above.
                Numerical projections are estimates; treat as decision-support, not financial advice.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Minimal markdown-ish renderer — handles **bold** and bullet lines.
function renderMarkdownish(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>');
    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
      return <p key={i} className="ml-2" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return line.trim() === '' ? <br key={i} /> : <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}
