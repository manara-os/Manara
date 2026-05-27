'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, CheckCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { whatsappApi } from '@/lib/api';

interface Msg {
  id: string;
  from: 'TENANT' | 'OWNER' | 'VENDOR' | 'PM' | 'AI';
  body: string;
  ts: Date;
  delivered?: boolean;
  read?: boolean;
}

interface Props {
  recipientType: 'tenant' | 'owner' | 'vendor';
  recipientId?: string;
  recipientName: string;
  recipientPhone?: string;
}

// Seed mock conversation per recipient type
function seedMessages(type: string, name: string): Msg[] {
  const now = Date.now();
  if (type === 'tenant') {
    return [
      { id: 'm1', from: 'PM',     body: `Hi ${name}, just confirming your cheque dated 1 Jun. Let me know if anything changes.`, ts: new Date(now - 3 * 86_400_000), delivered: true, read: true },
      { id: 'm2', from: 'TENANT', body: `Yes confirmed thanks 👍`, ts: new Date(now - 3 * 86_400_000 + 25 * 60_000), delivered: true, read: true },
      { id: 'm3', from: 'TENANT', body: `Actually the AC in master bedroom is making a weird noise. Can someone take a look?`, ts: new Date(now - 2 * 86_400_000), delivered: true, read: true },
      { id: 'm4', from: 'AI',     body: `I've raised ticket TKT-2026-0089 for AC repair · HIGH priority. CoolBreeze HVAC has been assigned and will arrive between 14:00 and 16:00 today. You'll get a WhatsApp confirmation 30 minutes before.`, ts: new Date(now - 2 * 86_400_000 + 2 * 60_000), delivered: true, read: true },
      { id: 'm5', from: 'TENANT', body: `Perfect, thanks!`, ts: new Date(now - 2 * 86_400_000 + 5 * 60_000), delivered: true, read: true },
      { id: 'm6', from: 'PM',     body: `Quick note: your lease expires in 14 days. Are you renewing?`, ts: new Date(now - 60 * 60_000), delivered: true, read: false },
    ];
  }
  if (type === 'owner') {
    return [
      { id: 'm1', from: 'PM',     body: `Hi ${name}, sending you May SOA. Net payout AED 8,420 — credited tomorrow.`, ts: new Date(now - 5 * 86_400_000), delivered: true, read: true },
      { id: 'm2', from: 'OWNER',  body: `Received, thank you. One question — JVC-V1 unit, what's the renewal status?`, ts: new Date(now - 5 * 86_400_000 + 30 * 60_000), delivered: true, read: true },
      { id: 'm3', from: 'AI',     body: `Tenant James Okafor's lease expires in 14 days. Based on RERA Smart Rent Index, current rent is 4% below market — proposed renewal at +5% (within legal cap) = AED 141,750/yr. PM is preparing renewal contract.`, ts: new Date(now - 5 * 86_400_000 + 35 * 60_000), delivered: true, read: true },
      { id: 'm4', from: 'OWNER',  body: `Great, please proceed.`, ts: new Date(now - 5 * 86_400_000 + 60 * 60_000), delivered: true, read: true },
    ];
  }
  return [
    { id: 'm1', from: 'PM',     body: `Hi ${name}, new ticket: AC unit DP-1202 master bedroom. Tenant available 14:00-16:00 today.`, ts: new Date(now - 4 * 60 * 60_000), delivered: true, read: true },
    { id: 'm2', from: 'VENDOR', body: `Confirmed, on my way by 14:30.`, ts: new Date(now - 3 * 60 * 60_000), delivered: true, read: true },
    { id: 'm3', from: 'VENDOR', body: `Work completed. Photos uploaded. Invoice AED 850.`, ts: new Date(now - 30 * 60_000), delivered: true, read: false },
  ];
}

