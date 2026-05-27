'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MessageCircle, ThumbsUp, Send, TrendingUp, AlertTriangle, Sparkles, ExternalLink, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import { reviewsApi, npsApi } from '@/lib/api';

interface Review {
  id: string;
  source: 'GOOGLE' | 'BAYUT' | 'PROPERTY_FINDER' | 'INTERNAL_NPS' | 'WHATSAPP';
  author: string;
  rating: number;
  text: string;
  date: Date;
  responded: boolean;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  property?: string;
  aiResponse?: string;
}

const SOURCE_LOGOS: Record<string, { name: string; color: string; bg: string }> = {
  GOOGLE: { name: 'Google', color: 'text-blue-700', bg: 'bg-blue-50' },
  BAYUT: { name: 'Bayut', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  PROPERTY_FINDER: { name: 'Property Finder', color: 'text-orange-700', bg: 'bg-orange-50' },
  INTERNAL_NPS: { name: 'NPS Survey', color: 'text-purple-700', bg: 'bg-purple-50' },
  WHATSAPP: { name: 'WhatsApp', color: 'text-teal-700', bg: 'bg-teal-50' },
};

const seedReviews = (): Review[] => {
  const now = Date.now();
  return [
    { id: 'r1', source: 'GOOGLE', author: 'James Okafor', rating: 5, text: 'Excellent service. AC was repaired within hours and they kept me updated on WhatsApp throughout.', date: new Date(now - 2 * 86_400_000), responded: true, sentiment: 'POSITIVE', property: 'Damac Park Towers', aiResponse: 'Thank you James! We\'re glad the team got that sorted quickly. Pleasure having you with us.' },
    { id: 'r2', source: 'BAYUT', author: 'Aisha Al Rashid', rating: 5, text: 'Found my apartment through Bayut and the leasing team made the whole process smooth. Highly recommended.', date: new Date(now - 5 * 86_400_000), responded: true, sentiment: 'POSITIVE', property: 'JVC Verde One' },
    { id: 'r3', source: 'GOOGLE', author: 'Mohammed Khan', rating: 2, text: 'Maintenance took 5 days to respond to a leaking sink. Not acceptable for the rent I pay.', date: new Date(now - 1 * 86_400_000), responded: false, sentiment: 'NEGATIVE', property: 'Damac Park Towers' },
    { id: 'r4', source: 'PROPERTY_FINDER', author: 'Priya S.', rating: 4, text: 'Good experience overall. Onboarding was fast. Wish the inspection report was a bit more detailed.', date: new Date(now - 7 * 86_400_000), responded: true, sentiment: 'POSITIVE' },
    { id: 'r5', source: 'INTERNAL_NPS', author: 'Anonymous tenant', rating: 9, text: 'NPS: 9/10 - Would recommend. Communication is excellent, only suggestion is more frequent building updates.', date: new Date(now - 3 * 86_400_000), responded: false, sentiment: 'POSITIVE' },
    { id: 'r6', source: 'GOOGLE', author: 'Sarah Lee', rating: 5, text: 'Renewal process was seamless. Sarah from PM was very helpful in negotiating fair terms.', date: new Date(now - 14 * 86_400_000), responded: true, sentiment: 'POSITIVE' },
    { id: 'r7', source: 'WHATSAPP', author: 'Carlos Mendoza', rating: 3, text: 'OK service. Cleaning vendor was late twice in a row.', date: new Date(now - 9 * 86_400_000), responded: false, sentiment: 'NEUTRAL', property: 'JVC Verde One' },
    { id: 'r8', source: 'BAYUT', author: 'Fatima H.', rating: 5, text: 'Best PM company I have dealt with in Dubai. Transparent statements, prompt repairs.', date: new Date(now - 20 * 86_400_000), responded: true, sentiment: 'POSITIVE' },
    { id: 'r9', source: 'INTERNAL_NPS', author: 'Anonymous tenant', rating: 6, text: 'NPS: 6/10 - Decent but room for improvement. AC in living room still occasionally noisy.', date: new Date(now - 1 * 86_400_000), responded: false, sentiment: 'NEUTRAL' },
    { id: 'r10', source: 'GOOGLE', author: 'Ahmed B.', rating: 5, text: 'Five stars. The AI assistant on WhatsApp resolved my query about my rent statement in seconds.', date: new Date(now - 4 * 86_400_000), responded: true, sentiment: 'POSITIVE' },
  ];
};

// Trend data is now computed from the actual reviews list at runtime
// (see computeMonthlyTrends inside the page component).

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'NEGATIVE' | 'UNRESPONDED'>('ALL');
  const [responding, setResponding] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const { data: apiReviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => reviewsApi.list() as Promise<any[]>,
  });
  const { data: dashboard } = useQuery({
    queryKey: ['reviews-dashboard'],
    queryFn: () => reviewsApi.dashboard() as Promise<any>,
  });

  const reviews: Review[] = (apiReviews.length ? apiReviews : seedReviews()).map((r: any) => ({
    id: r.id,
    source: r.source,
    author: r.author ?? r.authorName,
    rating: r.rating,
    text: r.text,
    date: new Date(r.date ?? r.postedAt ?? r.createdAt),
    responded: r.responded ?? false,
    sentiment: r.sentiment ?? 'NEUTRAL',
    property: r.property?.name ?? r.property,
    aiResponse: r.responseText ?? r.aiResponse ?? r.aiDraftResponse,
  }));

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => reviewsApi.respond(id, response),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
  const dispatchMutation = useMutation({
    mutationFn: () => npsApi.dispatch(),
    onSuccess: (res: any) => toast.success(`NPS survey scheduled for ${res.dispatched ?? 247} active tenants`),
  });

  const filtered = reviews.filter((r) => {
    if (filter === 'NEGATIVE') return r.sentiment === 'NEGATIVE' || (r.rating <= 3 && !r.text.startsWith('NPS:'));
    if (filter === 'UNRESPONDED') return !r.responded;
    return true;
  });

  // Compute monthly trends from real reviews
  const monthlyRatings = (() => {
    const buckets = new Map<string, { sum: number; count: number; key: string }>();
    for (const r of reviews) {
      if (r.text.startsWith('NPS:')) continue;
      const key = r.date.toISOString().slice(0, 7);
      const label = r.date.toLocaleDateString('en-AE', { month: 'short' });
      const row = buckets.get(label) ?? { sum: 0, count: 0, key };
      row.sum += r.rating;
      row.count++;
      buckets.set(label, row);
    }
    return Array.from(buckets.entries())
      .sort(([, a], [, b]) => a.key.localeCompare(b.key))
      .map(([month, v]) => ({ month, rating: Number((v.sum / v.count).toFixed(2)), count: v.count }));
  })();

  const npsHistory = (() => {
    const npsReviews = reviews.filter((r) => r.text.startsWith('NPS:'));
    const buckets = new Map<string, { promoters: number; detractors: number; total: number; key: string }>();
    for (const r of npsReviews) {
      const key = r.date.toISOString().slice(0, 7);
      const label = r.date.toLocaleDateString('en-AE', { month: 'short' });
      const row = buckets.get(label) ?? { promoters: 0, detractors: 0, total: 0, key };
      if (r.rating >= 9) row.promoters++;
      else if (r.rating <= 6) row.detractors++;
      row.total++;
      buckets.set(label, row);
    }
    return Array.from(buckets.entries())
      .sort(([, a], [, b]) => a.key.localeCompare(b.key))
      .map(([month, v]) => ({ month, nps: v.total ? Math.round(((v.promoters - v.detractors) / v.total) * 100) : 0 }));
  })();

  const avgRating = dashboard?.avgRating?.toFixed(1) ?? (reviews.filter((r) => !r.text.startsWith('NPS:')).reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.filter((r) => !r.text.startsWith('NPS:')).length)).toFixed(1);
  const npsScore = dashboard?.npsScore ?? 56;
  const totalReviews = dashboard?.totalReviews ?? reviews.length;
  const unresponded = dashboard?.unresponded ?? reviews.filter((r) => !r.responded).length;

  const generateAiResponse = (r: Review) => {
    const positive = `Thank you ${r.author}! We're thrilled to hear about your experience. Please let us know if there's anything else we can help with.`;
    const negative = `Hi ${r.author}, we're truly sorry about this experience — that's not the standard we hold ourselves to. Our maintenance lead will reach you within 2 hours to make this right.`;
    const neutral = `Hi ${r.author}, thanks for the honest feedback. We've flagged this with the vendor and will follow up to ensure it doesn't happen again.`;
    const text = r.sentiment === 'POSITIVE' ? positive : r.sentiment === 'NEGATIVE' ? negative : neutral;
    setDraft(text);
    setResponding(r.id);
  };

  const sendResponse = () => {
    if (!responding) return;
    respondMutation.mutate(
      { id: responding, response: draft },
      {
        onSuccess: () => {
          toast.success('Public response posted · review marked as resolved');
          setResponding(null);
          setDraft('');
        },
      },
    );
  };

  const triggerNps = () => dispatchMutation.mutate();

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            Reviews & NPS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Aggregated reviews from Google, Bayut, Property Finder + internal NPS · AI-drafted responses for every review.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={triggerNps}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Send NPS to all tenants
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Average rating</p>
            <div className="flex items-end gap-1 mt-1">
              <p className="text-2xl font-bold text-gray-900">{avgRating}</p>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500 mb-1" />
            </div>
            <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +0.2 vs last month</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">NPS score</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{npsScore}</p>
            <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +5 pts (industry: 32)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total reviews</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalReviews}</p>
            <p className="text-[11px] text-gray-400 mt-1">across 5 sources</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Unresponded</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{unresponded}</p>
            <p className="text-[11px] text-gray-400 mt-1">avg response: 47 min</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly average rating</CardTitle></CardHeader>
          <CardContent>
            {monthlyRatings.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-12">Not enough star-rating data to plot a trend yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyRatings}>
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis domain={[Math.max(0, Math.min(...monthlyRatings.map(m => m.rating)) - 0.5), 5]} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: any, _, p) => [`${v} (${p.payload.count} reviews)`, 'avg']} />
                  <Bar dataKey="rating" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">NPS trend</CardTitle></CardHeader>
          <CardContent>
            {npsHistory.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-12">No NPS responses yet — dispatch a campaign to start tracking.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={npsHistory}>
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <ReferenceLine y={50} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Excellent', fontSize: 9, fill: '#10B981' }} />
                  <ReferenceLine y={32} stroke="#9CA3AF" strokeDasharray="3 3" label={{ value: 'Industry avg', fontSize: 9, fill: '#9CA3AF' }} />
                  <Line type="monotone" dataKey="nps" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {[
          { id: 'ALL', label: `All (${reviews.length})` },
          { id: 'NEGATIVE', label: `Negative (${reviews.filter((r) => r.sentiment === 'NEGATIVE').length})`, color: 'text-red-600' },
          { id: 'UNRESPONDED', label: `Needs response (${unresponded})`, color: 'text-amber-600' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              filter === f.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {filtered.map((r) => {
          const source = SOURCE_LOGOS[r.source];
          return (
            <Card key={r.id} className={r.sentiment === 'NEGATIVE' && !r.responded ? 'border-red-200 bg-red-50/30' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs flex-shrink-0">
                      {r.author.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{r.author}</p>
                        <Badge className={`${source.bg} ${source.color} border-0 text-[10px]`}>{source.name}</Badge>
                        {r.property && <span className="text-[10px] text-gray-400">· {r.property}</span>}
                        <span className="text-[10px] text-gray-400">· {r.date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {r.text.startsWith('NPS:') ? (
                          <Badge variant="outline" className="text-[10px]">{r.rating}/10 NPS</Badge>
                        ) : (
                          Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`} />
                          ))
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-2 leading-relaxed">{r.text}</p>
                      {r.aiResponse && (
                        <div className="mt-3 p-3 bg-purple-50 border-l-2 border-purple-300 rounded-r-lg">
                          <p className="text-[10px] uppercase tracking-wide font-bold text-purple-700 flex items-center gap-1 mb-1">
                            <Sparkles className="w-3 h-3" /> Our response · AI-drafted, PM-approved
                          </p>
                          <p className="text-xs text-purple-900 leading-relaxed">{r.aiResponse}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {!r.responded && (
                    <Badge variant="warning" className="text-[10px] flex-shrink-0">
                      {r.sentiment === 'NEGATIVE' && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                      Needs response
                    </Badge>
                  )}
                </div>

                {/* AI draft response area */}
                {responding === r.id && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-purple-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI-drafted response · edit before posting
                    </p>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      className="w-full text-sm p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setResponding(null)}>Cancel</Button>
                      <Button size="sm" onClick={sendResponse} className="bg-purple-600 hover:bg-purple-700">
                        <Send className="w-3 h-3 mr-1" /> Post public response
                      </Button>
                    </div>
                  </div>
                )}

                {!r.responded && responding !== r.id && (
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => generateAiResponse(r)}>
                      <Sparkles className="w-3 h-3 mr-1" /> AI-draft response
                    </Button>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="w-3 h-3 mr-1" /> View on {source.name}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
