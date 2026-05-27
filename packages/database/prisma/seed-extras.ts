/**
 * Supplemental seed for the 9 production-push features.
 * Idempotent — safe to run multiple times. Pulls workspace, owners, tenants, units, vendors
 * from existing data and decorates them with compliance items, receipts, reviews, NPS, bids,
 * vendor scores, AECB reports, WhatsApp messages, renovation scenarios.
 *
 * Usage:
 *   tsx prisma/seed-extras.ts
 */
import {
  PrismaClient,
  ComplianceCategory,
  ComplianceStatus,
  ReceiptStatus,
  TaxCertificateStatus,
  ReviewSource,
  ReviewSentiment,
  NpsStatus,
  BidStatus,
  AecbReportStatus,
  WhatsAppDirection,
  WhatsAppSender,
  WhatsAppDeliveryStatus,
  TicketCategory,
} from '@prisma/client';

const prisma = new PrismaClient();

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log('🌱  Seeding production-push extras...');

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.error('No active workspace — run main seed first');
    process.exit(1);
  }

  // ──────── Compliance items ────────
  const complianceData = [
    { category: ComplianceCategory.TRADE_LICENSE, name: 'Rocky Real Estate L.L.C. trade license', referenceNumber: 'DED-1234567', expiryDate: daysFromNow(110), costAed: 12000 },
    { category: ComplianceCategory.VAT_FILING,    name: 'Q2 2026 VAT return',                       referenceNumber: 'TRN-100123456700003', expiryDate: daysFromNow(15) },
    { category: ComplianceCategory.RERA,          name: 'RERA broker registration',                 referenceNumber: 'BRN-0245', expiryDate: daysFromNow(22), costAed: 5000 },
    { category: ComplianceCategory.INSURANCE,     name: 'Marina Heights — building insurance',     referenceNumber: 'POL-2025-MH-0044', expiryDate: daysFromNow(10), costAed: 18000 },
    { category: ComplianceCategory.STAFF_VISA,    name: 'Omar Al Hashimi — employment visa',        referenceNumber: 'UID-784198567', expiryDate: daysFromNow(220) },
    { category: ComplianceCategory.STAFF_VISA,    name: 'Ruqaiya Al Rashidi — Emirates ID',         referenceNumber: '784-1985-0001234-5', expiryDate: daysFromNow(28) },
    { category: ComplianceCategory.FIRE_SAFETY,   name: 'Downtown Palms — fire alarm AMC',          referenceNumber: 'AMC-DP-2025', expiryDate: daysFromNow(170), costAed: 8500 },
    { category: ComplianceCategory.CIVIL_DEFENCE, name: 'Marina Heights — civil defence certificate', referenceNumber: 'CD-2024-887', expiryDate: daysFromNow(45) },
    { category: ComplianceCategory.DLD,           name: 'JVC Gardens — Mulkiya (title)',            referenceNumber: 'JVC-DEED-2020-GN003', expiryDate: daysFromNow(1800) },
    { category: ComplianceCategory.VAT_FILING,    name: 'Q1 2026 VAT return',                       referenceNumber: 'TRN-100123456700003', expiryDate: daysFromNow(-12) },
  ];

  for (const c of complianceData) {
    const existing = await prisma.complianceItem.findFirst({ where: { workspaceId: workspace.id, name: c.name } });
    if (existing) continue;
    const status =
      c.expiryDate.getTime() < Date.now() ? ComplianceStatus.EXPIRED :
      (c.expiryDate.getTime() - Date.now()) / 86_400_000 <= 30 ? ComplianceStatus.EXPIRING_SOON :
      ComplianceStatus.VALID;
    await prisma.complianceItem.create({ data: { workspaceId: workspace.id, ...c, status } });
  }
  console.log(`  ✓ ${complianceData.length} compliance items`);

  // ──────── Receipts (vendor invoices linked to owners) ────────
  const owners = await prisma.owner.findMany({ where: { workspaceId: workspace.id }, take: 3 });
  const units = await prisma.unit.findMany({ where: { workspaceId: workspace.id }, take: 5 });
  const vendors = await prisma.vendor.findMany({ where: { workspaceId: workspace.id }, take: 5 });

  for (const owner of owners) {
    for (let i = 0; i < 4; i++) {
      const amount = 200 + Math.floor(Math.random() * 800);
      const unit = pick(units);
      const vendor = pick(vendors);
      const category = pick([TicketCategory.PLUMBING, TicketCategory.ELECTRICAL, TicketCategory.AC_HVAC, TicketCategory.CLEANING, TicketCategory.PAINTING]);
      await prisma.receipt.create({
        data: {
          workspaceId: workspace.id,
          ownerId: owner.id,
          unitId: unit.id,
          vendorId: vendor.id,
          category,
          description: `${category.replace('_', ' ').toLowerCase()} work — Unit ${unit.unitNumber}`,
          amount,
          vatAmount: amount * 0.05,
          vendorInvoiceNo: `INV-${Date.now().toString().slice(-6)}-${i}`,
          receiptDate: daysFromNow(-Math.floor(Math.random() * 60)),
          status: i === 0 ? ReceiptStatus.PENDING_APPROVAL : ReceiptStatus.PAID,
        },
      });
    }
  }
  console.log(`  ✓ ${owners.length * 4} receipts`);

  // ──────── Reviews ────────
  const reviewSeeds = [
    { source: ReviewSource.GOOGLE,          authorName: 'James Okafor',    rating: 5, text: 'Excellent service. AC was repaired within hours and they kept me updated on WhatsApp throughout.', sentiment: ReviewSentiment.POSITIVE, responded: true, responseText: 'Thank you James! Pleasure having you with us.' },
    { source: ReviewSource.BAYUT,           authorName: 'Aisha Al Rashid', rating: 5, text: 'Found my apartment through Bayut and leasing was smooth. Highly recommended.', sentiment: ReviewSentiment.POSITIVE, responded: true },
    { source: ReviewSource.GOOGLE,          authorName: 'Mohammed Khan',   rating: 2, text: 'Maintenance took 5 days to respond to a leaking sink. Not acceptable.', sentiment: ReviewSentiment.NEGATIVE, responded: false },
    { source: ReviewSource.PROPERTY_FINDER, authorName: 'Priya S.',        rating: 4, text: 'Good experience overall. Onboarding was fast.', sentiment: ReviewSentiment.POSITIVE, responded: true },
    { source: ReviewSource.GOOGLE,          authorName: 'Sarah Lee',       rating: 5, text: 'Renewal process was seamless. PM was very helpful.', sentiment: ReviewSentiment.POSITIVE, responded: true },
    { source: ReviewSource.BAYUT,           authorName: 'Fatima H.',       rating: 5, text: 'Best PM company I have dealt with in Dubai. Transparent statements.', sentiment: ReviewSentiment.POSITIVE, responded: true },
    { source: ReviewSource.WHATSAPP,        authorName: 'Carlos Mendoza',  rating: 3, text: 'OK service. Cleaning vendor was late twice.', sentiment: ReviewSentiment.NEUTRAL, responded: false },
    { source: ReviewSource.GOOGLE,          authorName: 'Ahmed B.',        rating: 5, text: 'Five stars. The AI assistant on WhatsApp resolved my query in seconds.', sentiment: ReviewSentiment.POSITIVE, responded: true },
  ];

  for (const r of reviewSeeds) {
    const existing = await prisma.review.findFirst({ where: { workspaceId: workspace.id, authorName: r.authorName, source: r.source } });
    if (existing) continue;
    await prisma.review.create({
      data: { workspaceId: workspace.id, ...r, postedAt: daysFromNow(-Math.floor(Math.random() * 30)) },
    });
  }
  console.log(`  ✓ ${reviewSeeds.length} reviews`);

  // ──────── NPS — past quarter campaign ────────
  const tenants = await prisma.tenant.findMany({ where: { workspaceId: workspace.id, isActive: true }, take: 10 });
  for (const t of tenants) {
    const existing = await prisma.npsResponse.findFirst({ where: { workspaceId: workspace.id, tenantId: t.id, campaignName: 'NPS Q1 2026' } });
    if (existing) continue;
    const score = Math.floor(Math.random() * 11);
    await prisma.npsResponse.create({
      data: {
        workspaceId: workspace.id,
        campaignName: 'NPS Q1 2026',
        tenantId: t.id,
        recipientPhone: t.phone,
        score,
        status: NpsStatus.RESPONDED,
        sentAt: daysFromNow(-30),
        respondedAt: daysFromNow(-28),
        comment: score >= 9 ? 'Great service' : score <= 6 ? 'Could improve' : undefined,
      },
    });
  }
  console.log(`  ✓ ${tenants.length} NPS responses`);

  // ──────── Bids on first OPEN ticket ────────
  const openTicket = await prisma.ticket.findFirst({ where: { workspaceId: workspace.id, status: { in: ['OPEN', 'ASSIGNED'] } } });
  if (openTicket) {
    for (let i = 0; i < Math.min(vendors.length, 4); i++) {
      const v = vendors[i];
      const existing = await prisma.ticketBid.findFirst({ where: { ticketId: openTicket.id, vendorId: v.id } });
      if (existing) continue;
      const amount = 500 + Math.floor(Math.random() * 500);
      await prisma.ticketBid.create({
        data: {
          workspaceId: workspace.id,
          ticketId: openTicket.id,
          vendorId: v.id,
          amountAed: amount,
          vatIncluded: true,
          etaHours: 4 + Math.floor(Math.random() * 12),
          warrantyDays: 30 + Math.floor(Math.random() * 60),
          message: 'Available promptly · genuine parts only.',
          status: BidStatus.PENDING,
        },
      });
    }
    console.log(`  ✓ 4 ticket bids on ${openTicket.ticketRef}`);
  }

  // ──────── Vendor scores ────────
  const periodStart = daysFromNow(-90);
  const periodEnd = new Date();
  for (const v of vendors) {
    const jobs = 50 + Math.floor(Math.random() * 200);
    const avgRating = 3.8 + Math.random() * 1.1;
    const responseHours = 2 + Math.random() * 10;
    const reworkRate = Math.random() * 7;
    const slaCompliance = 70 + Math.random() * 28;
    const score = (avgRating / 5) * 30 + (100 - responseHours) * 0.2 + (100 - reworkRate * 10) * 0.2 + (slaCompliance / 100) * 15 + (jobs / 200) * 15;

    await prisma.vendorScore.upsert({
      where: { vendorId_periodStart_periodEnd: { vendorId: v.id, periodStart, periodEnd } },
      create: {
        workspaceId: workspace.id, vendorId: v.id, periodStart, periodEnd,
        jobsCompleted: jobs, avgRating, avgResponseHours: responseHours,
        reworkRatePct: reworkRate, slaCompliancePct: slaCompliance,
        totalEarnedAed: jobs * 350, compositeScore: score,
        badges: avgRating >= 4.7 ? ['Top rated'] : [],
      },
      update: {},
    });
  }
  console.log(`  ✓ ${vendors.length} vendor scores`);

  // ──────── WhatsApp seed thread (one per first tenant) ────────
  if (tenants[0]) {
    const t = tenants[0];
    const existing = await prisma.whatsAppMessage.findFirst({ where: { tenantId: t.id } });
    if (!existing) {
      const msgs = [
        { dir: WhatsAppDirection.OUTBOUND, sender: WhatsAppSender.PM, body: `Hi ${t.fullName.split(' ')[0]}, just confirming your cheque dated 1 Jun. Let me know if anything changes.`, hoursAgo: 72 },
        { dir: WhatsAppDirection.INBOUND, sender: WhatsAppSender.TENANT, body: 'Yes confirmed thanks 👍', hoursAgo: 71 },
        { dir: WhatsAppDirection.INBOUND, sender: WhatsAppSender.TENANT, body: 'Actually the AC in master bedroom is making a weird noise. Can someone take a look?', hoursAgo: 48 },
        { dir: WhatsAppDirection.OUTBOUND, sender: WhatsAppSender.AI, body: `I've raised a ticket for AC repair · HIGH priority. A technician will arrive between 14:00 and 16:00 today. You'll get a WhatsApp confirmation 30 minutes before.`, hoursAgo: 47, isAi: true },
        { dir: WhatsAppDirection.INBOUND, sender: WhatsAppSender.TENANT, body: 'Perfect, thanks!', hoursAgo: 46 },
        { dir: WhatsAppDirection.OUTBOUND, sender: WhatsAppSender.PM, body: 'Quick note: your lease expires in 14 days. Are you renewing?', hoursAgo: 1 },
      ];
      for (const m of msgs) {
        await prisma.whatsAppMessage.create({
          data: {
            workspaceId: workspace.id,
            tenantId: t.id,
            direction: m.dir,
            sender: m.sender,
            recipientPhone: t.phone,
            body: m.body,
            isAiGenerated: m.isAi ?? false,
            deliveryStatus: WhatsAppDeliveryStatus.READ,
            sentAt: new Date(Date.now() - m.hoursAgo * 3_600_000),
            deliveredAt: new Date(Date.now() - m.hoursAgo * 3_600_000),
            readAt: new Date(Date.now() - (m.hoursAgo - 0.1) * 3_600_000),
          },
        });
      }
      console.log(`  ✓ WhatsApp thread for ${t.fullName}`);
    }
  }

  // ──────── AECB opt-in for first tenant + 3 months of reports ────────
  if (tenants[0]) {
    const t = tenants[0];
    await prisma.tenant.update({ where: { id: t.id }, data: { meta: { aecbOptIn: true, aecbOptInChangedAt: daysFromNow(-180).toISOString() } } });
    for (let m = 1; m <= 6; m++) {
      const reportingMonth = new Date();
      reportingMonth.setMonth(reportingMonth.getMonth() - m);
      reportingMonth.setDate(1);
      const existing = await prisma.aecbReport.findFirst({ where: { tenantId: t.id, reportingMonth } });
      if (existing) continue;
      await prisma.aecbReport.create({
        data: {
          workspaceId: workspace.id,
          tenantId: t.id,
          reportingMonth,
          onTimePayment: true,
          amountAed: 11800,
          scoreAtReport: 680 + m * 12,
          scoreDelta: 12,
          status: AecbReportStatus.SUBMITTED,
          submittedAt: daysFromNow(-30 * m),
          aecbReference: `AECB-${Date.now().toString().slice(-8)}-${m}`,
        },
      });
    }
    console.log(`  ✓ 6 AECB reports for ${t.fullName}`);
  }

  // ──────── Tax certificates for first owner, year 2025 ────────
  if (owners[0]) {
    const o = owners[0];
    const existing = await prisma.taxCertificate.findFirst({ where: { ownerId: o.id, taxYear: 2025 } });
    if (!existing) {
      const gross = 138_600;
      const expenses = Math.round(gross * 0.21);
      const mgmtFee = Math.round(gross * Number(o.mgmtFeePct) / 100);
      const vatCollected = Math.round(gross * 0.05);
      await prisma.taxCertificate.create({
        data: {
          workspaceId: workspace.id,
          ownerId: o.id,
          taxYear: 2025,
          grossIncomeAed: gross,
          expensesAed: expenses,
          mgmtFeeAed: mgmtFee,
          vatCollectedAed: vatCollected,
          netIncomeAed: gross - expenses - mgmtFee,
          ftaReference: `TC-2025-${Date.now().toString().slice(-6)}`,
          status: TaxCertificateStatus.GENERATED,
        },
      });
      console.log(`  ✓ Tax certificate FY2025 for ${o.fullName}`);
    }
  }

  // ──────── Renovation scenarios (defaults) ────────
  const scenarios = [
    { name: 'Kitchen refresh',         icon: '🍳', capexAed: 18000, rentUpliftPct: 6,   description: 'New cabinets, quartz tops, mid-range appliances',     marketEvidence: 'Bayut: similar refreshed units rent +5-7% in same building', vacancyDaysHint: 30 },
    { name: 'Bathroom upgrade',        icon: '🛁', capexAed: 12000, rentUpliftPct: 4,   description: 'Re-tile, new vanity, glass shower, fittings',         marketEvidence: 'PF: bath-upgraded comps rent +3-5%',                       vacancyDaysHint: 14 },
    { name: 'Full renovation',         icon: '🏗', capexAed: 65000, rentUpliftPct: 18,  description: 'Floors, paint, kitchen, baths, AC service, smart locks', marketEvidence: 'Dubizzle: top-quartile units rent +15-22%',                vacancyDaysHint: 75 },
    { name: 'Paint + furnish (light)', icon: '🎨', capexAed: 8000,  rentUpliftPct: 3,   description: 'Repaint, accent walls, basic furnishing kit',         marketEvidence: 'Quickest payback for tired interiors',                     vacancyDaysHint: 10 },
    { name: 'Smart home pack',         icon: '🏠', capexAed: 6500,  rentUpliftPct: 2.5, description: 'Smart lock, Nest thermostat, doorbell, motorised blinds', marketEvidence: 'Listings with smart tags rent ~2-3% higher',               vacancyDaysHint: 2 },
    { name: 'Balcony glazing',         icon: '🪟', capexAed: 14000, rentUpliftPct: 5,   description: 'Frameless glass balcony enclosure (DM approved)',     marketEvidence: 'Adds usable sqft → +4-6%',                                 vacancyDaysHint: 7 },
  ];
  for (const s of scenarios) {
    const existing = await prisma.renovationScenario.findFirst({ where: { name: s.name, isDefault: true } });
    if (existing) continue;
    await prisma.renovationScenario.create({ data: { ...s, isDefault: true } });
  }
  console.log(`  ✓ ${scenarios.length} renovation scenarios`);

  console.log('\n✅  Production-push extras seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
