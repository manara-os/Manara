'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus, Mail, Phone, Shield, Crown, AlertTriangle, Clock, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { teamApi } from '@/lib/api';
import { toast } from 'sonner';

const ROLE_INFO: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PLATFORM_ADMIN: { label: 'Platform Admin', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: Crown },
  PM_ADMIN:       { label: 'PM Admin',       color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: Shield },
  PM_OPS:         { label: 'PM Operations',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    icon: UserPlus },
};

const TIER_INFO: Record<string, { label: string; color: string; bg: string }> = {
  tier4: { label: '🟣 Tier 4 — Executive',          color: 'text-purple-700', bg: 'bg-purple-50' },
  tier3: { label: '🟠 Tier 3 — Management',         color: 'text-amber-700',  bg: 'bg-amber-50' },
  tier2: { label: '🔵 Tier 2 — Senior operations', color: 'text-blue-700',   bg: 'bg-blue-50' },
  tier1: { label: '🟢 Tier 1 — First responders',  color: 'text-emerald-700',bg: 'bg-emerald-50' },
};

export default function TeamPage() {
  const { currentWorkspace } = useAuthStore();

  const { data: team = [], isLoading } = useQuery<any[]>({
    queryKey: ['team'],
    queryFn: () => teamApi.list() as Promise<any[]>,
  });

  const { data: matrix } = useQuery<any>({
    queryKey: ['team-matrix'],
    queryFn: () => teamApi.matrix() as Promise<any>,
  });

  const managerLookup: Record<string, any> = {};
  for (const m of team) managerLookup[m.userId] = m;

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Workspace members for <span className="font-medium">{currentWorkspace?.workspace?.name ?? 'this workspace'}</span> · escalation matrix + reporting hierarchy
          </p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => toast.info('Invite UI — contact your CSM to add new members for now')}
        >
          <UserPlus className="w-4 h-4 mr-1.5" /> Invite member
        </Button>
      </div>

      {/* Escalation Matrix */}
      {matrix && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Escalation Matrix
              <Badge variant="outline" className="text-[10px] ml-1">SLA-bound</Badge>
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">When a critical issue is raised, escalation flows bottom-up. Each tier has its own SLA.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(['tier4', 'tier3', 'tier2', 'tier1'] as const).map((key) => {
                const tier = matrix[key];
                if (!tier?.members?.length) return null;
                const info = TIER_INFO[key];
                return (
                  <div key={key} className={`rounded-lg border ${info.bg} border-gray-200 p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-bold uppercase tracking-wide ${info.color}`}>{info.label}</p>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> SLA: {tier.sla}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {tier.members.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2 bg-white rounded-md p-2 border border-white">
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt={m.fullName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {(m.fullName ?? '??').split(' ').map((s: string) => s[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{m.fullName ?? 'Unknown'}</p>
                            <p className="text-[10px] text-gray-500 truncate">{m.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workspace members ({team.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Loading team...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase">Member</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase">Role / Title</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase">Department</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase">Reports to</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase">Escalation tier</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase">Shift</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {team.map((m) => {
                    const roleInfo = ROLE_INFO[m.role] ?? ROLE_INFO.PM_OPS;
                    const RoleIcon = roleInfo.icon;
                    const reportsTo = m.reportingManagerId ? managerLookup[m.reportingManagerId] : null;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {m.avatarUrl ? (
                              <img src={m.avatarUrl} alt={m.fullName} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                {(m.fullName ?? '??').split(' ').map((s: string) => s[0]).join('').slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">{m.fullName ?? 'Unknown'}</p>
                              <p className="text-[11px] text-gray-500">{m.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${roleInfo.bg} ${roleInfo.color} border-0 text-[10px]`}>
                            <RoleIcon className="w-2.5 h-2.5 mr-0.5 inline" /> {roleInfo.label}
                          </Badge>
                          <p className="text-xs text-gray-700 mt-1">{m.title}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{m.department}</td>
                        <td className="px-4 py-3 text-xs">
                          {reportsTo ? (
                            <div className="flex items-center gap-1.5">
                              {reportsTo.avatarUrl ? (
                                <img src={reportsTo.avatarUrl} alt={reportsTo.fullName} className="w-5 h-5 rounded-full object-cover" />
                              ) : null}
                              <span className="text-gray-700">{reportsTo.fullName ?? '—'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Top of chain</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            m.escalationLevel === 4 ? 'bg-purple-100 text-purple-700' :
                            m.escalationLevel === 3 ? 'bg-amber-100 text-amber-700' :
                            m.escalationLevel === 2 ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            <ChevronUp className="w-2.5 h-2.5 inline mr-0.5" /> Tier {m.escalationLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.shiftPattern}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-[11px] text-gray-600">
                            <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{m.phone ?? '—'}</span>
                            {m.email && <span className="flex items-center gap-1 mt-0.5"><Mail className="w-2.5 h-2.5" />{m.email}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsibilities cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {team.filter((m) => (m.responsibilities ?? []).length > 0).map((m) => (
          <Card key={m.id} className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5 mb-2">
                {m.avatarUrl && <img src={m.avatarUrl} alt={m.fullName} className="w-8 h-8 rounded-full object-cover" />}
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{m.fullName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{m.title}</p>
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 mb-1.5">Responsibilities</p>
              <ul className="text-xs text-gray-700 space-y-1">
                {(m.responsibilities ?? []).map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
