'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gavel, Clock, CheckCircle2, Star, Sparkles, TrendingDown, Send, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { bidsApi } from '@/lib/api';

interface Bid {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  vendorJobsDone: number;
  amount: number;
  vatIncluded: boolean;
  etaHours: number;
  warrantyDays: number;
  message: string;
  submittedAt: Date;
  aiRecommended?: boolean;
  aiReason?: string;
}

interface Props {
  ticketId?: string;
  ticketRef: string;
  ticketTitle: string;
  category?: string;
  status: string;
  onAccept?: (bid: Bid) => void;
}

const seedBids = (category?: string): Bid[] => {
  const now = Date.now();
  return [
    {
      id: 'b1',
      vendorId: 'v1', vendorName: 'CoolBreeze HVAC LLC', vendorRating: 4.8, vendorJobsDone: 247,
      amount: 850, vatIncluded: true, etaHours: 4, warrantyDays: 90,
      message: 'We can be on-site within 4 hours. Includes diagnostic, compressor reset, gas top-up if needed. 90-day workmanship warranty.',
      submittedAt: new Date(now - 28 * 60_000),
      aiRecommended: true,
      aiReason: 'Best balance: 4.8★ rating, 90-day warranty (longest), and ETA 4h is fastest. Has handled 23 similar AC compressor jobs in this building.',
    },
    {
      id: 'b2',
      vendorId: 'v2', vendorName: 'PolarFix AC Services', vendorRating: 4.5, vendorJobsDone: 132,
      amount: 720, vatIncluded: true, etaHours: 8, warrantyDays: 30,
      message: 'Competitive quote — we handle multiple AC repairs daily. Standard 30-day warranty.',
      submittedAt: new Date(now - 45 * 60_000),
    },
    {
      id: 'b3',
      vendorId: 'v3', vendorName: 'Arctic Air Tech', vendorRating: 4.2, vendorJobsDone: 89,
      amount: 950, vatIncluded: false, etaHours: 6, warrantyDays: 60,
      message: 'Premium service with senior technician. Genuine parts only. VAT additional.',
      submittedAt: new Date(now - 12 * 60_000),
    },
    {
      id: 'b4',
      vendorId: 'v4', vendorName: 'QuickFix Maintenance', vendorRating: 3.9, vendorJobsDone: 412,
      amount: 600, vatIncluded: true, etaHours: 12, warrantyDays: 14,
      message: 'Lowest quote in the marketplace. Volume-based pricing.',
      submittedAt: new Date(now - 55 * 60_000),
    },
  ];
};

