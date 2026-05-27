'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, FileText, Image as ImageIcon, Download, Eye, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

interface VaultEntry {
  id: string;
  date: Date;
  unit: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'AC_HVAC' | 'PAINTING' | 'CLEANING' | 'GENERAL';
  description: string;
  vendor: string;
  amount: number;
  vatAmount: number;
  invoiceNo: string;
  beforePhoto?: string;
  afterPhoto?: string;
  approvedBy: string;
  status: 'APPROVED' | 'PENDING_OWNER' | 'PAID';
}

interface Props {
  ownerName: string;
}

const seedEntries = (): VaultEntry[] => {
  const now = Date.now();
  return [
    {
      id: 'v1',
      date: new Date(now - 3 * 86_400_000),
      unit: 'DP-1202',
      category: 'AC_HVAC',
      description: 'Master bedroom AC compressor replacement + gas refill',
      vendor: 'CoolBreeze HVAC LLC',
      amount: 850,
      vatAmount: 42.5,
      invoiceNo: 'CB-2026-0489',
      beforePhoto: 'noisy-ac-unit.jpg',
      afterPhoto: 'repaired-ac-unit.jpg',
      approvedBy: 'Sarah Mitchell (PM)',
      status: 'PAID',
    },
    {
      id: 'v2',
      date: new Date(now - 12 * 86_400_000),
      unit: 'JVC-V1',
      category: 'PLUMBING',
      description: 'Kitchen sink leak repair + flexi-hose replacement',
      vendor: 'AquaFix Plumbers',
      amount: 320,
      vatAmount: 16,
      invoiceNo: 'AQ-2026-1124',
      beforePhoto: 'leaking-sink.jpg',
      afterPhoto: 'fixed-sink.jpg',
      approvedBy: 'Sarah Mitchell (PM)',
      status: 'PAID',
    },
    {
      id: 'v3',
      date: new Date(now - 5 * 86_400_000),
      unit: 'DP-1202',
      category: 'CLEANING',
      description: 'Deep clean post-tenant-exit (3BR + balcony + AC vents)',
      vendor: 'Sparkle Pro Cleaning',
      amount: 480,
      vatAmount: 24,
      invoiceNo: 'SPC-2026-0567',
      beforePhoto: 'dirty-apartment.jpg',
      afterPhoto: 'cleaned-apartment.jpg',
      approvedBy: 'Sarah Mitchell (PM)',
      status: 'PAID',
    },
    {
      id: 'v4',
      date: new Date(now - 1 * 86_400_000),
      unit: 'JVC-V1',
      category: 'PAINTING',
      description: 'Living room wall touch-up + scuff repair (180 sqft)',
      vendor: 'Premium Paints DXB',
      amount: 650,
      vatAmount: 32.5,
      invoiceNo: 'PP-2026-0892',
      beforePhoto: 'scuffed-wall.jpg',
      afterPhoto: 'painted-wall.jpg',
      approvedBy: 'Sarah Mitchell (PM)',
      status: 'PENDING_OWNER',
    },
    {
      id: 'v5',
      date: new Date(now - 28 * 86_400_000),
      unit: 'DP-1202',
      category: 'ELECTRICAL',
      description: 'Replace 6 LED downlights in living room ceiling',
      vendor: 'BrightSpark Electric',
      amount: 240,
      vatAmount: 12,
      invoiceNo: 'BS-2026-0334',
      beforePhoto: 'broken-lights.jpg',
      afterPhoto: 'new-lights.jpg',
      approvedBy: 'Sarah Mitchell (PM)',
      status: 'PAID',
    },
  ];
};

const CATEGORY_EMOJI: Record<string, string> = {
  PLUMBING: '🔧',
  ELECTRICAL: '⚡',
  AC_HVAC: '❄️',
  PAINTING: '🎨',
  CLEANING: '🧹',
  GENERAL: '🛠',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary'> = {
  PAID: 'success',
  PENDING_OWNER: 'warning',
  APPROVED: 'secondary',
};

