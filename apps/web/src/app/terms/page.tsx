export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  const lastUpdated = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-3xl mx-auto p-8 text-gray-800 space-y-5 leading-relaxed">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of <strong>Manara OS</strong>, a property management
        platform provided by [Legal Entity Name] (&quot;Company&quot;), incorporated in the United Arab Emirates.
      </p>

      <h2 className="text-xl font-semibold mt-6">1. Acceptance</h2>
      <p className="text-sm">By creating an account you accept these Terms and our Privacy Policy.</p>

      <h2 className="text-xl font-semibold mt-6">2. Subscription &amp; payment</h2>
      <p className="text-sm">
        Subscription fees are billed monthly or annually in advance. Late payments accrue interest at 1%
        per month after a 7-day grace period. Refunds are pro-rated.
      </p>

      <h2 className="text-xl font-semibold mt-6">3. Acceptable use</h2>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>You must not use the platform for any unlawful purpose.</li>
        <li>You must not bypass rate limits or attempt to reverse-engineer the API.</li>
        <li>You are responsible for the accuracy of data you upload (lease terms, tenant details).</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">4. Liability</h2>
      <p className="text-sm">
        To the maximum extent permitted by UAE law, the Company&apos;s aggregate liability is limited to
        the fees paid in the 12 months preceding the claim.
      </p>

      <h2 className="text-xl font-semibold mt-6">5. Governing law</h2>
      <p className="text-sm">
        These Terms are governed by the laws of the UAE. Disputes are subject to the exclusive jurisdiction
        of Dubai Courts (or DIFC Courts if both parties opt in).
      </p>

      <h2 className="text-xl font-semibold mt-6">6. Contact</h2>
      <p className="text-sm">
        Legal: <a className="underline" href="mailto:legal@manaraos.ae">legal@manaraos.ae</a>
      </p>

      <p className="text-xs text-gray-400 pt-6 border-t">
        This template is provided for development purposes. The final published version must be drafted
        or reviewed by qualified UAE legal counsel.
      </p>
    </div>
  );
}
