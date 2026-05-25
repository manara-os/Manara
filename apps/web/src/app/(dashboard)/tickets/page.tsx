'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Wrench, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { ticketsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatRelativeDate, getTicketPriorityColor } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'border-blue-200 bg-blue-50/50',
  ASSIGNED: 'border-amber-200 bg-amber-50/50',
  IN_PROGRESS: 'border-purple-200 bg-purple-50/50',
  COMPLETED: 'border-green-200 bg-green-50/50',
};

const PRIORITY_DOT: Record<string, string> = {
  EMERGENCY: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-gray-400',
};

export default function TicketsPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['tickets-board'],
    queryFn: () => ticketsApi.getBoard(),
    staleTime: 30 * 1000,
    enabled: view === 'kanban',
  });

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['tickets-list', search],
    queryFn: () => ticketsApi.list({ search }),
    staleTime: 30 * 1000,
    enabled: view === 'list',
  });

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Maintenance</h1>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Maintenance</span>
          </div>
          <p className="text-sm text-gray-500">Track and manage maintenance tickets</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}
            >
              List
            </button>
          </div>
          <Button asChild size="sm">
            <Link href="/tickets/new"><Plus className="w-4 h-4 mr-1.5" />New Ticket</Link>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
            const tickets = (board as any)?.[status] ?? [];
            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className={`rounded-xl border p-3 min-h-[500px] ${STATUS_STYLES[status] ?? 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{STATUS_LABELS[status]}</span>
                    <span className="text-xs bg-white dark:bg-gray-800 rounded-full px-2 py-0.5 text-gray-500 font-medium shadow-sm">
                      {tickets.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {boardLoading ? (
                      [...Array(2)].map((_, i) => (
                        <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-lg animate-pulse" />
                      ))
                    ) : (
                      tickets.map((ticket: any) => (
                        <motion.div
                          key={ticket.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <Link href={`/tickets/${ticket.id}`}>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-amber-200 cursor-pointer">
                              <div className="flex items-start gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${PRIORITY_DOT[ticket.priority] ?? 'bg-gray-400'}`} />
                                <span className="text-xs font-medium text-gray-900 dark:text-white leading-snug">{ticket.title}</span>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                {ticket.unit?.unitNumber} · {ticket.unit?.property?.name}
                              </div>
                              {ticket.vendor && (
                                <div className="text-xs text-amber-600 font-medium">{ticket.vendor.companyName}</div>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400">{ticket.ticketRef}</span>
                                <span className="text-xs text-gray-400">{formatRelativeDate(ticket.createdAt)}</span>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-xs" />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ref</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {((list as any)?.data ?? (list as any) ?? []).map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">{ticket.ticketRef}</td>
                    <td className="px-5 py-3">
                      <Link href={`/tickets/${ticket.id}`} className="font-medium text-gray-900 dark:text-white hover:text-amber-600">
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{ticket.unit?.unitNumber} · {ticket.unit?.property?.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{ticket.priority}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={ticket.status === 'COMPLETED' || ticket.status === 'CLOSED' ? 'success' : ticket.status === 'OPEN' ? 'info' : 'warning'} className="text-xs">
                        {ticket.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatRelativeDate(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