export function BidMarketplace({ ticketId, ticketRef, ticketTitle, category, status, onAccept }: Props) {
  const qc = useQueryClient();
  const [marketplaceOpen, setMarketplaceOpen] = useState(status === 'OPEN');
  const [accepted, setAccepted] = useState<string | null>(null);

  const { data: payload } = useQuery({
    queryKey: ['ticket-bids', ticketId],
    queryFn: () => bidsApi.forTicket(ticketId!) as Promise<{ bids: any[]; kpis: any }>,
    enabled: !!ticketId,
  });

  const bids: Bid[] = (payload?.bids?.length ? payload.bids : seedBids(category)).map((b: any) => ({
    id: b.id,
    vendorId: b.vendorId ?? b.vendor?.id,
    vendorName: b.vendorName ?? b.vendor?.companyName,
    vendorRating: Number(b.vendorRating ?? b.vendor?.rating ?? 0),
    vendorJobsDone: b.vendorJobsDone ?? b.vendor?.totalJobsCompleted ?? 0,
    amount: Number(b.amount ?? b.amountAed ?? 0),
    vatIncluded: b.vatIncluded ?? true,
    etaHours: b.etaHours,
    warrantyDays: b.warrantyDays ?? 30,
    message: b.message ?? '',
    submittedAt: new Date(b.submittedAt ?? Date.now()),
    aiRecommended: b.aiRecommended,
    aiReason: b.aiReason,
  }));

  const acceptMutation = useMutation({
    mutationFn: (bidId: string) => bidsApi.accept(bidId),
    onSuccess: (_, bidId) => {
      qc.invalidateQueries({ queryKey: ['ticket-bids', ticketId] });
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setAccepted(bidId);
      const b = bids.find((x) => x.id === bidId);
      if (b) {
        toast.success(`${b.vendorName} accepted · ETA ${b.etaHours}h · WhatsApp confirmation sent`);
        onAccept?.(b);
      }
    },
    onError: () => toast.error('Failed to accept bid'),
  });

  const lowest = bids.length ? Math.min(...bids.map((b) => b.amount)) : 0;
  const avg = bids.length ? bids.reduce((s, b) => s + b.amount, 0) / bids.length : 0;
  const savings = Math.round(avg - lowest);

  const acceptBid = (b: Bid) => {
    if (ticketId) acceptMutation.mutate(b.id);
    else {
      setAccepted(b.id);
      toast.success(`${b.vendorName} accepted · ETA ${b.etaHours}h · WhatsApp confirmation sent`);
      onAccept?.(b);
    }
  };

  const closeMarketplace = () => {
    setMarketplaceOpen(false);
    toast.success('Bidding closed · no more bids accepted');
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/30 to-orange-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-amber-600" />
            Vendor bid marketplace
            <Badge variant={marketplaceOpen ? 'success' : 'secondary'} className="text-[10px]">
              {marketplaceOpen ? 'Open · accepting bids' : 'Closed'}
            </Badge>
          </span>
          {marketplaceOpen && !accepted && (
            <Button size="sm" variant="outline" onClick={closeMarketplace} className="h-7 text-xs">
              Close bidding
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Marketplace stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-lg p-2.5 border border-amber-100">
            <p className="text-[9px] uppercase tracking-wide text-amber-700 font-bold">Bids received</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{bids.length}</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-amber-100">
            <p className="text-[9px] uppercase tracking-wide text-emerald-700 font-bold">Lowest bid</p>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">AED {lowest}</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-amber-100">
            <p className="text-[9px] uppercase tracking-wide text-gray-600 font-bold">Average bid</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">AED {avg.toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-amber-100">
            <p className="text-[9px] uppercase tracking-wide text-violet-700 font-bold">Savings vs avg</p>
            <p className="text-sm font-bold text-violet-700 mt-0.5 flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> AED {savings}
            </p>
          </div>
        </div>

        {/* Bids list */}
        <div className="space-y-2">
          {bids
            .sort((a, b) => (a.aiRecommended ? -1 : b.aiRecommended ? 1 : 0))
            .map((b) => (
              <div
                key={b.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  accepted === b.id
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : b.aiRecommended
                    ? 'border-amber-400 bg-white shadow-sm'
                    : 'border-gray-100 bg-white'
                }`}
              >
                {/* AI recommendation banner */}
                {b.aiRecommended && (
                  <div className="flex items-start gap-1.5 mb-2 p-2 bg-gradient-to-r from-amber-100/60 to-orange-100/40 rounded-md">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-bold text-amber-700">AI Recommended</p>
                      <p className="text-[11px] text-amber-900 leading-tight mt-0.5">{b.aiReason}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs flex-shrink-0">
                      {b.vendorName.split(' ').map((s) => s[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{b.vendorName}</p>
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-600">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />{b.vendorRating} · {b.vendorJobsDone} jobs
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{b.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />ETA {b.etaHours}h</span>
                        <span>· {b.warrantyDays}-day warranty</span>
                        <span>· {b.vatIncluded ? 'VAT incl.' : 'VAT extra'}</span>
                        <span>· Submitted {Math.round((Date.now() - b.submittedAt.getTime()) / 60_000)}m ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">AED {b.amount.toLocaleString('en-AE')}</p>
                    {b.amount === lowest && (
                      <Badge variant="success" className="text-[9px] mt-0.5">Lowest</Badge>
                    )}
                  </div>
                </div>

                {accepted !== b.id && marketplaceOpen && (
                  <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      <Send className="w-3 h-3 mr-1" /> Counter-offer
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => acceptBid(b)}
                      className={b.aiRecommended ? 'bg-amber-600 hover:bg-amber-700' : ''}
                    >
                      Accept & assign <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}

                {accepted === b.id && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-200 text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Accepted · {b.vendorName} en route · ETA {b.etaHours}h · WhatsApp confirmation sent to tenant
                  </div>
                )}
              </div>
            ))}
        </div>

        <p className="text-[10px] text-gray-400 leading-tight">
          Ticket {ticketRef} · Vendors with matching service category in the coverage area are auto-invited to bid · AI ranks bids on price, rating, ETA, warranty, and prior performance on similar jobs.
        </p>
      </CardContent>
    </Card>
  );
}