export function WhatsAppThread({ recipientType, recipientId, recipientName, recipientPhone }: Props) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: apiMessages } = useQuery({
    queryKey: ['whatsapp-thread', recipientType, recipientId],
    queryFn: () => whatsappApi.thread(recipientType, recipientId!) as Promise<any[]>,
    enabled: !!recipientId,
    refetchInterval: 15_000, // poll for new inbound messages every 15s
  });

  useEffect(() => {
    if (apiMessages && apiMessages.length > 0) {
      setMessages(
        apiMessages.map((m: any) => ({
          id: m.id,
          from: m.sender,
          body: m.body,
          ts: new Date(m.sentAt ?? m.createdAt),
          delivered: m.deliveryStatus !== 'QUEUED' && m.deliveryStatus !== 'FAILED',
          read: m.deliveryStatus === 'READ',
        })),
      );
    } else if (!recipientId) {
      // No API → fall back to demo seed
      setMessages(seedMessages(recipientType, recipientName));
    }
  }, [apiMessages, recipientType, recipientName, recipientId]);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      whatsappApi.send({
        recipientType,
        recipientId,
        recipientPhone,
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-thread', recipientType, recipientId] }),
  });

  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, collapsed]);

  const send = () => {
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft('');
    if (recipientId && recipientPhone) {
      sendMutation.mutate(body, {
        onSuccess: () => toast.success(`WhatsApp sent to ${recipientName}`),
        onError: () => toast.error('Failed to send WhatsApp'),
      });
      return;
    }
    // No API context → local-only mode
    const newMsg: Msg = {
      id: `m${Date.now()}`,
      from: 'PM',
      body,
      ts: new Date(),
      delivered: true,
      read: false,
    };
    setMessages([...messages, newMsg]);
    toast.success(`WhatsApp sent to ${recipientName}`);

    // Simulate an AI auto-reply suggestion after a moment
    setTimeout(() => {
      if (Math.random() > 0.5) {
        const aiSuggestion: Msg = {
          id: `m${Date.now() + 1}`,
          from: 'AI',
          body: 'AI suggestion: would you like to also schedule a follow-up call in 2 days to confirm receipt?',
          ts: new Date(),
          delivered: true,
          read: false,
        };
        setMessages((m) => [...m, aiSuggestion]);
      }
    }, 1500);
  };

  const unread = messages.filter((m) => !m.read && (m.from === 'TENANT' || m.from === 'OWNER' || m.from === 'VENDOR')).length;

  const bubbleStyle = (from: string) => {
    if (from === 'PM')     return 'bg-emerald-100 text-emerald-900 ml-auto';
    if (from === 'AI')     return 'bg-purple-100 text-purple-900 mx-auto border border-purple-200';
    return 'bg-white border border-gray-200 text-gray-900';
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors pb-3"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            WhatsApp conversation
            {unread > 0 && <Badge variant="default" className="bg-emerald-600 text-white text-[10px] h-5">{unread} new</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {recipientPhone && <span className="text-xs text-gray-500">{recipientPhone}</span>}
            <Badge variant="outline" className="text-[10px]">
              {messages.length} messages
            </Badge>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-2">
          {/* Messages */}
          <div ref={scrollRef} className="bg-gradient-to-br from-emerald-50/30 to-teal-50/30 rounded-lg p-3 max-h-96 overflow-y-auto space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'PM' ? 'justify-end' : m.from === 'AI' ? 'justify-center' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${bubbleStyle(m.from)}`}>
                  {m.from === 'AI' && (
                    <p className="text-[10px] uppercase tracking-wide font-bold text-purple-700 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI agent
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] opacity-60">
                      {m.ts.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })} · {m.ts.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                    </span>
                    {m.from === 'PM' && m.delivered && <CheckCheck className={`w-3.5 h-3.5 ${m.read ? 'text-blue-500' : 'text-gray-400'}`} />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compose */}
          <div className="flex items-center gap-2 pt-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a WhatsApp message…"
              className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button onClick={send} disabled={!draft.trim()} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">
            Powered by Twilio WhatsApp Business · automated replies are AI-generated · every outbound message is logged in the audit log.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
