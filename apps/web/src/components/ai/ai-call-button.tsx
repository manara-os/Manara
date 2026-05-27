'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Phone, X, Bot, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type RecipientType = 'tenant' | 'owner' | 'vendor';

interface Purpose {
  id: string;
  label: string;
  emoji: string;
  description: string;
  applicableTo: RecipientType[];
}

const PURPOSES: Purpose[] = [
  { id: 'rent_reminder',         label: 'Rent reminder',           emoji: '💸', description: 'Friendly nudge before due date',                                       applicableTo: ['tenant'] },
  { id: 'rent_overdue',          label: 'Overdue rent collection', emoji: '⚠️', description: 'Polite collection call for past-due rent',                              applicableTo: ['tenant'] },
  { id: 'lease_renewal',         label: 'Lease renewal',           emoji: '🔁', description: 'Discuss renewal with optional rent adjustment within RERA cap',         applicableTo: ['tenant'] },
  { id: 'move_in_welcome',       label: 'Move-in welcome',         emoji: '🔑', description: 'Welcome new tenant + confirm handover details',                         applicableTo: ['tenant'] },
  { id: 'move_out_settlement',   label: 'Move-out settlement',     emoji: '📦', description: 'Walk through deposit deductions, refund timeline',                      applicableTo: ['tenant'] },
  { id: 'maintenance_followup',  label: 'Maintenance follow-up',   emoji: '🔧', description: 'Verify ticket resolution + capture satisfaction rating',                applicableTo: ['tenant', 'vendor'] },
  { id: 'pma_renewal',           label: 'PMA renewal',             emoji: '📋', description: 'Discuss PMA renewal + management fee review',                           applicableTo: ['owner'] },
  { id: 'vendor_assignment',     label: 'Vendor assignment',       emoji: '🔨', description: 'Brief vendor on new ticket: scope, SLA, tenant availability',           applicableTo: ['vendor'] },
  { id: 'general',               label: 'General check-in',        emoji: '☎️', description: 'Free-form AI call with custom context',                                  applicableTo: ['tenant', 'owner', 'vendor'] },
];

const SENTIMENT_STYLE: Record<string, { bg: string; fg: string; emoji: string }> = {
  POSITIVE: { bg: 'bg-emerald-100', fg: 'text-emerald-700', emoji: '🙂' },
  NEUTRAL:  { bg: 'bg-gray-100',    fg: 'text-gray-700',    emoji: '😐' },
  NEGATIVE: { bg: 'bg-red-100',     fg: 'text-red-700',     emoji: '🙁' },
};

interface Props {
  recipientType: RecipientType;
  recipientId: string;
  recipientName?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'default';
}

export function AICallButton({ recipientType, recipientId, recipientName, variant = 'outline', size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<string>('general');
  const [contextNote, setContextNote] = useState('');
  const [result, setResult] = useState<any>(null);

  const applicable = PURPOSES.filter((p) => p.applicableTo.includes(recipientType));

  const initiate = useMutation({
    mutationFn: (payload: any) => api.post('/ai/call', payload),
    onSuccess: (res: any) => {
      const r = res.data ?? res;
      setResult(r);
      toast.success(`AI call to ${recipientName ?? r.recipient?.name ?? 'recipient'} ${r.outcome === 'ANSWERED' ? 'completed' : r.outcome}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Call failed'),
  });

  const submit = () => {
    initiate.mutate({
      recipientType,
      recipientId,
      purpose,
      ...(purpose === 'general' && contextNote ? { contextNote } : {}),
    });
  };

  const reset = () => { setResult(null); setPurpose('general'); setContextNote(''); };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        className={variant === 'outline' ? 'border-purple-200 text-purple-700 hover:bg-purple-50' : ''}
      >
        <Bot className="w-3.5 h-3.5 mr-1" />
        AI Call
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setOpen(false); reset(); }}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  AI Call {recipientName && <span className="text-gray-500 font-normal">to {recipientName}</span>}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">UAE-compliant AI voice agent. Recipient is informed at call start that the voice is AI-generated.</p>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {!result && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">Call purpose</label>
                  <div className="space-y-1.5">
                    {applicable.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPurpose(p.id)}
                        className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg border-2 transition-colors ${
                          purpose === p.id ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${purpose === p.id ? 'text-purple-900' : 'text-gray-900'}`}>{p.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {purpose === 'general' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">Context for the AI</label>
                    <textarea
                      value={contextNote}
                      onChange={(e) => setContextNote(e.target.value)}
                      placeholder="What should the AI know before placing this call?"
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-800 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>UAE TRA disclosure: this call uses AI-generated voice. The recipient is informed at the start. Transcript and action items are stored in the audit log.</span>
                </div>
              </div>
            )}

            {result && (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <p className="font-semibold text-gray-900">Call completed</p>
                    <Badge variant="outline" className="text-xs">{result.outcome}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor((result.duration ?? 0) / 60)}m {(result.duration ?? 0) % 60}s
                  </div>
                </div>

                {result.sentiment && (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${SENTIMENT_STYLE[result.sentiment]?.bg} ${SENTIMENT_STYLE[result.sentiment]?.fg}`}>
                    {SENTIMENT_STYLE[result.sentiment]?.emoji} Sentiment: {result.sentiment}
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Transcript</p>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-72 overflow-y-auto">
                    {result.transcript.split('\n').map((line: string, i: number) => {
                      const isAI = line.startsWith('AI:');
                      const isOther = line.includes(':') && !isAI;
                      return (
                        <p
                          key={i}
                          className={`text-sm leading-relaxed mb-1.5 ${
                            isAI ? 'text-purple-700' : isOther ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {result.actionItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Action items extracted</p>
                    <ul className="space-y-1">
                      {result.actionItems.map((a: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-emerald-600 mt-0.5">✓</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              {result ? (
                <>
                  <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Done</Button>
                  <Button onClick={reset} className="bg-purple-600 hover:bg-purple-700">New call</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={submit}
                    disabled={initiate.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {initiate.isPending ? (
                      <>Calling…</>
                    ) : (
                      <><Phone className="w-3.5 h-3.5 mr-1.5" /> Place AI call</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
