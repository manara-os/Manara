// Extra seed data using Prisma
import { PrismaClient } from './node_modules/.prisma/client/default.js';

const prisma = new PrismaClient();

const WS = 'b7f2928e-23b1-48cb-8031-93e838b7fd09';
const PROPERTY_ID = '00000000-0000-0000-0000-000000000001';
const LEASE1 = '00000000-0000-0000-0001-000000000001'; // Hassan Mirza
const LEASE2 = '00000000-0000-0000-0001-000000000002'; // Fatima Noor
const TENANT1 = '26e3d2e6-9a8c-46f4-84eb-c162f2cb5060'; // Hassan Mirza
const UNIT1 = 'ae878bdf-d7f2-498e-830a-39c0eb9fe6b9'; // Villa-1
const UNIT2 = 'b8cbb85b-c302-4b6f-8aac-c0aa99df59ee'; // Villa-2
const VENDOR_ID = '9a4446e9-1c88-4428-86e1-5079b436134d'; // QuickClean
const USER_ID = '48ed199a-25da-4c6e-a4fa-f3453133c75f'; // Ruqaiya (PM Admin)

function randomUUID() {
  return crypto.randomUUID();
}

async function run() {
  console.log('Starting seed...');

  // Get tenant2 ID
  const tenant2 = await prisma.tenant.findFirst({ where: { workspaceId: WS, fullName: { contains: 'Fatima' } } });
  const TENANT2 = tenant2?.id;
  console.log('Tenant 2:', TENANT2);

  // ─── PDC Cheques ──────────────────────────────────────────────────
  await prisma.pdcCheque.deleteMany({ where: { lease: { workspaceId: WS } } });

  const allCheques = [];

  // Hassan Mirza: AED 6,200/mo x 12 months 2024
  for (let i = 0; i < 12; i++) {
    const dueDate = new Date(2024, i, 5);
    const status = dueDate < new Date() ? 'CLEARED' : 'PENDING';
    allCheques.push({
      id: randomUUID(),
      workspaceId: WS,
      leaseId: LEASE1,
      chequeSeq: i + 1,
      chequeNumber: `CHQ-HM-${String(i + 1).padStart(3, '0')}`,
      bankName: 'Emirates NBD',
      amount: 6200,
      dueDate,
      status,
      clearedAt: status === 'CLEARED' ? new Date(dueDate.getTime() + 2 * 86400 * 1000) : null,
    });
  }

  // Fatima Noor: AED 7,800/mo x 12 months 2024
  for (let i = 0; i < 12; i++) {
    const dueDate = new Date(2024, i, 1);
    const status = dueDate < new Date() ? 'CLEARED' : 'PENDING';
    allCheques.push({
      id: randomUUID(),
      workspaceId: WS,
      leaseId: LEASE2,
      chequeSeq: i + 1,
      chequeNumber: `CHQ-FN-${String(i + 1).padStart(3, '0')}`,
      bankName: 'Abu Dhabi Commercial Bank',
      amount: 7800,
      dueDate,
      status,
      clearedAt: status === 'CLEARED' ? new Date(dueDate.getTime() + 1 * 86400 * 1000) : null,
    });
  }

  for (const c of allCheques) {
    await prisma.pdcCheque.create({ data: c });
  }
  console.log(`Created ${allCheques.length} PDC cheques`);

  // ─── Expenses ──────────────────────────────────────────────────────
  await prisma.expense.deleteMany({ where: { workspaceId: WS } });

  const expenses = [
    { category: 'MAINTENANCE', amount: 850, expenseDate: new Date('2026-04-15'), description: 'AC Filter Replacement - All Villas', notes: 'Vendor: Cool Air Services | INV-2026-041' },
    { category: 'UTILITIES', amount: 2400, expenseDate: new Date('2026-04-01'), description: 'Common Area Electricity - April', notes: 'Vendor: DEWA | DEWA-APR-2026' },
    { category: 'MAINTENANCE', amount: 1200, expenseDate: new Date('2026-03-20'), description: 'Swimming Pool Cleaning & Chemicals', notes: 'Vendor: AquaClear LLC | INV-2026-031' },
    { category: 'MANAGEMENT', amount: 700, expenseDate: new Date('2026-03-01'), description: 'Property Management Fee - March', notes: 'MGMT-MAR-2026' },
    { category: 'INSURANCE', amount: 3600, expenseDate: new Date('2026-01-15'), description: 'Annual Property Insurance Premium', notes: 'Vendor: AXA Insurance UAE | AXA-2026-001' },
    { category: 'MAINTENANCE', amount: 450, expenseDate: new Date('2026-02-10'), description: 'Gate & Intercom Repair', notes: 'Vendor: Gulf Security Systems | GSS-2026-012' },
    { category: 'LANDSCAPING', amount: 1800, expenseDate: new Date('2026-02-28'), description: 'Quarterly Garden Maintenance', notes: 'Vendor: Green Thumb Gardens | GTG-Q1-2026' },
    { category: 'UTILITIES', amount: 2600, expenseDate: new Date('2026-03-01'), description: 'Common Area Electricity - March', notes: 'Vendor: DEWA | DEWA-MAR-2026' },
    { category: 'MAINTENANCE', amount: 320, expenseDate: new Date('2026-01-25'), description: 'Plumbing Repair - Villa 3', notes: 'Vendor: Fix-It Plumbing LLC | FIP-2026-003' },
    { category: 'MANAGEMENT', amount: 700, expenseDate: new Date('2026-04-01'), description: 'Property Management Fee - April', notes: 'MGMT-APR-2026' },
  ];

  for (const e of expenses) {
    await prisma.expense.create({
      data: { id: randomUUID(), workspaceId: WS, propertyId: PROPERTY_ID, createdBy: USER_ID, ...e }
    });
  }
  console.log(`Created ${expenses.length} expenses`);

  // ─── Additional Tickets ──────────────────────────────────────────
  const existingTickets = await prisma.ticket.findMany({ where: { workspaceId: WS }, select: { ticketRef: true } });
  const existingRefs = new Set(existingTickets.map(t => t.ticketRef));

  const newTickets = [
    { ref: 'TKT-2026-0002', unit: UNIT2, tenant: TENANT2, cat: 'PLUMBING', pri: 'HIGH', status: 'OPEN', title: 'Bathroom tap leaking in master bedroom', desc: 'Constant drip from tap in master bathroom' },
    { ref: 'TKT-2026-0003', unit: UNIT1, tenant: TENANT1, cat: 'ELECTRICAL', pri: 'MEDIUM', status: 'IN_PROGRESS', title: 'Flickering lights in living room', desc: 'Living room light flickers intermittently', vendor: VENDOR_ID },
    { ref: 'TKT-2026-0004', unit: UNIT2, tenant: TENANT2, cat: 'AC_HVAC', pri: 'HIGH', status: 'ASSIGNED', title: 'AC not cooling properly in bedroom', desc: 'Bedroom AC running but not reaching set temperature', vendor: VENDOR_ID },
    { ref: 'TKT-2025-0010', unit: UNIT1, tenant: TENANT1, cat: 'PAINTING', pri: 'LOW', status: 'COMPLETED', title: 'Wall paint peeling near window', desc: 'Paint peeling around entrance window frame', completedAt: new Date('2026-03-15') },
    { ref: 'TKT-2025-0009', unit: UNIT2, tenant: TENANT2, cat: 'CLEANING', pri: 'LOW', status: 'CLOSED', title: 'Deep cleaning required before move-in', desc: 'Pre-tenancy deep cleaning of entire villa', closedAt: new Date('2024-01-28') },
  ];

  let created = 0;
  for (const t of newTickets) {
    if (existingRefs.has(t.ref)) continue;
    const slaHours = t.pri === 'HIGH' ? 24 : t.pri === 'MEDIUM' ? 48 : 72;
    await prisma.ticket.create({
      data: {
        id: randomUUID(),
        workspaceId: WS,
        ticketRef: t.ref,
        unitId: t.unit,
        raisedByTenantId: t.tenant,
        assignedVendorId: t.vendor || null,
        category: t.cat,
        priority: t.pri,
        status: t.status,
        title: t.title,
        description: t.desc,
        slaHours,
        slaDueAt: new Date(Date.now() + slaHours * 3600 * 1000),
        completedAt: t.completedAt || null,
        closedAt: t.closedAt || null,
        createdAt: new Date(Date.now() - 7 * 86400 * 1000),
      }
    });
    created++;
  }
  console.log(`Created ${created} additional tickets`);

  await prisma.$disconnect();
  console.log('Seed complete!');
}

run().catch(e => { console.error(e); process.exit(1); });
