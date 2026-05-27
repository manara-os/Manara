'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, AlertTriangle, X, Sparkles, FileText, Briefcase, CreditCard, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface Props { tenantId: string; tenantName?: string; }

export function TenantScreeningButton({ tenantId, tenantName }: Props) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setRunning(true);
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1800));
    // Deterministic mock score based on tenantId so demo is consistent
    const seed = tenantId.charCodeAt(0) + tenantId.charCodeAt(5);
    const creditScore = 580 + (seed % 280); // 580-860 range
    const incomeMultiplier = 2.5 + (seed % 50) / 25; // 2.5x - 4.5x
    const overallScore = Math.min(10, Math.round((creditScore / 100) + (incomeMultiplier > 3 ? 2 : 1)));
    setResult({
      overallScore,
      tier: overallScore >= 8 ? 'EXCELLENT' : overallScore >= 6 ? 'GOOD' : overallScore >= 4 ? 'CAUTION' : 'HIGH_RISK',
      checks: {
        aecbCredit: {
          score: creditScore,
          band: creditScore >= 700 ? 'EXCELLENT' : creditScore >= 650 ? 'GOOD' : creditScore >= 600 ? 'FAIR' : 'POOR',
          openLoans: seed % 3,
          delinquencies: creditScore < 640 ? 1 : 0,
        },
        wpsSalary: {
          verified: true,
          monthlySalary: 18000 + (seed * 250),
          employer: 'Acme Corp DMCC',
          months: 24 + (seed % 36),
          rentToIncome: Math.round(35 / incomeMultiplier),
        },
        emiratesId: { valid: true, status: 'ACTIVE', expiresIn: 540 + (seed % 365) },
        amlSanctions: { flagged: false, lists: ['UN', 'OFAC', 'UAE FIU'], lastChecked: new Date() },
        priorEvictions: { count: 0, source: 'UAE Tenancy Records' },
        residencyVisa: { valid: true, sponsor: 'Acme Corp DMCC', expiresIn: 380 },
      },
      flags: overallScore < 6 ? ['Income-to-rent ratio is tight — consider larger deposit'] : [],
      recommendation:
        overallScore >= 8 ? 'APPROVE — strong financials, clean records.'
        : overallScore >= 6 ? 'APPROVE — meets minimum thresholds.'
        : overallScore >= 4 ? 'REVIEW — request additional documentation.'
        : 'DECLINE — multiple risk indicators.',
      runAt: new Date(),
    });
    setRunning(false);
  };

  const reset = () => { setResult(null); setRunning(false); };
  const close = () => { setOpen(false); reset(); };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-purple-200 text-purple-700 hover:bg-purple-50"
      >
        <Sparkles className="w-3.5 h-3.5 mr-1" />
        AI Screening
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  AI Tenant Screening
                  {tenantName && <span className="text-gray-500 font-normal">· {tenantName}</span>}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">UAE-specific: AECB credit · WPS salary · EID · AML · UAE tenancy records.</p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {!result && !running && (
              <div className="p-5 space-y-3">
                <p className="text-sm text-gray-700">Run a comprehensive UAE-specific tenant screening in under 30 seconds. This pulls from:</p>
                <ul className="space-y-1.5 text-sm">
                  {[
                    ['💳', 'AECB credit bureau — score, open loans, delinquencies'],
                    ['💼', 'WPS — salary verification, employer, length of service'],
                    ['🪪', 'Federal Authority — Emirates ID validity, expiry'],
                    ['🛡️', 'AML/Sanctions — UN, OFAC, UAE FIU watchlists'],
                    ['📜', 'UAE Tenancy records — prior eviction history'],
                    ['🛂', 'Residency visa — sponsor, validity'],
                  ].map(([emoji, txt]) => (
                    <li key={txt} className="flex items-start gap-2 text-gray-700">
                      <span>{emoji}</span> {txt}
                    </li>
                  ))}
                </ul>
                <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-800">
                  💡 Cost: AED 50 per screening (billed monthly to your workspace).
                </div>
              </div>
            )}

            {running && (
              <div className="p-12 text-center space-y-3">
                <div className="inline-block w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-900 mt-2">Running AI tenant screening…</p>
                <p className="text-xs text-gray-500">Querying AECB, WPS, Federal Authority, AML lists…</p>
              </div>
            )}

            {result && (
              <div className="p-5 space-y-4">
                {/* Overall score */}
                <div
                  className={`rounded-xl p-5 ${
                    result.tier === 'EXCELLENT' ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200' :
                    result.tier === 'GOOD' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200' :
                    result.tier === 'CAUTION' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200' :
                    'bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Overall risk score</p>
                      <p className="text-4xl font-bold text-gray-900 mt-1">{result.overallScore} / 10</p>
                      <p className="text-sm font-semibold mt-1">{result.tier.replace('_', ' ')}</p>
                    </div>
                    {result.tier === 'EXCELLENT' ? <ShieldCheck className="w-14 h-14 text-emerald-600" /> :
                     result.tier === 'GOOD' ? <ShieldCheck className="w-14 h-14 text-blue-600" /> :
                     result.tier === 'CAUTION' ? <ShieldAlert className="w-14 h-14 text-amber-600" /> :
                     <ShieldX className="w-14 h-14 text-red-600" />}
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-3">Recommendation: <span className="font-bold">{result.recommendation}</span></p>
                </div>

                {/* Check breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <CheckCard icon={CreditCard} title="AECB Credit Bureau" status={result.checks.aecbCredit.band === 'POOR' ? 'WARN' : 'OK'}>
                    <p>Score: <b>{result.checks.aecbCredit.score}</b> ({result.checks.aecbCredit.band})</p>
                    <p>Open loans: {result.checks.aecbCredit.openLoans}</p>
                    <p>Delinquencies: {result.checks.aecbCredit.delinquencies}</p>
                  </CheckCard>

                  <CheckCard icon={Briefcase} title="WPS Salary Verification" status="OK">
                    <p>Monthly: <b>AED {result.checks.wpsSalary.monthlySalary.toLocaleString()}</b> · ✓ verified</p>
                    <p>Employer: {result.checks.wpsSalary.employer}</p>
                    <p>Service: {result.checks.wpsSalary.months} months · Rent/income {result.checks.wpsSalary.rentToIncome}%</p>
                  </CheckCard>

                  <CheckCard icon={FileText} title="Emirates ID" status="OK">
                    <p>Status: <b>ACTIVE</b></p>
                    <p>Expires in: <b>{result.checks.emiratesId.expiresIn} days</b></p>
                  </CheckCard>

                  <CheckCard icon={Globe} title="AML / Sanctions Watchlist" status="OK">
                    <p>Status: <b className="text-emerald-700">CLEAN</b></p>
                    <p>Checked: {result.checks.amlSanctions.lists.join(', ')}</p>
                  </CheckCard>

                  <CheckCard icon={FileText} title="UAE Tenancy Records" status="OK">
                    <p>Prior evictions: <b>{result.checks.priorEvictions.count}</b></p>
                    <p>Source: {result.checks.priorEvictions.source}</p>
                  </CheckCard>

                  <CheckCard icon={FileText} title="Residency Visa" status="OK">
                    <p>Status: <b className="text-emerald-700">VALID</b></p>
                    <p>Sponsor: {result.checks.residencyVisa.sponsor}</p>
                  </CheckCard>
                </div>

                {result.flags?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Flags</p>
                    {result.flags.map((f: string, i: number) => (
                      <p key={i} className="text-sm text-amber-700 mt-1">• {f}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              {!result && !running && (
                <>
                  <Button variant="outline" onClick={close}>Cancel</Button>
                  <Button onClick={run} className="bg-purple-600 hover:bg-purple-700">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Run screening
                  </Button>
                </>
              )}
              {result && (
                <>
                  <Button variant="outline" onClick={() => { toast.success('Screening report saved to tenant profile'); close(); }}>Save to profile</Button>
                  <Button onClick={reset} className="bg-purple-600 hover:bg-purple-700">Run again</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CheckCard({ icon: Icon, title, status, children }: any) {
  const color = status === 'OK' ? 'text-emerald-600' : status === 'WARN' ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        {status === 'OK' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
        {status === 'WARN' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 ml-auto" />}
      </div>
      <div className="text-xs text-gray-600 space-y-0.5">{children}</div>
    </div>
  );
}
