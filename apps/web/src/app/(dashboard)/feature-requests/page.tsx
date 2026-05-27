'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lightbulb, ThumbsUp, MessageSquare, Sparkles, CheckCircle2, Clock, Rocket } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'PLANNED' | 'IN_PROGRESS' | 'SHIPPED' | 'WONT_DO';
  votes: number;
  comments: number;
  author: string;
  createdAt: string;
  tags: string[];
}

const MOCK_REQUESTS: FeatureRequest[] = [
  {
    id: 'fr-1',
    title: 'Bulk lease renewal — multi-tenant at once',
    description: 'Allow PM Admin to select multiple leases approaching expiry and trigger renewal screening in one batch operation.',
    status: 'PLANNED',
    votes: 12,
    comments: 3,
    author: 'Ruqaiya Al Rashidi',
    createdAt: '2026-05-18',
    tags: ['Leases', 'Workflow'],
  },
  {
    id: 'fr-2',
    title: 'WhatsApp template editor in Settings',
    description: 'Right now WhatsApp messages use hardcoded templates. Let PM Admin customize the rent-reminder / move-in / renewal scripts per workspace.',
    status: 'IN_PROGRESS',
    votes: 8,
    comments: 5,
    author: 'Omar Al Hashimi',
    createdAt: '2026-05-15',
    tags: ['Communications', 'Settings'],
  },
  {
    id: 'fr-3',
    title: 'Export Owner SOA as PDF directly to email',
    description: 'Monthly SOA PDF is generated but currently has to be downloaded then attached manually. One-click email-to-owner would save 15min per month per owner.',
    status: 'SHIPPED',
    votes: 22,
    comments: 7,
    author: 'Fatima Al Nahyan',
    createdAt: '2026-04-02',
    tags: ['Finance', 'Owners'],
  },
  {
    id: 'fr-4',
    title: 'Real-time RERA Rent Index ticker on dashboard',
    description: 'Display current Dubai RERA rent index ticker on PM Admin dashboard so we can see market shifts without leaving the app.',
    status: 'OPEN',
    votes: 5,
    comments: 2,
    author: 'Ruqaiya Al Rashidi',
    createdAt: '2026-05-22',
    tags: ['Dashboard', 'RERA'],
  },
  {
    id: 'fr-5',
    title: 'Tenant mobile app: in-app rent payment via Apple Pay',
    description: 'Tenants currently can only see PDC schedule. Enable direct payment from the mobile app with Apple Pay / Google Pay / Mada.',
    status: 'PLANNED',
    votes: 18,
    comments: 6,
    author: 'Omar Al Hashimi',
    createdAt: '2026-05-10',
    tags: ['Mobile', 'Finance', 'Tenant'],
  },
];

const STATUS_META: Record<string, { label: string; bg: string; fg: string; icon: any }> = {
  OPEN:        { label: 'Open',         bg: 'bg-gray-100',    fg: 'text-gray-700',    icon: Lightbulb },
  PLANNED:     { label: 'Planned',      bg: 'bg-blue-100',    fg: 'text-blue-700',    icon: Clock },
  IN_PROGRESS: { label: 'In Progress',  bg: 'bg-amber-100',   fg: 'text-amber-700',   icon: Sparkles },
  SHIPPED:     { label: 'Shipped',      bg: 'bg-emerald-100', fg: 'text-emerald-700', icon: CheckCircle2 },
  WONT_DO:     { label: "Won't do",     bg: 'bg-red-100',     fg: 'text-red-700',     icon: Clock },
};

const TABS = ['ALL', 'OPEN', 'PLANNED', 'IN_PROGRESS', 'SHIPPED'] as const;

export default function FeatureRequestsPage() {
  const [filter, setFilter] = useState<typeof TABS[number]>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [requests, setRequests] = useState<FeatureRequest[]>(MOCK_REQUESTS);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const filtered = filter === 'ALL' ? requests : requests.filter((r) => r.status === filter);

  const submit = () => {
    if (!title.trim()) {
      toast.error('Add a title for your feature request');
      return;
    }
    const newReq: FeatureRequest = {
      id: 'fr-' + Date.now(),
      title: title.trim(),
      description: desc.trim() || '(no description)',
      status: 'OPEN',
      votes: 1,
      comments: 0,
      author: 'You',
      createdAt: new Date().toISOString().slice(0, 10),
      tags: ['Pending review'],
    };
    setRequests([newReq, ...requests]);
    setTitle('');
    setDesc('');
    setShowForm(false);
    toast.success('Feature request submitted — product team will review within 5 business days.');
  };

  const upvote = (id: string) => {
    if (voted.has(id)) {
      setVoted(new Set(Array.from(voted).filter((v) => v !== id)));
      setRequests(requests.map((r) => (r.id === id ? { ...r, votes: r.votes - 1 } : r)));
    } else {
      setVoted(new Set([...Array.from(voted), id]));
      setRequests(requests.map((r) => (r.id === id ? { ...r, votes: r.votes + 1 } : r)));
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-7 h-7 text-amber-500" />
            Feature Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tell us what to build next. Upvote ideas you like — the product team prioritizes by vote count.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-600 hover:bg-amber-700">
          <Lightbulb className="w-4 h-4 mr-1.5" />
          {showForm ? 'Cancel' : 'New request'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-5 space-y-3">
            <Input
              placeholder="One-line summary of what you want"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              autoFocus
            />
            <textarea
              placeholder="Optional — describe the use case, who benefits, why this matters..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={submit} className="bg-amber-600 hover:bg-amber-700">
                Submit request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              filter === t ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'ALL' ? 'All' : STATUS_META[t]?.label ?? t}
            <span className="ml-1.5 text-[10px] text-gray-400">
              ({t === 'ALL' ? requests.length : requests.filter((r) => r.status === t).length})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => {
          const sm = STATUS_META[r.status];
          const SmIcon = sm?.icon ?? Lightbulb;
          const isVoted = voted.has(r.id);
          return (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => upvote(r.id)}
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 transition-colors ${
                      isVoted
                        ? 'bg-amber-100 border-amber-400 text-amber-700'
                        : 'bg-gray-50 border-gray-200 hover:border-amber-300 text-gray-600'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs font-bold mt-0.5">{r.votes}</span>
                  </button>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{r.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${sm.bg} ${sm.fg}`}>
                        <SmIcon className="w-3 h-3" /> {sm.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.description}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <span>{r.author}</span>
                      <span>·</span>
                      <span>{new Date(r.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {r.comments}
                      </span>
                      <span>·</span>
                      <div className="flex gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
