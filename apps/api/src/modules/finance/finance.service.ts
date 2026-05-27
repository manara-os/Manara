import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChequeStatus, RentCollectionMethod } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  // ── Rent Collections ──────────────────────────────────────────────

  async getCollections(workspaceId: string, filters?: { leaseId?: string; month?: string; year?: number }) {
    return this.prisma.rentCollection.findMany({
      where: {
        workspaceId,
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
      },
      include: {
        lease: {
          include: {
            tenant: { select: { fullName: true, phone: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { collectedAt: 'desc' },
      take: 100,
    });
  }

  async recordCollection(workspaceId: string, dto: {
    leaseId: string;
    amount: number;
    collectedAt: Date;
    method: RentCollectionMethod;
    referenceNo?: string;
    periodStart?: Date;
    periodEnd?: Date;
    notes?: string;
  }) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: dto.leaseId, workspaceId },
      include: { tenant: true, unit: { include: { property: true } } },
    });
    if (!lease) throw new NotFoundException('Lease not found');

    const collectedAt = new Date(dto.collectedAt ?? new Date());
    const periodStart = dto.periodStart ? new Date(dto.periodStart) : new Date(lease.startDate);
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : new Date(lease.endDate);

    const collection = await this.prisma.rentCollection.create({
      data: {
        workspaceId,
        leaseId: dto.leaseId,
        tenantId: lease.tenantId,
        amount: dto.amount,
        collectedAt,
        periodStart,
        periodEnd,
        method: dto.method,
        referenceNo: dto.referenceNo,
        notes: dto.notes,
      },
    });

    await this.notificationsQueue.add('payment-received', {
      leaseId: dto.leaseId,
      amount: dto.amount,
      tenantId: lease.tenantId,
      workspaceId,
    });

    return collection;
  }

  // ── PDC Cheques ───────────────────────────────────────────────────

  async getCheques(workspaceId: string, filters?: { leaseId?: string; status?: ChequeStatus; dueMonth?: Date }) {
    return this.prisma.pdcCheque.findMany({
      where: {
        lease: { workspaceId },
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        lease: {
          include: {
            tenant: { select: { fullName: true, phone: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateChequeStatus(chequeId: string, status: ChequeStatus, bouncedReason?: string) {
    return this.prisma.pdcCheque.update({
      where: { id: chequeId },
      data: {
        status,
        ...(bouncedReason && { bouncedReason }),
        ...(status === ChequeStatus.CLEARED && { clearedAt: new Date() }),
      },
    });
  }

  async getOverdueRent(workspaceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.pdcCheque.findMany({
      where: {
        lease: { workspaceId, status: 'ACTIVE' },
        dueDate: { lt: today },
        status: ChequeStatus.PENDING,
      },
      include: {
        lease: {
          include: {
            tenant: { select: { id: true, fullName: true, phone: true, email: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  // ── Expenses ──────────────────────────────────────────────────────

  async getExpenses(workspaceId: string, filters?: { propertyId?: string; unitId?: string }) {
    return this.prisma.expense.findMany({
      where: {
        workspaceId,
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
        ...(filters?.unitId && { unitId: filters.unitId }),
      },
      orderBy: { expenseDate: 'desc' },
      take: 100,
    });
  }

  async createExpense(workspaceId: string, dto: {
    propertyId: string;
    unitId?: string;
    category: string;
    amount: number;
    expenseDate: Date;
    description?: string;
    vendorName?: string;
    invoiceNo?: string;
  }) {
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, workspaceId } });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.expense.create({ data: { workspaceId, ...dto } });
  }

  // ── Owner SOA ─────────────────────────────────────────────────────

  async getOwnerSoa(workspaceId: string, ownerId: string, period: string) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const owner = await this.prisma.owner.findFirst({ where: { id: ownerId, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');

    const soa = await this.prisma.ownerSoa.findFirst({
      where: { workspaceId, ownerId, periodStart: { gte: startDate }, periodEnd: { lte: endDate } },
    });

    if (soa) return soa;

    // Generate on-the-fly if not exists
    const properties = await this.prisma.property.findMany({
      where: { workspaceId, ownerId },
      include: {
        units: {
          include: {
            leases: {
              where: { startDate: { lte: endDate }, endDate: { gte: startDate } },
              include: { rentCollections: { where: { collectedAt: { gte: startDate, lte: endDate } } } },
            },
          },
        },
        expenses: { where: { expenseDate: { gte: startDate, lte: endDate } } },
      },
    });

    let totalRent = 0;
    let totalExpenses = 0;

    for (const property of properties) {
      for (const unit of property.units) {
        for (const lease of unit.leases) {
          totalRent += lease.rentCollections.reduce((sum, c) => sum + Number(c.amount), 0);
        }
      }
      totalExpenses += property.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    }

    const mgmtFee = totalRent * (owner.mgmtFeePct / 100);
    const netAmount = totalRent - totalExpenses - mgmtFee;

    return {
      ownerId,
      periodStart: startDate,
      periodEnd: endDate,
      totalRentCollected: totalRent,
      totalExpenses,
      mgmtFee,
      netAmount,
      currencyCode: 'AED',
      properties,
    };
  }

  // ── Commissions ───────────────────────────────────────────────────

  async listCommissions(workspaceId: string, filters?: { status?: string; leaseId?: string }) {
    return this.prisma.commission.findMany({
      where: {
        workspaceId,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
      },
      include: {
        lease: {
          include: {
            tenant: { select: { fullName: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Dashboard Summary ──────────────────────────────────────────────

  async getDashboardSummary(workspaceId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [revenueMtd, overdueCheques, totalUnits, vacantUnits] = await Promise.all([
      this.prisma.rentCollection.aggregate({
        where: { workspaceId, collectedAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.pdcCheque.findMany({
        where: {
          lease: { workspaceId, status: 'ACTIVE' },
          dueDate: { lt: now },
          status: ChequeStatus.PENDING,
        },
        select: { amount: true },
      }),
      this.prisma.unit.count({ where: { workspaceId } }),
      this.prisma.unit.count({ where: { workspaceId, occupancyStatus: 'VACANT' } }),
    ]);

    const overdueAmount = overdueCheques.reduce((sum, c) => sum + Number(c.amount), 0);
    const occupancyRate = totalUnits > 0 ? ((totalUnits - vacantUnits) / totalUnits) * 100 : 0;

    return {
      revenueMtd: revenueMtd._sum.amount ?? 0,
      overdueAmount,
      overdueCount: overdueCheques.length,
      totalUnits,
      vacantUnits,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
    };
  }

  // ─── Accounting upgrade ────────────────────────────────────────────
  // Synthesises a GL + chart of accounts + trust accounts + VAT report
  // from existing rentCollection / expense / commission data.
  // A future migration can replace this with proper JournalEntry rows.

  private readonly VAT_RATE = 0.05; // UAE 5%

  async getChartOfAccounts(workspaceId: string) {
    // Static UAE PM chart of accounts. Real workspaces would let admins edit this.
    const accounts = [
      // Assets
      { code: '1010', name: 'Cash – Operating',         type: 'ASSET',     subtype: 'CURRENT_ASSET', balance: 0 },
      { code: '1020', name: 'Cash – Trust',             type: 'ASSET',     subtype: 'TRUST',         balance: 0 },
      { code: '1030', name: 'PDC Cheques on hand',      type: 'ASSET',     subtype: 'CURRENT_ASSET', balance: 0 },
      { code: '1100', name: 'Rent receivable',          type: 'ASSET',     subtype: 'AR',            balance: 0 },
      // Liabilities
      { code: '2010', name: 'Tenant security deposits', type: 'LIABILITY', subtype: 'CURRENT_LIAB',  balance: 0 },
      { code: '2020', name: 'Owner payable (trust)',    type: 'LIABILITY', subtype: 'TRUST_LIAB',    balance: 0 },
      { code: '2030', name: 'VAT payable',              type: 'LIABILITY', subtype: 'TAX',           balance: 0 },
      // Income
      { code: '4010', name: 'Management fee income',    type: 'INCOME',    subtype: 'OPERATING',     balance: 0 },
      { code: '4020', name: 'Leasing commission income',type: 'INCOME',    subtype: 'OPERATING',     balance: 0 },
      { code: '4030', name: 'Renewal fee income',       type: 'INCOME',    subtype: 'OPERATING',     balance: 0 },
      { code: '4040', name: 'Late fee income',          type: 'INCOME',    subtype: 'OPERATING',     balance: 0 },
      // Expenses
      { code: '5010', name: 'Maintenance & repairs',    type: 'EXPENSE',   subtype: 'OPERATING',     balance: 0 },
      { code: '5020', name: 'Vendor payments',          type: 'EXPENSE',   subtype: 'OPERATING',     balance: 0 },
      { code: '5030', name: 'Marketing & listings',     type: 'EXPENSE',   subtype: 'OPERATING',     balance: 0 },
      { code: '5040', name: 'Office & admin',           type: 'EXPENSE',   subtype: 'OPERATING',     balance: 0 },
    ];

    // Compute live balances from rent collections + expenses
    const [collections, expenses, cheques] = await Promise.all([
      this.prisma.rentCollection.findMany({
        where: { workspaceId },
        select: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: { workspaceId },
        select: { amount: true, category: true },
      }),
      this.prisma.pdcCheque.findMany({
        where: { lease: { workspaceId }, status: 'PENDING' },
        select: { amount: true },
      }),
    ]);

    const totalRent = collections.reduce((s, c) => s + Number(c.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalPdcOnHand = cheques.reduce((s, c) => s + Number(c.amount), 0);

    // Cash & trust split — 5% mgmt fee retained, rest is owner-payable
    const mgmtFee = totalRent * 0.05;
    const ownerPayable = totalRent * 0.95;
    const vatPayable = mgmtFee * this.VAT_RATE;

    const byCode: Record<string, number> = {
      '1010': mgmtFee,
      '1020': ownerPayable,
      '1030': totalPdcOnHand,
      '2020': ownerPayable,
      '2030': vatPayable,
      '4010': mgmtFee,
      '4020': 0,
      '5010': expenses.filter(e => /maintenance|repair/i.test(e.category)).reduce((s, e) => s + Number(e.amount), 0),
      '5020': expenses.filter(e => /vendor|plumb|electric|hvac/i.test(e.category)).reduce((s, e) => s + Number(e.amount), 0),
      '5040': totalExpenses - (expenses.filter(e => /maintenance|repair|vendor|plumb|electric|hvac/i.test(e.category)).reduce((s, e) => s + Number(e.amount), 0)),
    };

    return accounts.map(a => ({ ...a, balance: Math.round(byCode[a.code] ?? 0) }));
  }

  async getJournalEntries(workspaceId: string, limit = 50) {
    // Synthesise journal entries from existing rent collections + expenses
    const [collections, expenses] = await Promise.all([
      this.prisma.rentCollection.findMany({
        where: { workspaceId },
        include: { lease: { include: { tenant: { select: { fullName: true } }, unit: { select: { unitNumber: true } } } } },
        orderBy: { collectedAt: 'desc' },
        take: limit,
      }),
      this.prisma.expense.findMany({
        where: { workspaceId },
        orderBy: { expenseDate: 'desc' },
        take: limit,
      }),
    ]);

    const entries: any[] = [];

    for (const c of collections) {
      const amt = Number(c.amount);
      const mgmt = Math.round(amt * 0.05);
      const ownerShare = amt - mgmt;
      entries.push({
        id: `JE-RC-${c.id}`,
        date: c.collectedAt,
        ref: `RC-${c.id.slice(0, 8)}`,
        description: `Rent collected — ${c.lease?.tenant?.fullName ?? 'tenant'} · ${c.lease?.unit?.unitNumber ?? '—'}`,
        lines: [
          { account: '1020', accountName: 'Cash – Trust',           debit: ownerShare, credit: 0 },
          { account: '1010', accountName: 'Cash – Operating',       debit: mgmt,        credit: 0 },
          { account: '2020', accountName: 'Owner payable (trust)',  debit: 0,          credit: ownerShare },
          { account: '4010', accountName: 'Management fee income',  debit: 0,          credit: mgmt },
        ],
        total: amt,
      });
    }

    for (const e of expenses) {
      const amt = Number(e.amount);
      const isMaint = /maintenance|repair/i.test(e.category);
      const account = isMaint ? '5010' : /vendor|plumb|electric|hvac/i.test(e.category) ? '5020' : '5040';
      const accountName = isMaint ? 'Maintenance & repairs' : account === '5020' ? 'Vendor payments' : 'Office & admin';
      entries.push({
        id: `JE-EX-${e.id}`,
        date: e.expenseDate,
        ref: `EX-${e.id.slice(0, 8)}`,
        description: `${e.category} — ${e.description ?? '—'}`,
        lines: [
          { account, accountName, debit: amt, credit: 0 },
          { account: '1010', accountName: 'Cash – Operating', debit: 0, credit: amt },
        ],
        total: amt,
      });
    }

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries.slice(0, limit);
  }

  async getTrustAccounts(workspaceId: string) {
    const owners = await this.prisma.owner.findMany({
      where: { workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: 'ACTIVE' },
                  include: { rentCollections: { select: { amount: true, collectedAt: true } } },
                },
              },
            },
          },
        },
      },
    });

    return owners.map(o => {
      const allCollections = o.properties.flatMap(p =>
        p.units.flatMap(u => u.leases.flatMap(l => l.rentCollections)),
      );
      const gross = allCollections.reduce((s, c) => s + Number(c.amount), 0);
      const mgmtFeePct = Number(o.mgmtFeePct ?? 5) / 100;
      const mgmtFee = gross * mgmtFeePct;
      const owedToOwner = gross - mgmtFee;
      const lastTxn = allCollections.length > 0
        ? allCollections.reduce((latest, c) => c.collectedAt > latest ? c.collectedAt : latest, new Date(0))
        : null;
      return {
        ownerId: o.id,
        ownerName: o.fullName,
        properties: o.properties.length,
        units: o.properties.reduce((s, p) => s + p.units.length, 0),
        grossCollected: Math.round(gross),
        mgmtFeePct: Number(o.mgmtFeePct ?? 5),
        mgmtFeeRetained: Math.round(mgmtFee),
        balanceOwed: Math.round(owedToOwner),
        currency: 'AED',
        lastTransactionAt: lastTxn,
      };
    });
  }

  async getVatReport(workspaceId: string, year: number, quarter?: number) {
    const startMonth = quarter ? (quarter - 1) * 3 : 0;
    const endMonth = quarter ? quarter * 3 : 12;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, endMonth, 0, 23, 59, 59);

    const collections = await this.prisma.rentCollection.findMany({
      where: { workspaceId, collectedAt: { gte: start, lte: end } },
      select: { amount: true, collectedAt: true },
    });

    const totalRent = collections.reduce((s, c) => s + Number(c.amount), 0);
    const mgmtFee = totalRent * 0.05;
    const vatOnMgmtFee = mgmtFee * this.VAT_RATE;

    // By month inside the period
    const byMonth: Record<string, { rent: number; mgmt: number; vat: number }> = {};
    for (const c of collections) {
      const k = new Date(c.collectedAt).toLocaleDateString('en-AE', { month: 'short', year: 'numeric' });
      if (!byMonth[k]) byMonth[k] = { rent: 0, mgmt: 0, vat: 0 };
      const r = Number(c.amount);
      byMonth[k].rent += r;
      byMonth[k].mgmt += r * 0.05;
      byMonth[k].vat += r * 0.05 * this.VAT_RATE;
    }

    return {
      period: { year, quarter: quarter ?? null, start, end },
      vatRate: this.VAT_RATE,
      trn: 'TRN-100123456700003', // Stub — real workspace settings would have this
      totals: {
        rentCollected: Math.round(totalRent),
        managementFee: Math.round(mgmtFee),
        vatOnMgmtFee: Math.round(vatOnMgmtFee),
        outputVat: Math.round(vatOnMgmtFee),  // VAT collected from clients
        inputVat: 0,                            // VAT paid to suppliers (would track from expenses with VAT flag)
        netVatPayable: Math.round(vatOnMgmtFee),
      },
      byMonth: Object.entries(byMonth).map(([month, vals]) => ({
        month,
        rent: Math.round(vals.rent),
        mgmt: Math.round(vals.mgmt),
        vat: Math.round(vals.vat),
      })),
    };
  }
}
