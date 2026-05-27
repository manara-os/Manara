'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Banknote, Building2, Users, Plus, X, CheckCircle2, Repeat, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  lease: any;
}

type Method = 'APPLE_PAY' | 'GOOGLE_PAY' | 'MADA' | 'CARD' | 'BANK_TRANSFER';

const METHODS: { id: Method; label: string; emoji: string; bg: string; fg: string; description: string }[] = [
  { id: 'APPLE_PAY',     label: 'Apple Pay',     emoji: '', bg: 'bg-gray-900',    fg: 'text-white',       description: 'Touch ID / Face ID' },
  { id: 'GOOGLE_PAY',    label: 'Google Pay',    emoji: 'G', bg: 'bg-blue-500',    fg: 'text-white',       description: 'One-tap mobile pay' },
  { id: 'MADA',          label: 'Mada',          emoji: '🇦🇪', bg: 'bg-emerald-600', fg: 'text-white',       description: 'GCC bank cards' },
  { id: 'CARD',          label: 'Card',          emoji: '💳', bg: 'bg-amber-100',   fg: 'text-amber-800',   description: 'Visa / MasterCard via Network International' },
  { id: 'BANK_TRANSFER', label: 'Bank transfer', emoji: '🏦', bg: 'bg-blue-100',    fg: 'text-blue-800',    description: 'UAE IBAN · 1-2 business days' },
];

export function OnlinePayment({ lease }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>('APPLE_PAY');
  const [autoRecurring, setAutoRecurring] = useState(true);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splits, setSplits] = useState<{ name: string; share: number; method: Method }[]>([
    { name: 'You',       share: 50, method: 'APPLE_PAY' },
    { name: 'Roommate',  share: 50, method: 'CARD' },
  ]);
  const [success, setSuccess] = useState(false);

  const amount = Math.round(Number(lease?.annualRent ?? 0) / 12);
  const totalShare = splits.reduce((s, x) => s + x.share, 0);

  const pay = async () => {
    if (splitEnabled && totalShare !== 100) {
      toast.error('Split must total 100%');
      return;
    }
    // Simulate processing
    await new Promise((r) => setTimeout(r, 1500));
    setSuccess(true);
    toast.success(`Payment of AED ${amount.toLocaleString()} successful — receipt sent to your email`);
  };

  const close = () => {
    setOpen(false);
    setSuccess(false);
    setSplitEnabled(false);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
      >
        <CreditCard className="w-3.5 h-3.5 mr-1.5" />
        Pay rent online
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Pay rent online
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Secured by Network International · PCI-DSS Level 1 · 256-bit TLS</p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {success ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">Payment successful</p>
                  <p className="text-sm text-gray-500 mt-1">AED {amount.toLocaleString()} · {METHODS.find((m) => m.id === method)?.label}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-left">
                  <p className="text-xs font-semibold text-emerald-800 uppercase">Receipt</p>
                  <p className="text-xs text-emerald-700 mt-1">Sent to your registered email · GL journal entry posted to Cash–Trust automatically.</p>
                </div>
                {autoRecurring && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                    <p className="text-xs font-semibold text-blue-800 uppercase">Auto-pay enabled</p>
                    <p className="text-xs text-blue-700 mt-1">Next payment of AED {amount.toLocaleString()} will be charged on the 1st of next month.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Amount */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-[10px] text-emerald-700 uppercase tracking-wide font-semibold">Monthly rent</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-1">AED {amount.toLocaleString()}</p>
                  <p className="text-xs text-emerald-700 mt-1">For {lease?.unit?.unitNumber ?? 'your unit'} at {lease?.unit?.property?.name ?? 'your property'}</p>
                </div>

                {/* Split toggle */}
                <button
                  onClick={() => setSplitEnabled(!splitEnabled)}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    splitEnabled ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className={`w-4 h-4 ${splitEnabled ? 'text-purple-700' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${splitEnabled ? 'text-purple-900' : 'text-gray-900'}`}>Split with roommates</span>
                  </div>
                  <Badge variant={splitEnabled ? 'default' : 'outline'} className="text-xs">{splitEnabled ? 'On' : 'Off'}</Badge>
                </button>

                {/* Split UI */}
                {splitEnabled && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                    {splits.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={s.name}
                          onChange={(e) => setSplits(splits.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                          className="h-9 text-sm flex-1"
                          placeholder="Roommate name"
                        />
                        <div className="relative">
                          <Input
                            type="number"
                            value={s.share}
                            onChange={(e) => setSplits(splits.map((x, j) => j === i ? { ...x, share: Number(e.target.value) } : x))}
                            className="h-9 text-sm w-20 pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                        </div>
                        <p className="text-xs font-medium text-gray-700 w-20 text-right">AED {Math.round((amount * s.share) / 100).toLocaleString()}</p>
                        {splits.length > 1 && (
                          <button onClick={() => setSplits(splits.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                      <button
                        onClick={() => setSplits([...splits, { name: '', share: 0, method: 'CARD' }])}
                        className="text-xs text-purple-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add another
                      </button>
                      <p className={`text-xs font-bold ${totalShare === 100 ? 'text-emerald-700' : 'text-red-600'}`}>
                        Total: {totalShare}% {totalShare === 100 ? '✓' : '— must equal 100%'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Method picker */}
                {!splitEnabled && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">Payment method</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {METHODS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMethod(m.id)}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left ${
                            method === m.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg ${m.bg} ${m.fg} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                            {m.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{m.label}</p>
                            <p className="text-[10px] text-gray-500 leading-tight">{m.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-recurring */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoRecurring} onChange={(e) => setAutoRecurring(e.target.checked)} className="accent-emerald-600" />
                  <Repeat className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-sm text-gray-700">Set up auto-pay for next 11 months</span>
                </label>

                <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-start gap-2 text-xs text-blue-800">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Payment is processed through Network International (UAE Central Bank-licensed). Your card details never touch our servers.</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              {success ? (
                <Button onClick={close} className="bg-emerald-600 hover:bg-emerald-700">Done</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={close}>Cancel</Button>
                  <Button onClick={pay} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    Pay AED {amount.toLocaleString()}
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
