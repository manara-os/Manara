'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Building2, Users, Bell, CreditCard, Key, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { workspacesApi } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { currentWorkspace, user } = useAuthStore();
  const qc = useQueryClient();

  const ws = currentWorkspace?.workspace as any;
  const [form, setForm] = useState({
    name: ws?.name ?? '',
    contactEmail: ws?.contactEmail ?? '',
    contactPhone: ws?.contactPhone ?? '',
    city: ws?.city ?? '',
    trnNumber: ws?.trnNumber ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      toast.success('Settings saved');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save settings'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const sections = [
    { id: 'workspace', label: 'Workspace', icon: Building2, description: 'Manage workspace details and branding' },
    { id: 'team', label: 'Team Members', icon: Users, description: 'Invite and manage team access' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Configure alerts and reminders' },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard, description: 'Subscription, invoices, and upgrades' },
    { id: 'api', label: 'API Keys', icon: Key, description: 'Manage API access tokens' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Audit logs and access control' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your workspace preferences and configurations</p>
      </div>

      {/* Workspace Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
          <CardDescription>Basic information about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Workspace Name</Label>
              <Input value={form.name} onChange={set('name')} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input defaultValue={(ws as any)?.slug ?? ''} disabled className="bg-gray-50 dark:bg-gray-800" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={set('contactEmail')} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Phone</Label>
              <Input type="tel" value={form.contactPhone} onChange={set('contactPhone')} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={set('city')} />
            </div>
            <div className="space-y-1.5">
              <Label>VAT Number (TRN)</Label>
              <Input value={form.trnNumber} onChange={set('trnNumber')} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section, i) => (
          <motion.div key={section.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{section.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{section.description}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Subscription Info */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Current Plan</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-amber-600">{currentWorkspace?.workspace?.subscriptionPlan ?? 'STARTER'}</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Active</span>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/settings/billing">Manage Plan</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
