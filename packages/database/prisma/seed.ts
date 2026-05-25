import {
  PrismaClient,
  UserRole,
  PropertyType,
  LeaseStatus,
  OccupancyStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  CountryCode,
  MoveInStatus,
  ScreeningStatus,
  CommissionType,
  CommissionStatus,
  PmaStatus,
  MoveOutStatus,
  ChequeStatus,
  VendorStatus,
  FurnishingStatus,
  UnitType,
  PaymentFrequency,
  RentCollectionMethod,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── helpers ─────────────────────────────────────────────────────────────────
const daysFromNow = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt;
};
const daysAgo = (d: number) => daysFromNow(-d);
const monthsAgo = (m: number) => daysFromNow(-m * 30);

async function main() {
  console.log('🌱  Seeding Manara OS — full demo dataset …\n');

  // ══════════════════════════════════════════════════════════════════════
  // WORKSPACE
  // ══════════════════════════════════════════════════════════════════════
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'rocky-real-estate' },
    update: {},
    create: {
      name: 'Rocky Real Estate',
      slug: 'rocky-real-estate',
      countryCode: CountryCode.AE,
      currencyCode: 'AED',
      vatRate: 5.0,
      ejariEnabled: true,
      reraCode: 'RERA-DUBAI-12345',
      trnNumber: 'TRN-100-123-456',
      subscriptionPlan: 'PRO',
      status: 'ACTIVE',
      timezone: 'Asia/Dubai',
      contactEmail: 'ops@rockyrealestate.ae',
      contactPhone: '+971501000099',
      city: 'Dubai',
      maxProperties: 50,
      maxUsers: 20,
      countryConfig: { ejari_enabled: true, vat_rate: 5.0, pdc_required: true, currency: 'AED' },
      features: { ai_calls: true, ejari_integration: true, rera_index: true, investment_intelligence: true },
    },
  });
  console.log('✅  Workspace: Rocky Real Estate');

  // ══════════════════════════════════════════════════════════════════════
  // PM TEAM
  // ══════════════════════════════════════════════════════════════════════
  const pmAdminUser = await prisma.user.upsert({
    where: { phone: '+971501000002' },
    update: {},
    create: { phone: '+971501000002', email: 'ruqaiya@rockyrealestate.ae', fullName: 'Ruqaiya Al Rashidi', phoneVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: pmAdminUser.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: pmAdminUser.id, role: UserRole.PM_ADMIN },
  });

  const pmOpsUser = await prisma.user.upsert({
    where: { phone: '+971501000003' },
    update: {},
    create: { phone: '+971501000003', email: 'omar@rockyrealestate.ae', fullName: 'Omar Al Hashimi', phoneVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: pmOpsUser.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: pmOpsUser.id, role: UserRole.PM_OPS },
  });
  console.log('✅  PM Team: Ruqaiya (Admin), Omar (Ops)');

  // ══════════════════════════════════════════════════════════════════════
  // OWNERS  (3 owners)
  // ══════════════════════════════════════════════════════════════════════

  // Owner 1 — Active PMA, Emirati
  const owner1User = await prisma.user.upsert({
    where: { phone: '+971501000010' },
    update: {},
    create: { phone: '+971501000010', email: 'khalifa.mansoori@gmail.com', fullName: 'Khalifa Al Mansoori', phoneVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner1User.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: owner1User.id, role: UserRole.OWNER },
  });
  const owner1 = await prisma.owner.upsert({
    where: { userId: owner1User.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: owner1User.id,
      fullName: 'Khalifa Al Mansoori',
      phone: '+971501000010',
      email: 'khalifa.mansoori@gmail.com',
      nationality: 'Emirati',
      kycType: 'UAE_NATIONAL',
      emiratesId: '784-1976-5678901-2',
      mgmtFeePct: 8.0,
      kycVerified: true,
      pmaStatus: PmaStatus.ACTIVE,
      pmaSignedDate: new Date('2024-01-01'),
      pmaExpiryDate: new Date('2026-12-31'),
    },
  });

  // Owner 2 — PMA PENDING_RENEWAL (scenario: PMA Landlord Renewal flow)
  const owner2User = await prisma.user.upsert({
    where: { phone: '+971501000011' },
    update: {},
    create: { phone: '+971501000011', email: 'fatima.nahyan@gmail.com', fullName: 'Fatima Al Nahyan', phoneVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner2User.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: owner2User.id, role: UserRole.OWNER },
  });
  const owner2 = await prisma.owner.upsert({
    where: { userId: owner2User.id },
    update: { pmaStatus: PmaStatus.PENDING_RENEWAL, pmaRenewalAlertSentAt: daysAgo(3) },
    create: {
      workspaceId: workspace.id,
      userId: owner2User.id,
      fullName: 'Fatima Al Nahyan',
      phone: '+971501000011',
      email: 'fatima.nahyan@gmail.com',
      nationality: 'Emirati',
      kycType: 'UAE_NATIONAL',
      emiratesId: '784-1982-3456789-4',
      mgmtFeePct: 7.0,
      kycVerified: true,
      pmaStatus: PmaStatus.PENDING_RENEWAL,
      pmaRenewalAlertSentAt: daysAgo(3),
      pmaSignedDate: new Date('2023-01-15'),
      pmaExpiryDate: daysFromNow(28),   // expiring in 28 days
    },
  });

  // Owner 3 — British expat, active
  const owner3User = await prisma.user.upsert({
    where: { phone: '+971501000012' },
    update: {},
    create: { phone: '+971501000012', email: 'james.whitfield@outlook.com', fullName: 'James Whitfield', phoneVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner3User.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: owner3User.id, role: UserRole.OWNER },
  });
  const owner3 = await prisma.owner.upsert({
    where: { userId: owner3User.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: owner3User.id,
      fullName: 'James Whitfield',
      phone: '+971501000012',
      email: 'james.whitfield@outlook.com',
      nationality: 'British',
      kycType: 'EXPAT_RESIDENT',
      passportNo: 'GB123456789',
      emiratesId: '784-1978-7654321-9',
      mgmtFeePct: 8.0,
      kycVerified: true,
      pmaStatus: PmaStatus.ACTIVE,
      pmaSignedDate: new Date('2024-03-01'),
      pmaExpiryDate: new Date('2027-03-01'),
    },
  });
  console.log('✅  Owners: Khalifa (active PMA), Fatima (PMA pending renewal), James');

  // ══════════════════════════════════════════════════════════════════════
  // PROPERTIES
  // ══════════════════════════════════════════════════════════════════════

  // Property 1 — Marina Heights (Khalifa)
  const prop1 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0001-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000001',
      workspaceId: workspace.id,
      ownerId: owner1.id,
      name: 'Marina Heights',
      type: PropertyType.APARTMENT,
      countryCode: CountryCode.AE,
      city: 'Dubai',
      area: 'Dubai Marina',
      address: 'Marina Heights Tower, Shoreline Road, Dubai Marina, Dubai',
      latitude: 25.0805,
      longitude: 55.1403,
      yearBuilt: 2019,
      totalUnits: 4,
      currencyCode: 'AED',
      titleDeedNo: 'DM-DEED-2019-MH001',
      description: 'Premium residential apartments in Dubai Marina with sea views',
    },
  });

  // Property 2 — Downtown Palms (Fatima)
  const prop2 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0001-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000002',
      workspaceId: workspace.id,
      ownerId: owner2.id,
      name: 'Downtown Palms',
      type: PropertyType.APARTMENT,
      countryCode: CountryCode.AE,
      city: 'Dubai',
      area: 'Downtown Dubai',
      address: 'Downtown Palms, Emaar Boulevard, Downtown Dubai',
      latitude: 25.1977,
      longitude: 55.2742,
      yearBuilt: 2021,
      totalUnits: 3,
      currencyCode: 'AED',
      titleDeedNo: 'DT-DEED-2021-DP002',
      description: 'Luxury apartments near Burj Khalifa and Dubai Mall',
    },
  });

  // Property 3 — JVC Gardens (James)
  const prop3 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0001-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000003',
      workspaceId: workspace.id,
      ownerId: owner3.id,
      name: 'JVC Gardens',
      type: PropertyType.VILLA,
      countryCode: CountryCode.AE,
      city: 'Dubai',
      area: 'JVC',
      address: 'Villa Cluster J, Jumeirah Village Circle, Dubai',
      latitude: 25.0573,
      longitude: 55.2061,
      yearBuilt: 2020,
      totalUnits: 2,
      currencyCode: 'AED',
      titleDeedNo: 'JVC-DEED-2020-GN003',
    },
  });
  console.log('✅  Properties: Marina Heights, Downtown Palms, JVC Gardens');

  // ══════════════════════════════════════════════════════════════════════
  // UNITS
  // ══════════════════════════════════════════════════════════════════════

  // Marina Heights units
  const unitMH1 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop1.id, unitNumber: 'MH-1401' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop1.id, unitNumber: 'MH-1401', floor: 14, type: UnitType.TWO_BR, areaSqft: 1350, bedroomCount: 2, bathroomCount: 2, annualRent: 110000, occupancyStatus: OccupancyStatus.OCCUPIED, furnishingStatus: FurnishingStatus.FULLY_FURNISHED, securityDepositPct: 5.0 },
  });
  const unitMH2 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop1.id, unitNumber: 'MH-0801' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop1.id, unitNumber: 'MH-0801', floor: 8, type: UnitType.ONE_BR, areaSqft: 850, bedroomCount: 1, bathroomCount: 1, annualRent: 72000, occupancyStatus: OccupancyStatus.OCCUPIED, furnishingStatus: FurnishingStatus.SEMI_FURNISHED, securityDepositPct: 5.0 },
  });
  const unitMH3 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop1.id, unitNumber: 'MH-0302' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop1.id, unitNumber: 'MH-0302', floor: 3, type: UnitType.STUDIO, areaSqft: 500, bedroomCount: 0, bathroomCount: 1, annualRent: 52000, occupancyStatus: OccupancyStatus.OCCUPIED, furnishingStatus: FurnishingStatus.FULLY_FURNISHED, securityDepositPct: 5.0 },
  });
  const unitMH4 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop1.id, unitNumber: 'MH-2001' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop1.id, unitNumber: 'MH-2001', floor: 20, type: UnitType.THREE_BR, areaSqft: 2100, bedroomCount: 3, bathroomCount: 3, annualRent: 165000, occupancyStatus: OccupancyStatus.VACANT, furnishingStatus: FurnishingStatus.UNFURNISHED, securityDepositPct: 5.0 },
  });

  // Downtown Palms units
  const unitDP1 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop2.id, unitNumber: 'DP-1202' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop2.id, unitNumber: 'DP-1202', floor: 12, type: UnitType.TWO_BR, areaSqft: 1450, bedroomCount: 2, bathroomCount: 2, annualRent: 130000, occupancyStatus: OccupancyStatus.OCCUPIED, furnishingStatus: FurnishingStatus.FULLY_FURNISHED, securityDepositPct: 5.0 },
  });
  const unitDP2 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop2.id, unitNumber: 'DP-0505' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop2.id, unitNumber: 'DP-0505', floor: 5, type: UnitType.ONE_BR, areaSqft: 900, bedroomCount: 1, bathroomCount: 1, annualRent: 92000, occupancyStatus: OccupancyStatus.OCCUPIED, furnishingStatus: FurnishingStatus.SEMI_FURNISHED, securityDepositPct: 5.0 },
  });
  const unitDP3 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop2.id, unitNumber: 'DP-0101' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop2.id, unitNumber: 'DP-0101', floor: 1, type: UnitType.STUDIO, areaSqft: 560, bedroomCount: 0, bathroomCount: 1, annualRent: 58000, occupancyStatus: OccupancyStatus.VACANT, furnishingStatus: FurnishingStatus.UNFURNISHED, securityDepositPct: 5.0 },
  });

  // JVC Gardens units
  const unitJV1 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop3.id, unitNumber: 'JVC-V1' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop3.id, unitNumber: 'JVC-V1', floor: 0, type: UnitType.THREE_BR, areaSqft: 2800, bedroomCount: 3, bathroomCount: 3, annualRent: 135000, occupancyStatus: OccupancyStatus.OCCUPIED, furnishingStatus: FurnishingStatus.SEMI_FURNISHED, securityDepositPct: 5.0 },
  });
  const unitJV2 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: prop3.id, unitNumber: 'JVC-V2' } },
    update: {},
    create: { workspaceId: workspace.id, propertyId: prop3.id, unitNumber: 'JVC-V2', floor: 0, type: UnitType.THREE_BR, areaSqft: 2600, bedroomCount: 3, bathroomCount: 3, annualRent: 128000, occupancyStatus: OccupancyStatus.OCCUPIED, furnishingStatus: FurnishingStatus.UNFURNISHED, securityDepositPct: 5.0 },
  });
  console.log('✅  Units: 4 × Marina Heights, 3 × Downtown Palms, 2 × JVC Gardens');

  // ══════════════════════════════════════════════════════════════════════
  // TENANTS  (8 tenants covering all workflow stages)
  // ══════════════════════════════════════════════════════════════════════
  async function makeTenant(phone: string, fullName: string, email: string, nationality: string, passportNo: string, screening: ScreeningStatus) {
    const u = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, email, fullName, phoneVerified: true },
    });
    await prisma.workspaceUser.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: u.id } },
      update: {},
      create: { workspaceId: workspace.id, userId: u.id, role: UserRole.TENANT },
    });
    return prisma.tenant.upsert({
      where: { userId: u.id },
      update: { screeningStatus: screening },
      create: {
        workspaceId: workspace.id,
        userId: u.id,
        fullName,
        phone,
        email,
        nationality,
        kycType: 'EXPAT_RESIDENT',
        passportNo,
        emiratesId: `784-${1975 + Math.floor(Math.random() * 30)}-${Math.floor(Math.random() * 9000000 + 1000000)}-${Math.floor(Math.random() * 9 + 1)}`,
        kycVerified: screening === ScreeningStatus.APPROVED,
        screeningStatus: screening,
        screeningApprovedAt: screening === ScreeningStatus.APPROVED ? daysAgo(7) : undefined,
      },
    });
  }

  // 1. Rajan Mehta — APPROVED, active long-term tenant
  const tRajan = await makeTenant('+971501000020', 'Rajan Mehta', 'rajan.mehta@infosys.com', 'Indian', 'N1234567', ScreeningStatus.APPROVED);
  // 2. Nadia Al Farsi — APPROVED, lease expiring soon (renewal scenario)
  const tNadia = await makeTenant('+971501000021', 'Nadia Al Farsi', 'nadia.alfarsi@gmail.com', 'Omani', 'OM9876543', ScreeningStatus.APPROVED);
  // 3. Sarah Mitchell — APPROVED, move-in ONGOING
  const tSarah = await makeTenant('+971501000022', 'Sarah Mitchell', 'sarah.mitchell@pwc.com', 'British', 'GB87654321', ScreeningStatus.APPROVED);
  // 4. Faisal Al Zaabi — APPROVED, move-in PENDING (new lead just signed)
  const tFaisal = await makeTenant('+971501000023', 'Faisal Al Zaabi', 'faisal.zaabi@gmail.com', 'Emirati', 'AE11223344', ScreeningStatus.APPROVED);
  // 5. James Okafor — APPROVED, move-out IN_PROGRESS
  const tJames = await makeTenant('+971501000024', 'James Okafor', 'james.okafor@hotmail.com', 'Nigerian', 'NG55667788', ScreeningStatus.APPROVED);
  // 6. Priya Sharma — PENDING screening (new applicant)
  const tPriya = await makeTenant('+971501000025', 'Priya Sharma', 'priya.sharma@tcs.com', 'Indian', 'N9988776', ScreeningStatus.PENDING);
  // 7. Mohammed Al Balushi — APPROVED, overdue payments
  const tMohammed = await makeTenant('+971501000026', 'Mohammed Al Balushi', 'mo.balushi@gmail.com', 'Omani', 'OM1122334', ScreeningStatus.APPROVED);
  // 8. Chen Wei — APPROVED, commission verified (completed flow)
  const tChen = await makeTenant('+971501000027', 'Chen Wei', 'chen.wei@huawei.com', 'Chinese', 'CN44556677', ScreeningStatus.APPROVED);
  console.log('✅  Tenants: Rajan, Nadia, Sarah, Faisal, James, Priya (pending), Mohammed, Chen');

  // ══════════════════════════════════════════════════════════════════════
  // LEASES — 6 scenarios
  // ══════════════════════════════════════════════════════════════════════

  // ── Lease 1: Rajan @ MH-1401 — Active, COMPLETE move-in, commission PENDING_VERIFICATION
  const lease1 = await prisma.lease.upsert({
    where: { id: '00000000-0000-0000-0002-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000001',
      workspaceId: workspace.id,
      unitId: unitMH1.id,
      tenantId: tRajan.id,
      leaseType: 'RESIDENTIAL',
      status: LeaseStatus.ACTIVE,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2026-02-28'),
      annualRent: 110000,
      currencyCode: 'AED',
      paymentFrequency: PaymentFrequency.QUARTERLY,
      numCheques: 4,
      securityDeposit: 9167,
      ejariNumber: 'E-20250301-MH1401',
      ejariRegisteredAt: new Date('2025-03-05'),
      leaseRef: 'LSE-MH1401-01',
      screeningApproved: true,
      moveInStatus: MoveInStatus.COMPLETE,
      moveInPendingAt: new Date('2025-02-25'),
      moveInOngoingAt: new Date('2025-02-28'),
      moveInCompletedAt: new Date('2025-03-01'),
      handoverAt: new Date('2025-03-01'),
      commissionAmount: 9167,
      commissionStatus: CommissionStatus.PENDING_VERIFICATION,
    },
  });

  // ── Lease 2: Nadia @ MH-0801 — Active, COMPLETE move-in, expiring in 45 days (RENEWAL scenario)
  const lease2 = await prisma.lease.upsert({
    where: { id: '00000000-0000-0000-0002-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000002',
      workspaceId: workspace.id,
      unitId: unitMH2.id,
      tenantId: tNadia.id,
      leaseType: 'RESIDENTIAL',
      status: LeaseStatus.ACTIVE,
      startDate: new Date('2025-07-10'),
      endDate: daysFromNow(45),   // expires in 45 days — triggers renewal alert
      annualRent: 72000,
      currencyCode: 'AED',
      paymentFrequency: PaymentFrequency.SEMI_ANNUAL,
      numCheques: 2,
      securityDeposit: 6000,
      ejariNumber: 'E-20250710-MH0801',
      ejariRegisteredAt: new Date('2025-07-15'),
      leaseRef: 'LSE-MH0801-01',
      screeningApproved: true,
      moveInStatus: MoveInStatus.COMPLETE,
      moveInPendingAt: monthsAgo(10),
      moveInOngoingAt: monthsAgo(10),
      moveInCompletedAt: monthsAgo(10),
      commissionAmount: 6000,
      commissionStatus: CommissionStatus.PAID,
      commissionVerifiedAt: monthsAgo(9),
      commissionVerifiedBy: pmAdminUser.id,
    },
  });

  // ── Lease 3: Sarah @ DP-1202 — Active, move-in ONGOING
  const lease3 = await prisma.lease.upsert({
    where: { id: '00000000-0000-0000-0002-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000003',
      workspaceId: workspace.id,
      unitId: unitDP1.id,
      tenantId: tSarah.id,
      leaseType: 'RESIDENTIAL',
      status: LeaseStatus.ACTIVE,
      startDate: daysAgo(5),
      endDate: daysFromNow(360),
      annualRent: 130000,
      currencyCode: 'AED',
      paymentFrequency: PaymentFrequency.QUARTERLY,
      numCheques: 4,
      securityDeposit: 10833,
      leaseRef: 'LSE-DP1202-01',
      screeningApproved: true,
      moveInStatus: MoveInStatus.ONGOING,
      moveInPendingAt: daysAgo(10),
      moveInOngoingAt: daysAgo(5),
    },
  });

  // ── Lease 4: Faisal @ DP-0505 — Active, move-in PENDING (new lease just created)
  const lease4 = await prisma.lease.upsert({
    where: { id: '00000000-0000-0000-0002-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000004',
      workspaceId: workspace.id,
      unitId: unitDP2.id,
      tenantId: tFaisal.id,
      leaseType: 'RESIDENTIAL',
      status: LeaseStatus.ACTIVE,
      startDate: daysFromNow(7),
      endDate: daysFromNow(372),
      annualRent: 92000,
      currencyCode: 'AED',
      paymentFrequency: PaymentFrequency.QUARTERLY,
      numCheques: 4,
      securityDeposit: 7667,
      leaseRef: 'LSE-DP0505-01',
      screeningApproved: true,
      moveInStatus: MoveInStatus.PENDING,
      moveInPendingAt: daysAgo(2),
    },
  });

  // ── Lease 5: James @ JVC-V1 — Active, move-out IN_PROGRESS
  const lease5 = await prisma.lease.upsert({
    where: { id: '00000000-0000-0000-0002-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000005',
      workspaceId: workspace.id,
      unitId: unitJV1.id,
      tenantId: tJames.id,
      leaseType: 'RESIDENTIAL',
      status: LeaseStatus.ACTIVE,
      startDate: new Date('2024-06-01'),
      endDate: daysFromNow(15),   // ending in 15 days
      annualRent: 135000,
      currencyCode: 'AED',
      paymentFrequency: PaymentFrequency.SEMI_ANNUAL,
      numCheques: 2,
      securityDeposit: 11250,
      ejariNumber: 'E-20240601-JV1',
      ejariRegisteredAt: new Date('2024-06-05'),
      leaseRef: 'LSE-JVC1-01',
      screeningApproved: true,
      moveInStatus: MoveInStatus.COMPLETE,
      moveInCompletedAt: new Date('2024-06-01'),
      terminationReason: 'Tenant relocating to Abu Dhabi',
      commissionAmount: 11250,
      commissionStatus: CommissionStatus.PAID,
    },
  });

  // ── Lease 6: Mohammed @ JVC-V2 — Active, OVERDUE payments
  const lease6 = await prisma.lease.upsert({
    where: { id: '00000000-0000-0000-0002-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000006',
      workspaceId: workspace.id,
      unitId: unitJV2.id,
      tenantId: tMohammed.id,
      leaseType: 'RESIDENTIAL',
      status: LeaseStatus.ACTIVE,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2025-07-31'),
      annualRent: 128000,
      currencyCode: 'AED',
      paymentFrequency: PaymentFrequency.QUARTERLY,
      numCheques: 4,
      securityDeposit: 10667,
      ejariNumber: 'E-20240801-JV2',
      ejariRegisteredAt: new Date('2024-08-07'),
      leaseRef: 'LSE-JVC2-01',
      screeningApproved: true,
      moveInStatus: MoveInStatus.COMPLETE,
      moveInCompletedAt: new Date('2024-08-01'),
      commissionAmount: 10667,
      commissionStatus: CommissionStatus.PAID,
    },
  });

  // ── Lease 7: Chen @ MH-0302 — COMPLETE flow (commission VERIFIED, stable)
  const lease7 = await prisma.lease.upsert({
    where: { id: '00000000-0000-0000-0002-000000000007' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000007',
      workspaceId: workspace.id,
      unitId: unitMH3.id,
      tenantId: tChen.id,
      leaseType: 'RESIDENTIAL',
      status: LeaseStatus.ACTIVE,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      annualRent: 52000,
      currencyCode: 'AED',
      paymentFrequency: PaymentFrequency.ANNUAL,
      numCheques: 1,
      securityDeposit: 4333,
      ejariNumber: 'E-20250101-MH0302',
      ejariRegisteredAt: new Date('2025-01-05'),
      leaseRef: 'LSE-MH0302-01',
      screeningApproved: true,
      moveInStatus: MoveInStatus.COMPLETE,
      moveInCompletedAt: new Date('2025-01-01'),
      commissionAmount: 4333,
      commissionStatus: CommissionStatus.VERIFIED,
      commissionVerifiedAt: new Date('2025-01-15'),
      commissionVerifiedBy: pmAdminUser.id,
    },
  });
  console.log('✅  Leases: 7 leases across all workflow stages');

  // ══════════════════════════════════════════════════════════════════════
  // COMMISSIONS
  // ══════════════════════════════════════════════════════════════════════
  await prisma.commission.upsert({
    where: { id: '00000000-0000-0000-0003-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000001',
      workspaceId: workspace.id,
      leaseId: lease1.id,
      type: CommissionType.LEASING,
      amount: 9167,
      status: CommissionStatus.PENDING_VERIFICATION,
      notes: '5% of AED 110,000 annual rent — standard leasing commission',
      submittedAt: daysAgo(3),
    },
  });

  await prisma.commission.upsert({
    where: { id: '00000000-0000-0000-0003-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000002',
      workspaceId: workspace.id,
      leaseId: lease7.id,
      type: CommissionType.LEASING,
      amount: 4333,
      status: CommissionStatus.VERIFIED,
      verifiedAt: new Date('2025-01-15'),
      verifiedBy: pmAdminUser.id,
      notes: 'Verified — 5% of AED 52,000 annual rent',
      submittedAt: new Date('2025-01-10'),
    },
  });

  await prisma.commission.upsert({
    where: { id: '00000000-0000-0000-0003-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000003',
      workspaceId: workspace.id,
      leaseId: lease2.id,
      type: CommissionType.LEASING,
      amount: 6000,
      status: CommissionStatus.PAID,
      verifiedAt: monthsAgo(9),
      verifiedBy: pmAdminUser.id,
      paidAt: monthsAgo(8),
      notes: 'Paid via bank transfer',
      submittedAt: monthsAgo(10),
    },
  });
  console.log('✅  Commissions: 3 records (1 pending verification, 1 verified, 1 paid)');

  // ══════════════════════════════════════════════════════════════════════
  // MOVE-OUT INSPECTION (Lease 5 — James)
  // ══════════════════════════════════════════════════════════════════════
  await prisma.moveOutInspection.upsert({
    where: { leaseId: lease5.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      leaseId: lease5.id,
      inspectedAt: daysAgo(3),
      maintenanceRequired: true,
      maintenanceAmount: 2800,
      settlementAmount: 8450,  // 11250 deposit - 2800 maintenance
      utilityBillsSubmitted: true,
      refundApproved: false,
      status: MoveOutStatus.IN_PROGRESS,
      notes: 'Minor wall scuffs in living room, bathroom faucet replacement needed. DEWA bill settled.',
      inspectedBy: pmOpsUser.id,
    },
  });
  console.log('✅  Move-out inspection: JVC-V1 (James — IN_PROGRESS)');

  // ══════════════════════════════════════════════════════════════════════
  // RENEWAL ALERTS
  // ══════════════════════════════════════════════════════════════════════
  await prisma.renewalAlert.upsert({
    where: { id: '00000000-0000-0000-0004-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000001',
      workspaceId: workspace.id,
      leaseId: lease2.id,
      daysBeforeExpiry: 60,
      sentAt: daysAgo(15),
      channel: 'IN_APP',
    },
  });
  await prisma.renewalAlert.upsert({
    where: { id: '00000000-0000-0000-0004-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000002',
      workspaceId: workspace.id,
      leaseId: lease2.id,
      daysBeforeExpiry: 45,
      sentAt: daysAgo(0),
      channel: 'IN_APP',
    },
  });
  console.log('✅  Renewal alerts: Nadia lease (60d + 45d)');

  // ══════════════════════════════════════════════════════════════════════
  // PDC CHEQUES
  // ══════════════════════════════════════════════════════════════════════

  // Lease 1 — Rajan, quarterly cheques
  const rajanCheques = [
    { seq: 1, chequeNumber: 'CBD-110001', amount: 27500, dueDate: new Date('2025-03-01'), status: ChequeStatus.CLEARED, clearedAt: new Date('2025-03-05') },
    { seq: 2, chequeNumber: 'CBD-110002', amount: 27500, dueDate: new Date('2025-06-01'), status: ChequeStatus.CLEARED, clearedAt: new Date('2025-06-04') },
    { seq: 3, chequeNumber: 'CBD-110003', amount: 27500, dueDate: daysAgo(45), status: ChequeStatus.PENDING },  // OVERDUE
    { seq: 4, chequeNumber: 'CBD-110004', amount: 27500, dueDate: daysFromNow(45), status: ChequeStatus.PENDING },
  ];
  for (const c of rajanCheques) {
    await prisma.pdcCheque.upsert({
      where: { leaseId_chequeSeq: { leaseId: lease1.id, chequeSeq: c.seq } },
      update: {},
      create: { workspaceId: workspace.id, leaseId: lease1.id, chequeNumber: c.chequeNumber, chequeSeq: c.seq, bankName: 'Commercial Bank of Dubai', amount: c.amount, currencyCode: 'AED', dueDate: c.dueDate, status: c.status, clearedAt: (c as any).clearedAt },
    });
  }

  // Lease 6 — Mohammed, overdue cheques
  const mohCheques = [
    { seq: 1, chequeNumber: 'ENBD-220001', amount: 32000, dueDate: new Date('2024-08-01'), status: ChequeStatus.CLEARED, clearedAt: new Date('2024-08-07') },
    { seq: 2, chequeNumber: 'ENBD-220002', amount: 32000, dueDate: new Date('2024-11-01'), status: ChequeStatus.BOUNCED, bouncedAt: new Date('2024-11-05'), bounceReason: 'Insufficient funds' },
    { seq: 3, chequeNumber: 'ENBD-220003', amount: 32000, dueDate: daysAgo(60), status: ChequeStatus.PENDING },  // OVERDUE
    { seq: 4, chequeNumber: 'ENBD-220004', amount: 32000, dueDate: daysAgo(15), status: ChequeStatus.PENDING },  // OVERDUE
  ];
  for (const c of mohCheques) {
    await prisma.pdcCheque.upsert({
      where: { leaseId_chequeSeq: { leaseId: lease6.id, chequeSeq: c.seq } },
      update: {},
      create: { workspaceId: workspace.id, leaseId: lease6.id, chequeNumber: c.chequeNumber, chequeSeq: c.seq, bankName: 'Emirates NBD', amount: c.amount, currencyCode: 'AED', dueDate: c.dueDate, status: c.status, bouncedAt: (c as any).bouncedAt, bounceReason: (c as any).bounceReason, clearedAt: (c as any).clearedAt },
    });
  }

  // Lease 2 — Nadia, semi-annual
  const nadiaCheques = [
    { seq: 1, chequeNumber: 'FAB-330001', amount: 36000, dueDate: new Date('2025-07-10'), status: ChequeStatus.CLEARED, clearedAt: new Date('2025-07-14') },
    { seq: 2, chequeNumber: 'FAB-330002', amount: 36000, dueDate: daysAgo(20), status: ChequeStatus.PENDING },  // OVERDUE
  ];
  for (const c of nadiaCheques) {
    await prisma.pdcCheque.upsert({
      where: { leaseId_chequeSeq: { leaseId: lease2.id, chequeSeq: c.seq } },
      update: {},
      create: { workspaceId: workspace.id, leaseId: lease2.id, chequeNumber: c.chequeNumber, chequeSeq: c.seq, bankName: 'First Abu Dhabi Bank', amount: c.amount, currencyCode: 'AED', dueDate: c.dueDate, status: c.status, clearedAt: (c as any).clearedAt },
    });
  }
  console.log('✅  PDC Cheques: Rajan (1 overdue), Mohammed (2 overdue + 1 bounced), Nadia (1 overdue)');

  // ══════════════════════════════════════════════════════════════════════
  // RENT COLLECTIONS (revenue history for charts)
  // ══════════════════════════════════════════════════════════════════════
  const collections = [
    { leaseId: lease1.id, tenantId: tRajan.id, amount: 27500, date: new Date('2025-03-05'), period: ['2025-03-01', '2025-05-31'] },
    { leaseId: lease1.id, tenantId: tRajan.id, amount: 27500, date: new Date('2025-06-04'), period: ['2025-06-01', '2025-08-31'] },
    { leaseId: lease2.id, tenantId: tNadia.id, amount: 36000, date: new Date('2025-07-14'), period: ['2025-07-10', '2026-01-09'] },
    { leaseId: lease5.id, tenantId: tJames.id, amount: 67500, date: new Date('2024-06-05'), period: ['2024-06-01', '2024-11-30'] },
    { leaseId: lease5.id, tenantId: tJames.id, amount: 67500, date: new Date('2024-12-02'), period: ['2024-12-01', '2025-05-31'] },
    { leaseId: lease6.id, tenantId: tMohammed.id, amount: 32000, date: new Date('2024-08-07'), period: ['2024-08-01', '2024-10-31'] },
    { leaseId: lease7.id, tenantId: tChen.id, amount: 52000, date: new Date('2025-01-05'), period: ['2025-01-01', '2025-12-31'] },
  ];
  for (const [i, c] of collections.entries()) {
    const existing = await prisma.rentCollection.findFirst({ where: { leaseId: c.leaseId, collectedAt: c.date } });
    if (!existing) {
      await prisma.rentCollection.create({
        data: {
          workspaceId: workspace.id,
          leaseId: c.leaseId,
          tenantId: c.tenantId,
          amount: c.amount,
          currencyCode: 'AED',
          collectedAt: c.date,
          method: RentCollectionMethod.CHEQUE,
          referenceNo: `RC-2025-${String(i + 1).padStart(4, '0')}`,
          periodStart: new Date(c.period[0]),
          periodEnd: new Date(c.period[1]),
          collectedBy: pmOpsUser.id,
        },
      });
    }
  }
  console.log('✅  Rent collections: 7 historical records for revenue chart');

  // ══════════════════════════════════════════════════════════════════════
  // VENDORS
  // ══════════════════════════════════════════════════════════════════════
  const vendor1User = await prisma.user.upsert({
    where: { phone: '+971501000030' },
    update: {},
    create: { phone: '+971501000030', fullName: 'QuickFix Contact', phoneVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: vendor1User.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: vendor1User.id, role: UserRole.VENDOR },
  });
  const vendor1 = await prisma.vendor.upsert({
    where: { userId: vendor1User.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: vendor1User.id,
      companyName: 'QuickFix Maintenance LLC',
      contactName: 'Ali Hassan',
      phone: '+971501000030',
      email: 'ops@quickfix.ae',
      tradeLicenseNo: 'TL-DXB-2023-9876',
      tradeLicenseExpiry: new Date('2026-12-31'),
      serviceCategories: [TicketCategory.PLUMBING, TicketCategory.ELECTRICAL, TicketCategory.AC_HVAC, TicketCategory.CARPENTRY],
      coverageAreas: ['Dubai Marina', 'JVC', 'JBR', 'Downtown Dubai'],
      status: VendorStatus.ACTIVE,
      isApproved: true,
      approvedBy: pmAdminUser.id,
      approvedAt: new Date('2024-01-15'),
      rating: 4.7,
      totalJobsCompleted: 47,
    },
  });

  const vendor2User = await prisma.user.upsert({
    where: { phone: '+971501000031' },
    update: {},
    create: { phone: '+971501000031', fullName: 'CoolBreeze Contact', phoneVerified: true },
  });
  await prisma.workspaceUser.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: vendor2User.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: vendor2User.id, role: UserRole.VENDOR },
  });
  const vendor2 = await prisma.vendor.upsert({
    where: { userId: vendor2User.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: vendor2User.id,
      companyName: 'CoolBreeze AC Services',
      contactName: 'Sameer Patel',
      phone: '+971501000031',
      email: 'service@coolbreeze.ae',
      tradeLicenseNo: 'TL-DXB-2022-5543',
      tradeLicenseExpiry: new Date('2026-08-31'),
      serviceCategories: [TicketCategory.AC_HVAC, TicketCategory.CLEANING],
      coverageAreas: ['Downtown Dubai', 'Business Bay', 'DIFC'],
      status: VendorStatus.ACTIVE,
      isApproved: true,
      approvedBy: pmAdminUser.id,
      approvedAt: new Date('2023-09-01'),
      rating: 4.5,
      totalJobsCompleted: 89,
    },
  });
  console.log('✅  Vendors: QuickFix (approved), CoolBreeze (approved)');

  // ══════════════════════════════════════════════════════════════════════
  // MAINTENANCE TICKETS
  // ══════════════════════════════════════════════════════════════════════
  const ticketRefs = ['TKT-2025-0001', 'TKT-2025-0002', 'TKT-2025-0003', 'TKT-2025-0004', 'TKT-2025-0005'];

  await prisma.ticket.upsert({
    where: { ticketRef: ticketRefs[0] },
    update: {},
    create: {
      workspaceId: workspace.id, ticketRef: ticketRefs[0],
      unitId: unitMH1.id, raisedByTenantId: tRajan.id, assignedVendorId: vendor1.id,
      category: TicketCategory.PLUMBING, priority: TicketPriority.HIGH, status: TicketStatus.IN_PROGRESS,
      title: 'Kitchen sink blocked — water not draining',
      description: 'The kitchen sink drain is completely blocked. Water backing up. Urgent fix needed.',
      slaHours: 24, slaDueAt: daysAgo(0),
      assignedAt: daysAgo(1), inProgressAt: daysAgo(0),
    },
  });

  await prisma.ticket.upsert({
    where: { ticketRef: ticketRefs[1] },
    update: {},
    create: {
      workspaceId: workspace.id, ticketRef: ticketRefs[1],
      unitId: unitDP1.id, raisedByTenantId: tSarah.id, assignedVendorId: vendor2.id,
      category: TicketCategory.AC_HVAC, priority: TicketPriority.MEDIUM, status: TicketStatus.ASSIGNED,
      title: 'AC unit not cooling bedroom',
      description: 'Master bedroom AC is running but not cooling. Temperature stays above 27°C.',
      slaHours: 48, slaDueAt: daysFromNow(1),
      assignedAt: daysAgo(0),
    },
  });

  await prisma.ticket.upsert({
    where: { ticketRef: ticketRefs[2] },
    update: {},
    create: {
      workspaceId: workspace.id, ticketRef: ticketRefs[2],
      unitId: unitJV2.id, raisedByTenantId: tMohammed.id,
      category: TicketCategory.ELECTRICAL, priority: TicketPriority.EMERGENCY, status: TicketStatus.OPEN,
      title: 'Power trip in living room circuit',
      description: 'Circuit breaker trips every time living room appliances are used. Multiple tripping events today.',
      slaHours: 4, slaDueAt: daysFromNow(0),
    },
  });

  await prisma.ticket.upsert({
    where: { ticketRef: ticketRefs[3] },
    update: {},
    create: {
      workspaceId: workspace.id, ticketRef: ticketRefs[3],
      unitId: unitMH3.id, raisedByTenantId: tChen.id, assignedVendorId: vendor1.id,
      category: TicketCategory.CARPENTRY, priority: TicketPriority.LOW, status: TicketStatus.COMPLETED,
      title: 'Wardrobe door hinge broken',
      description: 'Master bedroom wardrobe door hinge snapped, door hangs loose.',
      slaHours: 72, slaDueAt: daysAgo(5),
      assignedAt: daysAgo(7), inProgressAt: daysAgo(6), completedAt: daysAgo(5),
      vendorInvoiceAmount: 350, tenantRating: 5, tenantFeedback: 'Fixed quickly, very professional.',
    },
  });

  await prisma.ticket.upsert({
    where: { ticketRef: ticketRefs[4] },
    update: {},
    create: {
      workspaceId: workspace.id, ticketRef: ticketRefs[4],
      unitId: unitDP2.id, raisedByTenantId: null,
      category: TicketCategory.PAINTING, priority: TicketPriority.LOW, status: TicketStatus.OPEN,
      title: 'Pre move-in touch-up painting',
      description: 'Fresh coat on living room walls before new tenant Faisal moves in.',
      slaHours: 72, slaDueAt: daysFromNow(5),
    },
  });
  console.log('✅  Tickets: 5 tickets (1 completed, 2 open, 1 assigned, 1 in-progress)');

  // ══════════════════════════════════════════════════════════════════════
  // EXPENSES
  // ══════════════════════════════════════════════════════════════════════
  const expenses = [
    { propertyId: prop1.id, category: 'Maintenance', description: 'Plumbing repair — MH-1401 kitchen sink', amount: 850, date: daysAgo(5) },
    { propertyId: prop2.id, category: 'AC Service', description: 'Annual AC service contract — Downtown Palms building', amount: 4500, date: monthsAgo(2) },
    { propertyId: prop3.id, category: 'Landscaping', description: 'Garden maintenance — JVC Gardens quarterly', amount: 1200, date: monthsAgo(1) },
    { propertyId: prop1.id, category: 'Insurance', description: 'Building insurance premium — Marina Heights', amount: 18000, date: monthsAgo(3) },
    { propertyId: prop3.id, category: 'Repairs', description: 'Move-out repairs — JVC-V1 after James Okafor', amount: 2800, date: daysAgo(3) },
  ];
  for (const e of expenses) {
    const exists = await prisma.expense.findFirst({ where: { workspaceId: workspace.id, description: e.description } });
    if (!exists) {
      await prisma.expense.create({
        data: { workspaceId: workspace.id, propertyId: e.propertyId, category: e.category, description: e.description, amount: e.amount, currencyCode: 'AED', expenseDate: e.date, createdBy: pmAdminUser.id, approvedBy: pmAdminUser.id, approvedAt: e.date },
      });
    }
  }
  console.log('✅  Expenses: 5 records across properties');

  // ══════════════════════════════════════════════════════════════════════
  // RERA INDEX CACHE
  // ══════════════════════════════════════════════════════════════════════
  const reraData = [
    { area: 'Dubai Marina', propertyType: 'STUDIO', bedroomCount: 0, minRent: 42000, maxRent: 65000, avgRent: 52000 },
    { area: 'Dubai Marina', propertyType: 'ONE_BR', bedroomCount: 1, minRent: 60000, maxRent: 90000, avgRent: 74000 },
    { area: 'Dubai Marina', propertyType: 'TWO_BR', bedroomCount: 2, minRent: 85000, maxRent: 130000, avgRent: 108000 },
    { area: 'Dubai Marina', propertyType: 'THREE_BR', bedroomCount: 3, minRent: 120000, maxRent: 185000, avgRent: 150000 },
    { area: 'Downtown Dubai', propertyType: 'STUDIO', bedroomCount: 0, minRent: 50000, maxRent: 75000, avgRent: 60000 },
    { area: 'Downtown Dubai', propertyType: 'ONE_BR', bedroomCount: 1, minRent: 75000, maxRent: 110000, avgRent: 92000 },
    { area: 'Downtown Dubai', propertyType: 'TWO_BR', bedroomCount: 2, minRent: 110000, maxRent: 165000, avgRent: 135000 },
    { area: 'Downtown Dubai', propertyType: 'THREE_BR', bedroomCount: 3, minRent: 160000, maxRent: 240000, avgRent: 195000 },
    { area: 'JVC', propertyType: 'STUDIO', bedroomCount: 0, minRent: 30000, maxRent: 48000, avgRent: 38000 },
    { area: 'JVC', propertyType: 'ONE_BR', bedroomCount: 1, minRent: 40000, maxRent: 60000, avgRent: 50000 },
    { area: 'JVC', propertyType: 'TWO_BR', bedroomCount: 2, minRent: 55000, maxRent: 85000, avgRent: 68000 },
    { area: 'JVC', propertyType: 'THREE_BR', bedroomCount: 3, minRent: 100000, maxRent: 150000, avgRent: 128000 },
    { area: 'Business Bay', propertyType: 'STUDIO', bedroomCount: 0, minRent: 38000, maxRent: 58000, avgRent: 47000 },
    { area: 'Business Bay', propertyType: 'ONE_BR', bedroomCount: 1, minRent: 55000, maxRent: 82000, avgRent: 68000 },
    { area: 'Business Bay', propertyType: 'TWO_BR', bedroomCount: 2, minRent: 80000, maxRent: 120000, avgRent: 99000 },
    { area: 'JBR', propertyType: 'ONE_BR', bedroomCount: 1, minRent: 65000, maxRent: 95000, avgRent: 80000 },
    { area: 'JBR', propertyType: 'TWO_BR', bedroomCount: 2, minRent: 95000, maxRent: 140000, avgRent: 116000 },
    { area: 'DIFC', propertyType: 'ONE_BR', bedroomCount: 1, minRent: 85000, maxRent: 120000, avgRent: 102000 },
  ];
  for (const d of reraData) {
    await prisma.reraIndexCache.upsert({
      where: { area_propertyType_bedroomCount: { area: d.area, propertyType: d.propertyType, bedroomCount: d.bedroomCount } },
      update: { minRent: d.minRent, maxRent: d.maxRent, avgRent: d.avgRent },
      create: { ...d, currency: 'AED', effectiveDate: new Date(), source: 'SEED' },
    });
  }
  console.log('✅  RERA index: 18 area/type combinations');

  // ══════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🎉  MANARA OS — DEMO SEED COMPLETE                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Workspace    Rocky Real Estate                               ║
