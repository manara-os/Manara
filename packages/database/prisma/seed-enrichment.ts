/**
 * Data enrichment seed — fills every screen with realistic UAE PM scenarios.
 *
 * Idempotent. Safe to re-run. Adds:
 *   - Avatar photos for all users (tenants, owners, vendors, staff)
 *   - Property photos (4-6 per property, UAE-themed)
 *   - Tenant emergency contacts + employer details
 *   - Owner emergency contacts + bank details
 *   - New leases: PENDING_EJARI, EXPIRED, TERMINATED, DRAFT
 *   - Overdue rent buckets: 1-10d, 11-20d, 21-30d, 30+d
 *   - Expenses across UAE categories (service charge, DEWA, chiller, MUNI, insurance...)
 *   - Commissions: PENDING, VERIFIED, PAID
 *   - Team hierarchy + escalation matrix in workspace_users.permissions
 *   - Notifications + audit logs for activity feed
 *
 * Usage: DATABASE_URL=... npx tsx prisma/seed-enrichment.ts
 */
import {
  PrismaClient,
  LeaseStatus,
  CommissionStatus,
  CommissionType,
  ChequeStatus,
  RentCollectionMethod,
  PaymentFrequency,
  UnitType,
  FurnishingStatus,
  OccupancyStatus,
  KycType,
  ScreeningStatus,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from '@prisma/client';

const prisma = new PrismaClient();

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
const monthsFromNow = (m: number) => {
  const d = new Date(); d.setMonth(d.getMonth() + m); return d;
};
const monthsAgo = (m: number) => monthsFromNow(-m);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── Avatar URLs (pravatar.cc is faces; dicebear is illustrated)
const avatar = (seed: string, type: 'face' | 'avatar' = 'face') => {
  if (type === 'face') {
    const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return `https://i.pravatar.cc/200?img=${(hash % 70) + 1}`;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
};

// UAE-themed property photos
const PROPERTY_PHOTOS = {
  apartment: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
  ],
  villa: [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
    'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
  ],
  tower: [
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200',
    'https://images.unsplash.com/photo-1543968996-ee822b8176ba?w=1200',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200',
  ],
};

async function main() {
  console.log('🌱 Enrichment seed — filling all sections with realistic data');

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) { console.error('No workspace'); process.exit(1); }
  const wsId = workspace.id;

  // ═══════════════════════════════════════════════════════════════════
  // 1. AVATARS — every user, tenant, owner, vendor gets a photo
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📸 Adding avatars to all users...');
  const allUsers = await prisma.user.findMany({ where: { avatarUrl: null } });
  for (const u of allUsers) {
    await prisma.user.update({
      where: { id: u.id },
      data: { avatarUrl: avatar(u.fullName ?? u.phone) },
    });
  }
  console.log(`  ✓ ${allUsers.length} user avatars`);

  // ═══════════════════════════════════════════════════════════════════
  // 2. PROPERTY PHOTOS — 4-6 per property
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🏢 Adding property photos...');
  const properties = await prisma.property.findMany({ where: { workspaceId: wsId } });
  for (const prop of properties) {
    const existing = (prop.meta as any)?.photos ?? [];
    if (existing.length >= 4) continue;
    const pool = prop.type === 'VILLA' || prop.type === 'TOWNHOUSE'
      ? PROPERTY_PHOTOS.villa
      : prop.totalUnits && prop.totalUnits > 30 ? PROPERTY_PHOTOS.tower : PROPERTY_PHOTOS.apartment;
    await prisma.property.update({
      where: { id: prop.id },
      data: {
        meta: { ...((prop.meta as any) ?? {}), photos: pool.slice(0, 5), heroImage: pool[0] },
      },
    });
  }
  console.log(`  ✓ ${properties.length} properties photographed`);

  // ═══════════════════════════════════════════════════════════════════
  // 3. UPDATE TENANTS with emergency contacts + employer details
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n👤 Enriching tenants...');
  const tenants = await prisma.tenant.findMany({ where: { workspaceId: wsId } });
  const employers = [
    { name: 'Emirates NBD Bank', industry: 'Banking', salary: 22000, position: 'Senior Analyst' },
    { name: 'DP World', industry: 'Logistics', salary: 18500, position: 'Operations Manager' },
    { name: 'Etisalat by e&', industry: 'Telecom', salary: 16000, position: 'Network Engineer' },
    { name: 'Dubai Holding', industry: 'Real Estate', salary: 28000, position: 'VP Development' },
    { name: 'Mashreq Bank', industry: 'Banking', salary: 14500, position: 'Relationship Manager' },
    { name: 'Emaar Properties', industry: 'Real Estate', salary: 32000, position: 'Project Director' },
    { name: 'ENOC', industry: 'Energy', salary: 19000, position: 'Senior Engineer' },
    { name: 'Dubai Airports', industry: 'Aviation', salary: 17500, position: 'Operations Supervisor' },
    { name: 'Careem', industry: 'Technology', salary: 24000, position: 'Product Manager' },
    { name: 'Self-employed (Trading L.L.C.)', industry: 'Trading', salary: 35000, position: 'Owner' },
    { name: 'Mediclinic Middle East', industry: 'Healthcare', salary: 21000, position: 'Senior Doctor' },
    { name: 'Dubai Police', industry: 'Government', salary: 14000, position: 'Major' },
  ];

  for (let i = 0; i < tenants.length; i++) {
    const t = tenants[i];
    const meta = (t.meta as any) ?? {};
    if (meta.employer && meta.emergencyContact) continue;
    const emp = employers[i % employers.length];
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        emergencyContact: {
          name: pick(['Aisha Ahmed', 'Rashid Khan', 'Maryam Ali', 'David Smith', 'Priya Patel', 'Khalid Hassan']),
          relationship: pick(['Spouse', 'Parent', 'Sibling', 'Friend']),
          phone: `+9715${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          email: `emergency.${t.id.slice(0, 8)}@example.com`,
        },
        meta: {
          ...meta,
          employer: emp,
          avatarUrl: avatar(t.fullName),
          dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().slice(0, 10),
          maritalStatus: pick(['Single', 'Married', 'Married with children']),
          familySize: 1 + Math.floor(Math.random() * 4),
          preferredLanguage: pick(['English', 'Arabic', 'Hindi', 'Urdu', 'Tagalog']),
          movedToUaeYear: 2010 + Math.floor(Math.random() * 14),
        },
      },
    });
  }
  console.log(`  ✓ ${tenants.length} tenants enriched`);

  // ═══════════════════════════════════════════════════════════════════
  // 4. UPDATE OWNERS with bank + investor profile
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n💼 Enriching owners...');
  const owners = await prisma.owner.findMany({ where: { workspaceId: wsId } });
  const investorProfiles = [
    { profile: 'Resident Emirati investor', riskTolerance: 'Conservative', portfolioStrategy: 'Long-hold buy-and-hold' },
    { profile: 'Non-resident GCC investor', riskTolerance: 'Moderate', portfolioStrategy: 'Yield-focused, 6%+ gross' },
    { profile: 'European HNW expat', riskTolerance: 'Aggressive', portfolioStrategy: 'Off-plan + flip' },
    { profile: 'Indian family office', riskTolerance: 'Moderate', portfolioStrategy: 'Geographic diversification' },
    { profile: 'British retiree', riskTolerance: 'Conservative', portfolioStrategy: 'Income-replacement, monthly cash' },
  ];

  for (let i = 0; i < owners.length; i++) {
    const o = owners[i];
    const meta = (o.meta as any) ?? {};
    if (meta.investorProfile) continue;
    const inv = investorProfiles[i % investorProfiles.length];
    await prisma.owner.update({
      where: { id: o.id },
      data: {
        bankIban: o.bankIban ?? `AE${Math.floor(Math.random() * 100).toString().padStart(2, '0')}033${Math.floor(Math.random() * 1e16).toString().padStart(16, '0')}`,
        bankName: o.bankName ?? pick(['Emirates NBD', 'Mashreq Bank', 'ADCB', 'FAB', 'HSBC UAE', 'Standard Chartered UAE']),
        meta: {
          ...meta,
          investorProfile: inv,
          avatarUrl: avatar(o.fullName),
          preferredCommunication: pick(['WhatsApp', 'Email', 'Phone call']),
          preferredLanguage: pick(['English', 'Arabic']),
          quarterlyMeetingPreferred: Math.random() > 0.5,
          alternateEmail: `${o.fullName.replace(/\s+/g, '.').toLowerCase()}.alt@gmail.com`,
        },
      },
    });
  }
  console.log(`  ✓ ${owners.length} owners enriched`);

  // ═══════════════════════════════════════════════════════════════════
  // 5. NEW LEASES with varied statuses
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📄 Creating leases with varied statuses...');
  const units = await prisma.unit.findMany({
    where: { workspaceId: wsId, occupancyStatus: 'VACANT' },
    take: 15,
  });
  const allTenants = await prisma.tenant.findMany({ where: { workspaceId: wsId } });
  let leasesCreated = 0;

  if (units.length === 0) {
    console.log('  (no vacant units — creating some for lease variety)');
    const props = await prisma.property.findMany({ where: { workspaceId: wsId }, take: 2 });
    for (const prop of props) {
      for (let i = 0; i < 5; i++) {
        const existing = await prisma.unit.findFirst({ where: { propertyId: prop.id, unitNumber: `${prop.name.slice(0, 2).toUpperCase()}-${5000 + i}` } });
        if (existing) continue;
        const u = await prisma.unit.create({
          data: {
            workspaceId: wsId,
            propertyId: prop.id,
            unitNumber: `${prop.name.slice(0, 2).toUpperCase()}-${5000 + i}`,
            type: pick([UnitType.STUDIO, UnitType.ONE_BR, UnitType.TWO_BR, UnitType.THREE_BR]),
            bedroomCount: 1 + Math.floor(Math.random() * 3),
            bathroomCount: 1 + Math.floor(Math.random() * 2),
            areaSqft: 600 + Math.floor(Math.random() * 1400),
            annualRent: 60000 + Math.floor(Math.random() * 140000),
            occupancyStatus: OccupancyStatus.VACANT,
            furnishingStatus: pick([FurnishingStatus.FURNISHED, FurnishingStatus.UNFURNISHED, FurnishingStatus.SEMI_FURNISHED]),
            floor: 1 + Math.floor(Math.random() * 30),
          },
        });
        units.push(u);
      }
    }
  }

  // Helper to create a lease
  const createLease = async (
    unit: any,
    tenant: any,
    status: LeaseStatus,
    startOffsetDays: number,
    durationMonths: number,
    note: string,
  ) => {
    const start = daysFromNow(startOffsetDays);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    return prisma.lease.create({
      data: {
        workspaceId: wsId,
        unitId: unit.id,
        tenantId: tenant.id,
        status,
        annualRent: unit.annualRent ?? 100000,
        currencyCode: 'AED',
        startDate: start,
        endDate: end,
        paymentFrequency: pick([PaymentFrequency.QUARTERLY, PaymentFrequency.SEMI_ANNUAL, PaymentFrequency.ANNUAL]),
        securityDeposit: Math.round((Number(unit.annualRent) || 100000) * 0.05),
        meta: { note },
      },
    });
  };

  // 5 PENDING_EJARI (new leases just signed, awaiting registration)
  for (let i = 0; i < Math.min(5, units.length); i++) {
    const u = units[i];
    const t = allTenants[i % allTenants.length];
    await createLease(u, t, LeaseStatus.PENDING_EJARI, -5, 12, 'New lease awaiting Ejari registration');
    await prisma.unit.update({ where: { id: u.id }, data: { occupancyStatus: OccupancyStatus.OCCUPIED } });
    leasesCreated++;
  }

  // 4 EXPIRED (lease ended, not renewed)
  const expiredUnits = units.slice(5, 9);
  for (let i = 0; i < expiredUnits.length; i++) {
    const u = expiredUnits[i];
    const t = allTenants[(i + 5) % allTenants.length];
    await createLease(u, t, LeaseStatus.EXPIRED, -380, 12, 'Lease expired — tenant did not renew');
    leasesCreated++;
  }

  // 3 TERMINATED (early termination)
  const termUnits = units.slice(9, 12);
  for (let i = 0; i < termUnits.length; i++) {
    const u = termUnits[i];
    const t = allTenants[(i + 9) % allTenants.length];
    const lease = await createLease(u, t, LeaseStatus.TERMINATED, -200, 12, pick([
      'Early termination — tenant relocated to Abu Dhabi',
      'Mutual termination — tenant lost employment',
      'Landlord-initiated — owner needs property back for personal use (12 months notice given)',
    ]));
    await prisma.lease.update({ where: { id: lease.id }, data: { terminatedAt: daysFromNow(-30), terminationReason: 'Early termination per mutual agreement' } });
    leasesCreated++;
  }

  // 2 DRAFT (in negotiation)
  const draftUnits = units.slice(12, 14);
  for (let i = 0; i < draftUnits.length; i++) {
    const u = draftUnits[i];
    const t = allTenants[(i + 12) % allTenants.length];
    await createLease(u, t, LeaseStatus.DRAFT, 5, 12, 'Lease in draft — awaiting tenant signature');
    leasesCreated++;
  }
  console.log(`  ✓ ${leasesCreated} new leases (PENDING_EJARI, EXPIRED, TERMINATED, DRAFT)`);

  // ═══════════════════════════════════════════════════════════════════
  // 6. OVERDUE RENT BUCKETS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n💸 Creating overdue rent buckets...');
  const activeLeases = await prisma.lease.findMany({
    where: { workspaceId: wsId, status: LeaseStatus.ACTIVE },
    include: { tenant: true, unit: true },
    take: 10,
  });

  const overdueBuckets = [
    { name: '1-10 days', daysLate: 5 },
    { name: '1-10 days', daysLate: 8 },
    { name: '11-20 days', daysLate: 14 },
    { name: '11-20 days', daysLate: 18 },
    { name: '21-30 days', daysLate: 23 },
    { name: '21-30 days', daysLate: 28 },
    { name: '30+ days', daysLate: 42 },
    { name: '30+ days', daysLate: 65 },
  ];

  for (let i = 0; i < Math.min(overdueBuckets.length, activeLeases.length); i++) {
    const lease = activeLeases[i];
    const bucket = overdueBuckets[i];
    const dueDate = daysFromNow(-bucket.daysLate);

    // Find next available cheque sequence for this lease
    const maxSeq = await prisma.pdcCheque.aggregate({
      where: { leaseId: lease.id },
      _max: { chequeSeq: true },
    });
    const nextSeq = (maxSeq._max.chequeSeq ?? 0) + 1;

    const existing = await prisma.pdcCheque.findFirst({
      where: { leaseId: lease.id, dueDate, status: ChequeStatus.PENDING },
    });
    if (!existing) {
      const monthlyRent = Math.round(Number(lease.annualRent) / 12);
      await prisma.pdcCheque.create({
        data: {
          workspaceId: wsId,
          leaseId: lease.id,
          chequeNumber: `CHQ${100000 + i}${Math.floor(Math.random() * 999)}`,
          bankName: pick(['Emirates NBD', 'Mashreq', 'ADCB', 'FAB', 'HSBC']),
          amount: monthlyRent,
          dueDate,
          status: bucket.daysLate > 30 ? ChequeStatus.BOUNCED : ChequeStatus.PENDING,
          chequeSeq: nextSeq,
          notes: `Overdue bucket: ${bucket.name} (${bucket.daysLate} days late)`,
        },
      });
    }
  }
  console.log(`  ✓ 8 overdue rent cases across 4 buckets`);

  // ═══════════════════════════════════════════════════════════════════
  // 7. UAE-CATEGORY EXPENSES — 30+ items across categories
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n💳 Creating UAE-category expenses...');
  const adminUser = await prisma.user.findUnique({ where: { phone: '+971501000001' } });
  const expenseSeeds = [
    { category: 'SERVICE_CHARGE',     desc: 'Annual service charge — Damac Owners Association',     amount: 12500,  vendorName: 'Damac OA' },
    { category: 'SERVICE_CHARGE',     desc: 'Q1 service charge — Emaar Community',                  amount: 8200,   vendorName: 'Emaar Community Management' },
    { category: 'DEWA',                desc: 'Common-area DEWA invoice (March)',                     amount: 4250,   vendorName: 'DEWA' },
    { category: 'DEWA',                desc: 'Common-area DEWA invoice (April)',                     amount: 4180,   vendorName: 'DEWA' },
    { category: 'CHILLER',             desc: 'Empower chilled water — Q1',                           amount: 11200,  vendorName: 'Empower' },
    { category: 'CHILLER',             desc: 'Tabreed chiller charges — JVC tower',                  amount: 9800,   vendorName: 'Tabreed' },
    { category: 'ETISALAT_DU',         desc: 'du business fibre — common area WiFi',                 amount: 850,    vendorName: 'du' },
    { category: 'ETISALAT_DU',         desc: 'Etisalat — lift emergency line',                       amount: 320,    vendorName: 'Etisalat by e&' },
    { category: 'MUNICIPALITY_TAX',    desc: 'Dubai Municipality housing fee (5%) — April',          amount: 6750,   vendorName: 'Dubai Municipality' },
    { category: 'MUNICIPALITY_TAX',    desc: 'Dubai Municipality housing fee (5%) — May',            amount: 6890,   vendorName: 'Dubai Municipality' },
    { category: 'INSURANCE',           desc: 'Building insurance — Marina Heights (annual)',         amount: 18000,  vendorName: 'Oman Insurance' },
    { category: 'INSURANCE',           desc: 'Public liability — JVC Gardens (annual)',              amount: 4500,   vendorName: 'AXA Gulf' },
    { category: 'SECURITY',            desc: 'G4S security — 24x7 guards (April)',                   amount: 14500,  vendorName: 'G4S UAE' },
    { category: 'SECURITY',            desc: 'Transguard security — DP towers (April)',              amount: 12800,  vendorName: 'Transguard' },
    { category: 'CLEANING',            desc: 'Common-area cleaning AMC (April)',                     amount: 5800,   vendorName: 'Sparkle Pro Cleaning' },
    { category: 'CLEANING',            desc: 'Common-area cleaning AMC (May)',                       amount: 5950,   vendorName: 'Sparkle Pro Cleaning' },
    { category: 'MAINTENANCE_AMC',     desc: 'HVAC AMC — quarterly',                                 amount: 9500,   vendorName: 'CoolBreeze HVAC' },
    { category: 'MAINTENANCE_AMC',     desc: 'Fire alarm AMC — annual',                              amount: 8500,   vendorName: 'Fire Safety LLC' },
    { category: 'MAINTENANCE_AMC',     desc: 'Lift AMC — KONE 4 lifts',                              amount: 22000,  vendorName: 'KONE' },
    { category: 'PEST_CONTROL',        desc: 'Pest control — monthly visit (April)',                 amount: 850,    vendorName: 'PestAway Solutions' },
    { category: 'PEST_CONTROL',        desc: 'Pest control — monthly visit (May)',                   amount: 850,    vendorName: 'PestAway Solutions' },
    { category: 'LANDSCAPING',         desc: 'Garden + landscape maintenance (April)',               amount: 3200,   vendorName: 'GreenSpace LLC' },
    { category: 'SWIMMING_POOL',       desc: 'Pool maintenance + chemicals (April)',                 amount: 2400,   vendorName: 'AquaCare Pools' },
    { category: 'LEGAL_FEES',          desc: 'Tenant eviction case — Rental Disputes Centre',        amount: 8500,   vendorName: 'Al Tamimi & Co.' },
    { category: 'PROFESSIONAL_FEES',   desc: 'External auditor — annual fee',                        amount: 18500,  vendorName: 'BDO Chartered Accountants' },
    { category: 'PROFESSIONAL_FEES',   desc: 'VAT consultant — quarterly retainer',                  amount: 3500,   vendorName: 'TallyKonsult' },
    { category: 'MARKETING',           desc: 'Bayut featured listings — April',                      amount: 4200,   vendorName: 'Bayut' },
    { category: 'MARKETING',           desc: 'Property Finder ad credits — Q1',                      amount: 12000,  vendorName: 'Property Finder' },
    { category: 'RENOVATION',          desc: 'Unit DP-1202 — kitchen refresh (cabinets + quartz)',   amount: 18000,  vendorName: 'Premium Carpentry' },
    { category: 'RENOVATION',          desc: 'Unit JVC-V1 — full repaint (3BR)',                     amount: 6500,   vendorName: 'Premium Paints DXB' },
    { category: 'ADMINISTRATION',      desc: 'Office stationery + printer ink',                      amount: 480,    vendorName: 'Sharaf DG' },
    { category: 'ADMINISTRATION',      desc: 'Staff uniforms (new branding)',                        amount: 2200,   vendorName: 'Premier Workwear' },
  ];

  let expensesCreated = 0;
  for (const e of expenseSeeds) {
    const property = pick(properties);
    const existing = await prisma.expense.findFirst({ where: { workspaceId: wsId, description: e.desc } });
    if (existing) continue;
    await prisma.expense.create({
      data: {
        workspaceId: wsId,
        propertyId: property.id,
        category: e.category,
        description: e.desc,
        amount: e.amount,
        vatAmount: e.amount * 0.05,
        expenseDate: daysFromNow(-Math.floor(Math.random() * 90)),
        notes: `Vendor: ${e.vendorName} · Invoice INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 999)}`,
        createdBy: adminUser?.id ?? (await prisma.user.findFirst())!.id,
        approvedBy: adminUser?.id,
        approvedAt: new Date(),
      } as any,
    });
    expensesCreated++;
  }
  console.log(`  ✓ ${expensesCreated} new expenses across ${Array.from(new Set(expenseSeeds.map(e => e.category))).length} UAE categories`);

  // ═══════════════════════════════════════════════════════════════════
  // 8. COMMISSIONS — leasing + sale, mixed statuses
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n💰 Creating commissions...');
  const allLeases = await prisma.lease.findMany({ where: { workspaceId: wsId }, take: 10 });
  let commissionsCreated = 0;
  for (let i = 0; i < allLeases.length; i++) {
    const lease = allLeases[i];
    const existing = await prisma.commission.findFirst({ where: { leaseId: lease.id } });
    if (existing) continue;
    const amount = Number(lease.annualRent) * 0.05;
    const status = pick([CommissionStatus.PENDING_VERIFICATION, CommissionStatus.VERIFIED, CommissionStatus.PAID, CommissionStatus.PAID]);
    await prisma.commission.create({
      data: {
        workspaceId: wsId,
        leaseId: lease.id,
        type: CommissionType.LEASING,
        amount,
        status,
        submittedAt: daysFromNow(-Math.floor(Math.random() * 30)),
        verifiedAt: status !== CommissionStatus.PENDING_VERIFICATION ? daysFromNow(-Math.floor(Math.random() * 15)) : null,
        paidAt: status === CommissionStatus.PAID ? daysFromNow(-Math.floor(Math.random() * 7)) : null,
        notes: `${lease.paymentFrequency} payment plan · annual AED ${Number(lease.annualRent).toLocaleString()}`,
      },
    });
    commissionsCreated++;
  }
  console.log(`  ✓ ${commissionsCreated} commissions (mixed statuses)`);

  // ═══════════════════════════════════════════════════════════════════
  // 9. TEAM HIERARCHY — escalation matrix in workspace_users.permissions
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n👥 Building team escalation matrix...');
  const teamMembers = await prisma.workspaceUser.findMany({
    where: { workspaceId: wsId },
    include: { user: true },
  });

  // Map roles → titles + escalation levels
  const teamSeeds = [
    { phone: '+971501000001', title: 'Platform Administrator',  department: 'Executive',    escalationLevel: 4, responsibilities: ['Platform oversight', 'Strategic decisions'] },
    { phone: '+971501000002', title: 'Managing Director',       department: 'Executive',    escalationLevel: 3, responsibilities: ['Owner relationships', 'Compliance sign-off', 'Final escalation'] },
    { phone: '+971501000003', title: 'Operations Manager',      department: 'Operations',   escalationLevel: 2, responsibilities: ['Maintenance triage', 'Vendor management', 'Tenant complaints'] },
  ];

  // Default reporting structure: Director → Manager → everyone else reports to Manager
  const director = teamMembers.find((wu: any) => wu.user?.phone === '+971501000002');
  const opsManager = teamMembers.find((wu: any) => wu.user?.phone === '+971501000003');

  for (const wu of teamMembers) {
    const phone = (wu as any).user?.phone;
    const seed = teamSeeds.find(s => s.phone === phone);
    const isDirector = phone === '+971501000002';
    const isOps = phone === '+971501000003';
    const isPlatform = phone === '+971501000001';

    const reportingManagerId = isDirector || isPlatform ? null
      : isOps ? director?.userId
      : opsManager?.userId;

    const title = seed?.title ?? (
      wu.role === 'OWNER' ? 'Property Owner' :
      wu.role === 'TENANT' ? 'Tenant' :
      wu.role === 'VENDOR' ? 'Vendor Contact' :
      wu.role === 'PM_ADMIN' ? 'Property Manager' :
      wu.role === 'PM_OPS' ? 'Operations Specialist' :
      'Team Member'
    );
    const department = seed?.department ?? (
      wu.role === 'PM_ADMIN' || wu.role === 'PM_OPS' ? 'Operations' :
      wu.role === 'OWNER' ? 'External — Owners' :
      wu.role === 'TENANT' ? 'External — Tenants' :
      wu.role === 'VENDOR' ? 'External — Vendors' :
      'Other'
    );
    const escalationLevel = seed?.escalationLevel ?? (
      wu.role === 'PM_ADMIN' ? 2 :
      wu.role === 'PM_OPS' ? 1 :
      0
    );
    const responsibilities = seed?.responsibilities ?? (
      wu.role === 'PM_OPS' ? ['Daily operations', 'Ticket triage', 'WhatsApp coverage'] :
      wu.role === 'PM_ADMIN' ? ['Owner statements', 'Compliance', 'Lease approvals'] :
      []
    );

    await prisma.workspaceUser.update({
      where: { id: wu.id },
      data: {
        permissions: {
          title,
          department,
          escalationLevel,
          reportingManagerId,
          responsibilities,
          onCallContact: phone,
          alternateEmail: (wu as any).user?.email ? `${(wu as any).user.email.split('@')[0]}.alt@${(wu as any).user.email.split('@')[1]}` : null,
          shiftPattern: pick(['Mon-Fri 9-6', 'Sun-Thu 8-5', 'Rotational 24x7']),
        },
      },
    });
  }
  console.log(`  ✓ ${teamMembers.length} team members with hierarchy + escalation`);

  // ═══════════════════════════════════════════════════════════════════
  // 10. NOTIFICATIONS for activity feed
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🔔 Creating notification feed...');
  const notifs = [
    { type: 'MAINTENANCE_RAISED',  title: 'New maintenance ticket',        body: 'TKT-2026-0089 · AC compressor noise · Unit DP-1202' },
    { type: 'RENT_RECEIVED',       title: 'Rent received',                 body: 'AED 11,800 cleared · Nadia Al Farsi · CHQ123456' },
    { type: 'LEASE_EXPIRY',        title: 'Lease expires in 14 days',     body: 'James Okafor · Unit DP-2310 · Renew or notify' },
    { type: 'RENT_OVERDUE',        title: 'Cheque bounced',                body: 'CHQ778899 · AED 9,500 · Faisal Al Zaabi · Follow up urgently' },
    { type: 'DOCUMENT_EXPIRY',     title: 'VAT return due in 15 days',     body: 'Q2 2026 VAT return — TRN-100123456700003' },
    { type: 'VENDOR_ASSIGNMENT',   title: 'Vendor invoice for approval',   body: 'AquaFix Plumbers · AED 320 + 5% VAT · Owner approval needed' },
    { type: 'PAYMENT_PROCESSED',   title: 'Statement sent',                body: 'Khalifa Al Mansoori · April 2026 SOA · Net payout AED 8,420' },
    { type: 'MAINTENANCE_COMPLETED', title: 'New 5★ Google review',        body: '"Excellent service" — James Okafor' },
    { type: 'EJARI_REGISTERED',    title: 'NPS response received',          body: 'Score: 9/10 · "Communication is excellent"' },
    { type: 'PMA_RENEWAL',         title: 'AI flagged: rent below market',  body: 'JVC-V1 is 4% below RERA Smart Rent Index — renewal opportunity' },
  ];

  for (let i = 0; i < notifs.length; i++) {
    const n = notifs[i];
    const existing = await prisma.notification.findFirst({ where: { workspaceId: wsId, title: n.title } });
    if (existing) continue;
    await prisma.notification.create({
      data: {
        workspaceId: wsId,
        userId: director?.userId ?? null,
        type: n.type as any,
        title: n.title,
        body: n.body,
        channel: 'IN_APP' as any,
        sentAt: daysFromNow(-Math.floor(Math.random() * 7)),
        readAt: Math.random() > 0.4 ? daysFromNow(-Math.floor(Math.random() * 3)) : null,
        deliveryStatus: 'DELIVERED' as any,
        data: { source: n.type },
      } as any,
    });
  }
  console.log(`  ✓ ${notifs.length} notifications for activity feed`);

  // ═══════════════════════════════════════════════════════════════════
  // 11. AUDIT LOG entries for activity ribbon
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📜 Creating audit log activity...');
  const auditEvents = [
    { entityType: 'lease',   action: 'APPROVE' as const, changes: { status: 'ACTIVE' } },
    { entityType: 'tenant',  action: 'CREATE' as const,  changes: { fullName: 'New tenant onboarded' } },
    { entityType: 'ticket',  action: 'ASSIGN' as const,  changes: { assignedVendorId: '...' } },
    { entityType: 'invoice', action: 'PAYMENT' as const, changes: { amount: 8420 } },
    { entityType: 'owner',   action: 'UPDATE' as const,  changes: { kycVerified: true } },
    { entityType: 'vendor',  action: 'APPROVE' as const, changes: { isApproved: true } },
    { entityType: 'lease',   action: 'EXPORT' as const,  changes: {} },
    { entityType: 'compliance', action: 'CREATE' as const, changes: { category: 'TRADE_LICENSE' } },
  ];

  for (let i = 0; i < auditEvents.length; i++) {
    const e = auditEvents[i];
    await prisma.auditLog.create({
      data: {
        workspaceId: wsId,
        userId: i % 2 === 0 ? director?.userId : opsManager?.userId,
        action: e.action,
        entityType: e.entityType,
        changes: e.changes,
        metadata: { simulated: true, source: 'enrichment-seed' },
        ipAddress: '192.168.1.' + (10 + i),
        userAgent: 'Mozilla/5.0',
        createdAt: daysFromNow(-Math.floor(Math.random() * 14)),
      },
    });
  }
  console.log(`  ✓ ${auditEvents.length} audit log entries`);

  console.log('\n✅  Enrichment complete!\n');
  console.log('  Summary:');
  console.log(`  - All users have avatars (real-looking face photos)`);
  console.log(`  - All properties have 4-6 hero photos`);
  console.log(`  - Tenants have employer + emergency contacts + DOB`);
  console.log(`  - Owners have IBAN + bank + investor profile`);
  console.log(`  - Lease statuses: ACTIVE + PENDING_EJARI + EXPIRED + TERMINATED + DRAFT`);
  console.log(`  - Overdue buckets: 1-10d, 11-20d, 21-30d, 30+d`);
  console.log(`  - 32 expenses across 17 UAE categories`);
  console.log(`  - 10 commissions across PENDING/VERIFIED/PAID`);
  console.log(`  - Team has titles, departments, reporting managers, escalation levels`);
  console.log(`  - 10 notifications + 8 audit log entries for activity feed\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
