// Extra seed data: PDC cheques, expenses, tickets
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://manara:manara_dev_pass@localhost:5432/manara_os',
});

const WS = 'b7f2928e-23b1-48cb-8031-93e838b7fd09';
const PROPERTY_ID = '00000000-0000-0000-0000-000000000001';
const LEASE1 = '00000000-0000-0000-0001-000000000001'; // Hassan Mirza, Villa-1
const LEASE2 = '00000000-0000-0000-0001-000000000002'; // Fatima Noor, Villa-2
const TENANT1 = '26e3d2e6-9a8c-46f4-84eb-c162f2cb5060'; // Hassan Mirza
const TENANT2 = '7a4e1e85-d521-4dc6-8b91-3b19a77a0d3f'; // Fatima Noor
const UNIT1 = 'ae878bdf-d7f2-498e-830a-39c0eb9fe6b9'; // Villa-1
const UNIT2 = 'b8cbb85b-c302-4b6f-8aac-c0aa99df59ee'; // Villa-2
const VENDOR_ID = '9a4446e9-1c88-4428-86e1-5079b436134d'; // QuickClean Pest Control
const { v4: uuidv4 } = require('crypto');

function uuid() {
  return require('crypto').randomUUID();
}

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  // Clear existing PDC cheques and expenses first to avoid duplicates
  await client.query(`DELETE FROM pdc_cheques WHERE workspace_id = $1`, [WS]);
  await client.query(`DELETE FROM expenses WHERE workspace_id = $1`, [WS]);
  await client.query(`DELETE FROM tickets WHERE workspace_id = $1 AND ticket_ref != 'TKT-DEMO-001'`);

  // ─── PDC Cheques for Hassan Mirza (Lease 1) ──────────────────────
  // Monthly rent: AED 6,200/mo (74,400/12 = 6,200)
  const hassanCheques = [];
  for (let i = 0; i < 12; i++) {
    const dueDate = new Date(2024, i, 5); // 5th of each month
    const status = dueDate < new Date() ? 'CLEARED' : 'PENDING';
    const clearedAt = status === 'CLEARED' ? new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000) : null;
    hassanCheques.push({
      id: uuid(),
      lease_id: LEASE1,
      cheque_number: `CHQ-HM-${String(i + 1).padStart(3, '0')}`,
      bank_name: 'Emirates NBD',
      amount: 6200.00,
      due_date: dueDate.toISOString().split('T')[0],
      status,
      cleared_at: clearedAt,
    });
  }

  // PDC Cheques for Fatima Noor (Lease 2)
  // Monthly rent: AED 7,800/mo (93,600/12 = 7,800)
  const fatimaCheques = [];
  for (let i = 0; i < 12; i++) {
    const dueDate = new Date(2024, i, 1); // 1st of each month
    const status = dueDate < new Date() ? 'CLEARED' : 'PENDING';
    const clearedAt = status === 'CLEARED' ? new Date(dueDate.getTime() + 1 * 24 * 60 * 60 * 1000) : null;
    fatimaCheques.push({
      id: uuid(),
      lease_id: LEASE2,
      cheque_number: `CHQ-FN-${String(i + 1).padStart(3, '0')}`,
      bank_name: 'Abu Dhabi Commercial Bank',
      amount: 7800.00,
      due_date: dueDate.toISOString().split('T')[0],
      status,
      cleared_at: clearedAt,
    });
  }

  // Insert all cheques
  for (const c of [...hassanCheques, ...fatimaCheques]) {
    await client.query(`
      INSERT INTO pdc_cheques (id, lease_id, cheque_number, bank_name, amount, due_date, status, cleared_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [c.id, c.lease_id, c.cheque_number, c.bank_name, c.amount, c.due_date, c.status, c.cleared_at]);
  }
  console.log(`Created ${hassanCheques.length + fatimaCheques.length} PDC cheques`);

  // ─── Expenses ──────────────────────────────────────────────────────
  const expenses = [
    { id: uuid(), category: 'MAINTENANCE', amount: 850.00, date: '2026-04-15', desc: 'AC Filter Replacement - All Villas', vendor: 'Cool Air Services', invoice: 'INV-2026-041' },
    { id: uuid(), category: 'UTILITIES', amount: 2400.00, date: '2026-04-01', desc: 'Common Area Electricity - April', vendor: 'DEWA', invoice: 'DEWA-APR-2026' },
    { id: uuid(), category: 'MAINTENANCE', amount: 1200.00, date: '2026-03-20', desc: 'Swimming Pool Cleaning & Chemicals', vendor: 'AquaClear LLC', invoice: 'INV-2026-031' },
    { id: uuid(), category: 'MANAGEMENT', amount: 700.00, date: '2026-03-01', desc: 'Property Management Fee - March', vendor: 'Rocky Real Estate', invoice: 'MGMT-MAR-2026' },
    { id: uuid(), category: 'INSURANCE', amount: 3600.00, date: '2026-01-15', desc: 'Annual Property Insurance Premium', vendor: 'AXA Insurance UAE', invoice: 'AXA-2026-001' },
    { id: uuid(), category: 'MAINTENANCE', amount: 450.00, date: '2026-02-10', desc: 'Gate & Intercom Repair', vendor: 'Gulf Security Systems', invoice: 'GSS-2026-012' },
    { id: uuid(), category: 'LANDSCAPING', amount: 1800.00, date: '2026-02-28', desc: 'Quarterly Garden Maintenance', vendor: 'Green Thumb Gardens', invoice: 'GTG-Q1-2026' },
    { id: uuid(), category: 'UTILITIES', amount: 2600.00, date: '2026-03-01', desc: 'Common Area Electricity - March', vendor: 'DEWA', invoice: 'DEWA-MAR-2026' },
    { id: uuid(), category: 'MAINTENANCE', amount: 320.00, date: '2026-01-25', desc: 'Plumbing Repair - Villa 3', vendor: 'Fix-It Plumbing LLC', invoice: 'FIP-2026-003' },
    { id: uuid(), category: 'MANAGEMENT', amount: 700.00, date: '2026-04-01', desc: 'Property Management Fee - April', vendor: 'Rocky Real Estate', invoice: 'MGMT-APR-2026' },
  ];

  for (const e of expenses) {
    await client.query(`
      INSERT INTO expenses (id, workspace_id, property_id, category, amount, expense_date, description, vendor_name, invoice_no, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [e.id, WS, PROPERTY_ID, e.category, e.amount, e.date, e.desc, e.vendor, e.invoice]);
  }
  console.log(`Created ${expenses.length} expenses`);

  // ─── Additional Maintenance Tickets ─────────────────────────────
  const tickets = [
    { ref: 'TKT-2026-0002', unit: UNIT2, tenant: TENANT2, cat: 'PLUMBING', pri: 'HIGH', status: 'OPEN', title: 'Bathroom tap leaking in master bedroom', desc: 'Constant drip from the tap in master bathroom' },
    { ref: 'TKT-2026-0003', unit: UNIT1, tenant: TENANT1, cat: 'ELECTRICAL', pri: 'MEDIUM', status: 'IN_PROGRESS', title: 'Flickering lights in living room', desc: 'Living room light flickers intermittently' },
    { ref: 'TKT-2026-0004', unit: UNIT2, tenant: TENANT2, cat: 'AC_HVAC', pri: 'HIGH', status: 'ASSIGNED', title: 'AC not cooling properly in bedroom', desc: 'Bedroom AC running but not reaching set temperature' },
    { ref: 'TKT-2025-0010', unit: UNIT1, tenant: TENANT1, cat: 'PAINTING', pri: 'LOW', status: 'COMPLETED', title: 'Wall paint peeling near window', desc: 'Paint peeling around the main entrance window frame', completed_at: new Date('2026-03-15') },
    { ref: 'TKT-2025-0009', unit: UNIT2, tenant: TENANT2, cat: 'CLEANING', pri: 'LOW', status: 'CLOSED', title: 'Deep cleaning required before move-in', desc: 'Pre-tenancy deep cleaning of entire villa', closed_at: new Date('2024-01-28') },
  ];

  let ticketCount = 0;
  const existingRefs = await client.query(`SELECT ticket_ref FROM tickets WHERE workspace_id = $1`, [WS]);
  const existingRefSet = new Set(existingRefs.rows.map(r => r.ticket_ref));

  for (const t of tickets) {
    if (existingRefSet.has(t.ref)) continue;
    const slaHours = t.pri === 'HIGH' ? 24 : t.pri === 'MEDIUM' ? 48 : 72;
    const slaDue = new Date(Date.now() + slaHours * 3600 * 1000);
    await client.query(`
      INSERT INTO tickets (id, workspace_id, ticket_ref, unit_id, raised_by_tenant_id, assigned_vendor_id, category, priority, status, title, description, sla_hours, sla_due_at, completed_at, closed_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW() - INTERVAL '7 days', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [
      uuid(), WS, t.ref, t.unit, t.tenant,
      (t.status === 'ASSIGNED' ? VENDOR_ID : null),
      t.cat, t.pri, t.status, t.title, t.desc,
      slaHours, slaDue,
      t.completed_at || null,
      t.closed_at || null,
    ]);
    ticketCount++;
  }
  console.log(`Created ${ticketCount} additional tickets`);

  await client.end();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
