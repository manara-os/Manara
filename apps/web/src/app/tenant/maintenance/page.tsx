'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { ticketsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const CATEGORIES = [
  'PLUMBING', 'ELECTRICAL', 'AC_HVAC', 'PEST_CONTROL', 'PAINTING', 'CARPENTRY',
  'CLEANING', 'LANDSCAPING', 'APPLIANCE', 'STRUCTURAL', 'SECURITY', 'ELEVATOR', 'POOL', 'GYM', 'OTHER',
];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'secondary'> = {
  OPEN: 'info',
  ASSIGNED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CLOSED: 'secondary',
};

export default function TenantMaintenancePage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState('MEDIUM');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant', 'my-tickets'],
    queryFn: () => ticketsApi.list(),
    staleTime: 60 * 1000,
  });

  const createTicket = useMutation({
    mutationFn: () => ticketsApi.create({ title, description, category, priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'my-tickets'] });
      setOpen(false);
      setTitle('');
      setDescription('');
      setCategory('OTHER');
      setPriority('MEDIUM');
    },
  });

  const tickets: any[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Maintenance</h1>
          <p className="text-xs text-muted-foreground">{tickets.length} request{tickets.length === 1 ? '' : 's'}</p>
        </div>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wrench className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">No maintenance requests yet.</p>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}>
            Submit a request
          </Button>
        </div>
      )}

      {!isLoading && tickets.map((t) => (
        <Card key={t.id} className="border-0 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-gray-400 font-mono">{t.ticketRef}</span>
              <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'} className="text-[10px]">{t.status}</Badge>
            </div>
            <p className="text-sm font-medium text-gray-900">{t.title}</p>
            {t.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>}
            <p className="text-[11px] text-gray-400 mt-1.5">{formatDate(t.createdAt)}</p>
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New maintenance request</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Leaking tap in kitchen"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 w-full"
              disabled={!title.trim() || createTicket.isPending}
              onClick={() => createTicket.mutate()}
            >
              {createTicket.isPending ? 'Submitting...' : 'Submit request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