export function ReceiptVault({ ownerName }: Props) {
  const [entries] = useState<VaultEntry[]>(seedEntries());
  const [selected, setSelected] = useState<VaultEntry | null>(null);

  const total = entries.reduce((s, e) => s + e.amount + e.vatAmount, 0);
  const ytdInvoices = entries.length;
  const ytdSavings = 1240; // mock: claimed back via warranty / vendor credits

  const approveCharge = (id: string) => {
    toast.success('Charge approved — will deduct from next payout');
    setSelected(null);
  };

  return (
    <Card className="border-blue-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            Receipt vault
            <Badge variant="outline" className="text-[10px] ml-1">FTA tax-ready</Badge>
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <Download className="w-3 h-3 mr-1.5" /> Export all (ZIP)
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] text-blue-600 uppercase tracking-wide font-semibold">Total spend YTD</p>
            <p className="text-lg font-bold text-blue-900 mt-0.5">
              AED {total.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-blue-600 mt-0.5">incl. AED {entries.reduce((s, e) => s + e.vatAmount, 0).toFixed(2)} VAT</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wide font-semibold">Invoices</p>
            <p className="text-lg font-bold text-emerald-900 mt-0.5">{ytdInvoices}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">all with before/after photos</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <p className="text-[10px] text-purple-600 uppercase tracking-wide font-semibold">Saved via warranty</p>
            <p className="text-lg font-bold text-purple-900 mt-0.5">AED {ytdSavings}</p>
            <p className="text-[10px] text-purple-600 mt-0.5">vendor credits + reworks</p>
          </div>
        </div>

        {/* Entries list */}
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              onClick={() => setSelected(e)}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 cursor-pointer transition-all"
            >
              <div className="text-xl">{CATEGORY_EMOJI[e.category]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.description}</p>
                  <Badge variant={STATUS_VARIANTS[e.status]} className="text-[9px] h-4">
                    {e.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {e.vendor} · Unit {e.unit} · {e.date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })} · Inv {e.invoiceNo}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">AED {(e.amount + e.vatAmount).toLocaleString('en-AE')}</p>
                <div className="flex items-center gap-1 justify-end text-[10px] text-gray-400">
                  {e.beforePhoto && <ImageIcon className="w-3 h-3" />}
                  {e.afterPhoto && <ImageIcon className="w-3 h-3" />}
                  <FileText className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 text-center pt-1">
          Every charge in your statement has a vendor invoice + before/after photos attached · transparent & FTA-compliant.
        </p>
      </CardContent>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <p className="text-xs text-gray-500">Receipt detail · Inv {selected.invoiceNo}</p>
                <h3 className="text-lg font-semibold text-gray-900">{selected.description}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Before / After photos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-red-600 font-bold mb-1.5">Before</p>
                  <div className="aspect-video bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border-2 border-dashed border-red-200 flex flex-col items-center justify-center text-red-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <p className="text-[10px]">{selected.beforePhoto}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-bold mb-1.5">After</p>
                  <div className="aspect-video bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center text-emerald-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <p className="text-[10px]">{selected.afterPhoto}</p>
                  </div>
                </div>
              </div>

              {/* Invoice details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span className="font-medium">{selected.vendor}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Unit</span><span className="font-medium">{selected.unit}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{selected.date.toLocaleDateString('en-AE', { dateStyle: 'medium' })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Invoice number</span><span className="font-medium font-mono text-xs">{selected.invoiceNo}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Approved by</span><span className="font-medium">{selected.approvedBy}</span></div>
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Subtotal</span><span>AED {selected.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">VAT (5%)</span><span>AED {selected.vatAmount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>AED {(selected.amount + selected.vatAmount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> PDF invoice
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Full photo gallery
                </Button>
                {selected.status === 'PENDING_OWNER' && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={() => approveCharge(selected.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve charge
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
