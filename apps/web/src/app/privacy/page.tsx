export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-3xl mx-auto p-8 text-gray-800 space-y-5 leading-relaxed">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>

      <p>
        <strong>Manara OS</strong> (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the Manara OS property management
        platform. This policy explains how we collect, use, and protect personal data of users and their
        properties&apos; tenants, owners, and vendors.
      </p>

      <h2 className="text-xl font-semibold mt-6">1. Legal basis</h2>
      <p>
        We process personal data in line with the UAE Personal Data Protection Law (Federal Decree-Law
        No. 45 of 2021) and, where applicable, the EU General Data Protection Regulation (GDPR).
        Lawful bases include contract performance, legal obligation, legitimate interest, and explicit
        consent.
      </p>

      <h2 className="text-xl font-semibold mt-6">2. Data we collect</h2>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>Account data: name, phone, email, role.</li>
        <li>KYC data: Emirates ID, passport, visa references — encrypted at rest.</li>
        <li>Financial data: rent cheques, bank IBAN (encrypted), VAT amounts.</li>
        <li>Property data: leases, units, maintenance tickets, owner statements.</li>
        <li>Communications: WhatsApp / email logs sent through the platform.</li>
        <li>Usage data: audit log of mutations performed in your workspace.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">3. Your rights</h2>
      <p className="text-sm">
        Under UAE PDPL Articles 7–13 and GDPR Articles 15–22 you have the right to:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li><strong>Access</strong> a copy of your personal data — <code>GET /api/v1/privacy/export</code></li>
        <li><strong>Rectify</strong> incorrect data — <code>PATCH /api/v1/privacy/rectify</code></li>
        <li><strong>Erase</strong> your account (30-day grace then hard delete) — <code>POST /api/v1/privacy/delete-account</code></li>
        <li><strong>Restrict</strong> or <strong>object</strong> to processing — email <a className="underline" href="mailto:privacy@manaraos.ae">privacy@manaraos.ae</a></li>
        <li><strong>Data portability</strong> — machine-readable JSON export</li>
        <li><strong>Withdraw consent</strong> at any time</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">4. Third parties</h2>
      <p className="text-sm">We share data only with these processors, all bound by data protection agreements:</p>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li><strong>Twilio</strong> — WhatsApp Business / SMS dispatch</li>
        <li><strong>OpenAI</strong> — AI features (call drafting, suggestions). No PII is sent without redaction.</li>
        <li><strong>Stripe / Checkout.com / Network International</strong> — payment processing</li>
        <li><strong>AECB</strong> — credit reporting (only if tenant opts in)</li>
        <li><strong>SendGrid / Postmark</strong> — transactional email</li>
        <li><strong>AWS S3 (me-south-1)</strong> — file storage</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">5. Retention</h2>
      <p className="text-sm">
        Active account data is retained while your account is open. Closed accounts: 30 days soft-delete
        + immediate hard-delete on request. Financial records: 7 years (UAE Federal Tax Authority
        requirement). Audit logs: 3 years.
      </p>

      <h2 className="text-xl font-semibold mt-6">6. Security</h2>
      <p className="text-sm">
        AES-256-GCM encryption at rest for PII fields, TLS 1.2+ in transit, role-based access control,
        immutable audit log, rate limiting, secure cookies, JWT with rotation, helmet headers, CSRF
        protection. Annual third-party penetration test.
      </p>

      <h2 className="text-xl font-semibold mt-6">7. Contact</h2>
      <p className="text-sm">
        Data Protection Officer: <a className="underline" href="mailto:dpo@manaraos.ae">dpo@manaraos.ae</a>
        <br />
        Mail: Manara OS, [address], Dubai, UAE
      </p>

      <p className="text-xs text-gray-400 pt-6 border-t">
        This template policy is provided for development purposes. The final published version must be
        reviewed and approved by qualified UAE legal counsel.
      </p>
    </div>
  );
}
