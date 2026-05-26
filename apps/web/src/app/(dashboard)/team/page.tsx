'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus, Mail, Phone, Shield, Crown } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const ROLE_INFO: Record<string, { label: string; description: string; color: string; bg: string }> = {
  PM_ADMIN: { label: 'PM Admin', description: 'Full access to all modules, finance, settings', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  PM_OPS: { label: 'PM Operations', description: 'Day-to-day operations, no finance edit, no settings', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  WORKSPACE_OWNER: { label: 'Workspace Owner', description: 'Founder-level access including billing', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

const MOCK_TEAM = [
  { id: '1', fullName: 'Ruqaiya Al Rashidi', phone: '+971501000002', email: 'ruqaiya@rocky-re.ae', role: 'PM_ADMIN', joinedAt: '2024-03-12', status: 'ACTIVE', avatar: 'RA' },
  { id: '2', fullName: 'Omar Al Hashimi', phone: '+971501000003', email: 'omar@rocky-re.ae', role: 'PM_OPS', joinedAt: '2024-04-05', status: 'ACTIVE', avatar: 'OH' },
];

const MOCK_INVITES = [
  { id: 'i1', email: 'fatima.ops@rocky-re.ae', role: 'PM_OPS', sentAt: '2026-05-22', expiresAt: '2026-05-29' },
];

export default function TeamPage() {
  const { user, currentWorkspace } = useAuthStore();

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Workspace members for <span className="font-medium">{currentWorkspace?.workspace?.name ?? 'this workspace'}</span>. Invite staff via phone — they'll receive an OTP login link.
          </p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => toast.info('Invite UI coming next — for now, contact support to add new members.')}
        >
          <UserPlus className="w-4 h-4 mr-1.5" /> Invite Member
        </Button>
      </div>

      {/* Active members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active members ({MOCK_TEAM.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-5 py-2 font-medium text-xs uppercase">Member</th>
                <th className="px-5 py-2 font-medium text-xs uppercase">Role</th>
                <th className="px-5 py-2 font-medium text-xs uppercase">Contact</th>
                <th className="px-5 py-2 font-medium text-xs uppercase">Joined</th>
                <th className="px-5 py-2 font-medium text-xs uppercase">Status</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_TEAM.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-xs">
                        {m.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{m.fullName}</p>
                        {m.id === user?.id && <span className="text-[10px] text-amber-600 font-semibold uppercase">You</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className={ROLE_INFO[m.role]?.color}>
                      {m.role === 'PM_ADMIN' && <Crown className="w-3 h-3 mr-1" />}
                      {m.role === 'PM_OPS' && <Shield className="w-3 h-3 mr-1" />}
                      {ROLE_INFO[m.role]?.label ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3" /> {m.phone}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {m.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {new Date(m.joinedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="success" className="text-xs">ACTIVE</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="text-xs text-gray-500 hover:text-gray-700">Manage →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {MOCK_INVITES.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📨 Pending invites ({MOCK_INVITES.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-5 py-2 font-medium text-xs uppercase">Email</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Role</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Sent</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Expires</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_INVITES.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900">{inv.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline">{ROLE_INFO[inv.role]?.label ?? inv.role}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(inv.sentAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(inv.expiresAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button className="text-xs text-amber-600 hover:underline">Resend</button>
                      <button className="text-xs text-red-500 hover:underline">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Role reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Role definitions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(ROLE_INFO).map(([key, info]) => (
            <div key={key} className={`p-4 rounded-xl border-2 ${info.bg}`}>
              <p className={`font-semibold text-sm ${info.color}`}>{info.label}</p>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">{info.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
