'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageSquare, Mail, X, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Channel = 'WHATSAPP' | 'EMAIL' | 'SMS';
type RecipientType = 'tenant' | 'owner' | 'vendor';

interface Template {
  id: string;
  label: string;
  description: string;
  applicableTo: RecipientType[];
}

const TEMPLATES: Template[] = [
  { id: 'rent-reminder',         label: '💸  Rent reminder',         description: 'Friendly nudge before due date',                applicableTo: ['tenant'] },
  { id: 'rent-overdue',          label: '⚠️  Overdue rent escalation', description: 'For tenants whose rent is past due',           applicableTo: ['tenant'] },
  { id: 'lease-renewal',         label: '📄  Lease renewal',          description: 'Start renewal conversation',                    applicableTo: ['tenant'] },
  { id: 'move-in-confirmation',  label: '🔑  Move-in confirmation',   description: 'Welcome + handover details',                    applicableTo: ['tenant'] },
  { id: 'pma-renewal',           label: '📋  PMA renewal',            description: 'PMA expiry notice to owner',                    applicableTo: ['owner'] },
  { id: 'ticket-update',         label: '🔧  Ticket update',          description: 'Maintenance status update to vendor or tenant', applicableTo: ['tenant', 'vendor'] },
  { id: 'custom',                label: '✍️  Custom message',         description: 'Free-form text',                                applicableTo: ['tenant', 'owner', 'vendor'] },
];

interface Props {
  recipientType: RecipientType;
  recipientId: string;
  recipientName?: string;
  defaultChannel?: Channel;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  label?: string;
}

export function SendMessageButton({
  recipientType,
  recipientId,
  recipientName,
  defaultChannel = 'WHATSAPP',
  size = 'sm',
  variant = 'outline',
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [templateId, setTemplateId] = useState<string>('custom');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const applicableTemplates = TEMPLATES.filter((t) => t.applicableTo.includes(recipientType));

  const send = useMutation({
    mutationFn: (payload: any) => api.post('/communications/send', payload),
    onSuccess: (res: any) => {
      const r = res.data ?? res;
      toast.success(`${channel} sent to ${recipientName ?? r.recipient ?? 'recipient'}`);
      setOpen(false);
      setMessage('');
      setSubject('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Send failed');
    },
  });

  const submit = () => {
    if (templateId === 'custom' && !message.trim()) {
      toast.error('Add a message');
      return;
    }
    send.mutate({
      channel,
      recipient: { type: recipientType, id: recipientId },
      template: templateId === 'custom' ? undefined : templateId,
      subject: channel === 'EMAIL' ? (subject || undefined) : undefined,
      message: message || '(template-rendered)',
    });
  };

  const Icon = channel === 'EMAIL' ? Mail : MessageSquare;
  const buttonLabel = label ?? (defaultChannel === 'EMAIL' ? 'Email' : 'Message');

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        className={
          variant === 'outline'
            ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            : ''
        }
      >
        <Icon className="w-3.5 h-3.5 mr-1" />
        {buttonLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl w-full max-w-lg"
          >
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Send message {recipientName && <span className="text-gray-500 font-normal">to {recipientName}</span>}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Every outbound message is logged in the audit log.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Channel picker */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">Channel</label>
                <div className="flex gap-2">
                  {(['WHATSAPP', 'EMAIL', 'SMS'] as Channel[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setChannel(c)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                        channel === c
                          ? c === 'WHATSAPP'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : c === 'EMAIL'
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {c === 'WHATSAPP' && '💬 '}
                      {c === 'EMAIL' && '✉️ '}
                      {c === 'SMS' && '📱 '}
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template picker */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Template
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {applicableTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                {applicableTemplates.find((t) => t.id === templateId) && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {applicableTemplates.find((t) => t.id === templateId)?.description}
                  </p>
                )}
              </div>

              {/* Subject (email only) */}
              {channel === 'EMAIL' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">
                    Subject {templateId !== 'custom' && <span className="text-gray-400 font-normal normal-case">(auto from template)</span>}
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={templateId !== 'custom' ? 'Override template subject (optional)' : 'Subject line'}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">
                  {templateId === 'custom' ? 'Message' : 'Additional note'}
                  {templateId !== 'custom' && <span className="text-gray-400 font-normal normal-case"> (optional)</span>}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={templateId === 'custom'
                    ? 'Type your message…'
                    : 'Template will be auto-rendered. Add an optional personal note here.'
                  }
                  rows={5}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="text-[10px] text-gray-500 bg-blue-50 border border-blue-100 rounded p-2">
                💡  Dev mode: messages are logged to the Notification table and console — Twilio/Resend wiring kicks in via env vars in production.
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={submit}
                disabled={send.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {send.isPending ? 'Sending…' : <><Send className="w-3.5 h-3.5 mr-1.5" /> Send</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