╠═══════════════════════════════════════════════════════════════╣
║  LOGIN CREDENTIALS (OTP: 123456 for all)                      ║
║                                                               ║
║  PM Admin     +971 50 100 0002  (Ruqaiya Al Rashidi)          ║
║  PM Ops       +971 50 100 0003  (Omar Al Hashimi)             ║
║  Owner 1      +971 50 100 0010  (Khalifa Al Mansoori)         ║
║  Owner 2      +971 50 100 0011  (Fatima Al Nahyan) ← PMA 🔔  ║
║  Owner 3      +971 50 100 0012  (James Whitfield)             ║
║  Tenant 1     +971 50 100 0020  (Rajan Mehta) ← Commission 💰║
║  Tenant 2     +971 50 100 0021  (Nadia Al Farsi) ← Renewal ⚡║
║  Tenant 3     +971 50 100 0022  (Sarah Mitchell) ← Move-in 📦║
║  Tenant 4     +971 50 100 0023  (Faisal Al Zaabi) ← New lead ║
║  Tenant 5     +971 50 100 0024  (James Okafor) ← Move-out 🚚 ║
║  Tenant 6     +971 50 100 0025  (Priya Sharma) ← Screening ⏳║
║  Vendor 1     +971 50 100 0030  (QuickFix)                    ║
║  Vendor 2     +971 50 100 0031  (CoolBreeze)                  ║
╠═══════════════════════════════════════════════════════════════╣
║  WORKFLOW SCENARIOS READY                                     ║
║  ① Move-in PENDING     → /leases/[faisal lease]              ║
║  ② Move-in ONGOING     → /leases/[sarah lease]               ║
║  ③ Commission verify   → /leases/[rajan lease]               ║
║  ④ Lease renewal       → /leases (Nadia — 45d left)          ║
║  ⑤ Move-out settle     → /leases/[james lease]               ║
║  ⑥ PMA renewal         → /owners/[fatima]                    ║
║  Dashboard KPIs        → 4 overdue cheques, 3 open tickets   ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error('❌  Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
