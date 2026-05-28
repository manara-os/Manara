import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: { kycVerified?: boolean; search?: string }) {
    return this.prisma.owner.findMany({
      where: {
        workspaceId,
        ...(filters?.kycVerified !== undefined && { kycVerified: filters.kycVerified }),
        ...(filters?.search && {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
          ],
        }),
      },
      include: {
        _count: { select: { properties: true } },
        properties: {
          include: {
            units: { select: { id: true, occupancyStatus: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findMe(workspaceId: string, userId: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { workspaceId, user: { id: userId } },
      select: {
        id: true, fullName: true, email: true, phone: true,
        pmaStatus: true, pmaRenewalAlertSentAt: true,
        kycVerified: true, mgmtFeePct: true,
      },
    });
    if (!owner) throw new NotFoundException('Owner profile not found');
    return owner;
  }

  async findOne(workspaceId: string, id: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              select: {
                id: true, unitNumber: true, type: true, occupancyStatus: true, annualRent: true,
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');
    return owner;
  }

  async create(workspaceId: string, dto: {
    phone: string;
    fullName: string;
    email?: string;
    nationality?: string;
    kycType?: string;
    emiratesId?: string;
    passportNo?: string;
    mgmtFeePct?: number;
    pmaSignedDate?: Date;
    pmaExpiryDate?: Date;
  }) {
    // Find or create the user record by phone
    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone, fullName: dto.fullName, email: dto.email, phoneVerified: false, isActive: true },
      });
    }

    const existing = await this.prisma.owner.findFirst({ where: { userId: user.id } });
    if (existing) throw new ConflictException('An owner with this phone number already exists');

    // Add to workspace as OWNER role
    await this.prisma.workspaceUser.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: {},
      create: { workspaceId, userId: user.id, role: UserRole.OWNER },
    });

    const { phone, ...rest } = dto;
    return this.prisma.owner.create({
      data: { ...rest, phone, userId: user.id, workspaceId, kycVerified: false },
    });
  }

  async update(workspaceId: string, id: string, dto: any) {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({ where: { id }, data: dto });
  }

  async verifyKyc(workspaceId: string, id: string) {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({
      where: { id },
      data: { kycVerified: true, kycVerifiedAt: new Date() },
    });
  }

  async updatePmaStatus(workspaceId: string, id: string, status: 'ACTIVE' | 'PENDING_RENEWAL' | 'TERMINATED') {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({
      where: { id },
      data: { pmaStatus: status },
    });
  }

  async triggerPmaRenewal(workspaceId: string, id: string) {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({
      where: { id },
      data: { pmaStatus: 'PENDING_RENEWAL', pmaRenewalAlertSentAt: new Date() },
    });
  }

  async getStatement(workspaceId: string, ownerId: string, startDate: Date, endDate: Date) {
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  include: {
                    tenant: { select: { fullName: true } },
                    rentCollections: {
                      where: { collectedAt: { gte: startDate, lte: endDate } },
                      orderBy: { collectedAt: 'asc' },
                    },
                    pdcCheques: {
                      where: { dueDate: { gte: startDate, lte: endDate } },
                      orderBy: { dueDate: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');

    const collections: any[] = [];
    const cheques: any[] = [];
    for (const prop of owner.properties) {
      for (const unit of prop.units) {
        for (const lease of unit.leases) {
          for (const c of lease.rentCollections) {
            collections.push({ ...c, unitNumber: unit.unitNumber, propertyName: prop.name, tenantName: lease.tenant.fullName });
          }
          for (const ch of lease.pdcCheques) {
            cheques.push({ ...ch, unitNumber: unit.unitNumber, propertyName: prop.name, tenantName: lease.tenant.fullName });
          }
        }
      }
    }

    const totalCollected = collections.reduce((s, c) => s + Number(c.amount), 0);
    const mgmtFee = totalCollected * (Number(owner.mgmtFeePct) / 100);

    return {
      owner: { fullName: owner.fullName, email: owner.email, phone: owner.phone, mgmtFeePct: owner.mgmtFeePct },
      period: { startDate, endDate },
      summary: { totalCollected, managementFee: mgmtFee, netOwnerPayout: totalCollected - mgmtFee, totalCheques: cheques.length },
      collections,
      cheques,
    };
  }

  async getPortfolio(workspaceId: string, ownerId: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: 'ACTIVE' },
                  include: { tenant: { select: { fullName: true, phone: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');

    const totalUnits = owner.properties.reduce((sum, p) => sum + p.units.length, 0);
    const occupiedUnits = owner.properties.reduce(
      (sum, p) => sum + p.units.filter(u => u.occupancyStatus === 'OCCUPIED').length, 0,
    );
    const totalAnnualRent = owner.properties.reduce(
      (sum, p) => sum + p.units.reduce((us, u) => us + Number(u.annualRent ?? 0), 0), 0,
    );

    return {
      owner,
      summary: {
        totalProperties: owner.properties.length,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0,
        totalAnnualRent,
        totalMonthlyRent: Math.round(totalAnnualRent / 12),
      },
    };
  }

  /**
   * Investor dashboard — per-property P&L from real rent collections and expenses
   * over the trailing 12 months. Replaces the synthetic sine-wave projections.
   */
  async getInvestorDashboard(workspaceId: string, ownerId: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: 'ACTIVE' },
                  select: { id: true, tenantId: true, annualRent: true, startDate: true, endDate: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');

    const now = new Date();
    const trailing12Start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const trailing24Start = new Date(now.getFullYear() - 1, now.getMonth() - 11, 1);
    const propertyIds = owner.properties.map(p => p.id);

    // Pull real rent collections grouped per (property, month) for last 24 months (for YoY)
    const [collections, expenses] = await Promise.all([
      this.prisma.rentCollection.findMany({
        where: {
          workspaceId,
          collectedAt: { gte: trailing24Start },
          lease: { unit: { propertyId: { in: propertyIds } } },
        },
        select: {
          amount: true,
          collectedAt: true,
          lease: { select: { unit: { select: { propertyId: true } } } },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          workspaceId,
          expenseDate: { gte: trailing24Start },
          propertyId: { in: propertyIds },
        },
        select: { amount: true, expenseDate: true, propertyId: true, category: true },
      }),
    ]);

    // Per-property totals for trailing 12 months
    const perPropertyRevenue = new Map<string, number>();
    const perPropertyExpenses = new Map<string, number>();
    for (const c of collections) {
      if (c.collectedAt < trailing12Start) continue;
      const pid = c.lease?.unit?.propertyId ?? '';
      perPropertyRevenue.set(pid, (perPropertyRevenue.get(pid) ?? 0) + Number(c.amount));
    }
    for (const e of expenses) {
      if (e.expenseDate < trailing12Start || !e.propertyId) continue;
      perPropertyExpenses.set(e.propertyId, (perPropertyExpenses.get(e.propertyId) ?? 0) + Number(e.amount));
    }

    const rows = owner.properties.map(p => {
      const units = p.units ?? [];
      const occupied = units.filter(u => u.occupancyStatus === 'OCCUPIED').length;
      const occupancy = units.length ? Math.round((occupied / units.length) * 100) : 0;
      const annualRentRoll = units.reduce((s, u) => s + Number(u.annualRent ?? 0), 0);
      const trailing12Revenue = perPropertyRevenue.get(p.id) ?? 0;
      const trailing12Expenses = perPropertyExpenses.get(p.id) ?? 0;
      const netOperatingIncome = trailing12Revenue - trailing12Expenses;
      const propertyValueEstimate = annualRentRoll * 12; // 12× annual rent as a placeholder
      const noiYieldPct = propertyValueEstimate > 0 ? +(netOperatingIncome / propertyValueEstimate * 100).toFixed(2) : 0;

      return {
        id: p.id,
        name: p.name,
        area: p.area,
        city: p.city,
        totalUnits: units.length,
        occupiedUnits: occupied,
        occupancy,
        annualRentRoll,
        trailing12Revenue: Math.round(trailing12Revenue),
        trailing12Expenses: Math.round(trailing12Expenses),
        netOperatingIncome: Math.round(netOperatingIncome),
        propertyValueEstimate: Math.round(propertyValueEstimate),
        noiYieldPct,
      };
    });

    // Monthly P&L last 12 months (real)
    const monthly: { month: string; key: string; revenue: number; expenses: number; net: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - 10 + i, 1);
      const key = monthStart.toISOString().slice(0, 7);
      const revenue = collections
        .filter(c => c.collectedAt >= monthStart && c.collectedAt < monthEnd)
        .reduce((s, c) => s + Number(c.amount), 0);
      const exp = expenses
        .filter(e => e.expenseDate >= monthStart && e.expenseDate < monthEnd)
        .reduce((s, e) => s + Number(e.amount), 0);
      monthly.push({
        month: monthStart.toLocaleDateString('en-AE', { month: 'short', year: '2-digit' }),
        key,
        revenue: Math.round(revenue),
        expenses: Math.round(exp),
        net: Math.round(revenue - exp),
      });
    }

    // YoY quarterly (real)
    const yoy = [0, 1, 2, 3].map(q => {
      const qThisStart = new Date(now.getFullYear(), q * 3, 1);
      const qThisEnd = new Date(now.getFullYear(), (q + 1) * 3, 1);
      const qLastStart = new Date(now.getFullYear() - 1, q * 3, 1);
      const qLastEnd = new Date(now.getFullYear() - 1, (q + 1) * 3, 1);
      const sumIn = (xs: any[], startKey: 'collectedAt' | 'expenseDate', s: Date, e: Date) =>
        xs.filter(x => x[startKey] >= s && x[startKey] < e).reduce((sum, x) => sum + Number(x.amount), 0);
      return {
        quarter: `Q${q + 1}`,
        thisYear: Math.round(sumIn(collections, 'collectedAt', qThisStart, qThisEnd)),
        lastYear: Math.round(sumIn(collections, 'collectedAt', qLastStart, qLastEnd)),
      };
    });

    // Occupancy heat strip per property × month (real)
    // Whether any unit in that property was occupied at any time in month
    const heatStrip = owner.properties.map(p => {
      const monthsArr = monthly.map(m => {
        const monthStart = new Date(m.key + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        const occupiedUnits = (p.units ?? []).filter((u: any) => {
          // A unit is "occupied this month" if it has an ACTIVE lease that started before month-end
          return (u.leases ?? []).some((l: any) =>
            new Date(l.startDate) < monthEnd && (!l.endDate || new Date(l.endDate) >= monthStart)
          );
        }).length;
        const total = (p.units ?? []).length || 1;
        return { month: m.month, occupied: occupiedUnits, total, pct: Math.round((occupiedUnits / total) * 100) };
      });
      return { propertyId: p.id, name: p.name, months: monthsArr };
    });

    const totalRevenue = rows.reduce((s, r) => s + r.trailing12Revenue, 0);
    const totalExpenses = rows.reduce((s, r) => s + r.trailing12Expenses, 0);
    const totalNoi = totalRevenue - totalExpenses;
    const totalValue = rows.reduce((s, r) => s + r.propertyValueEstimate, 0);
    const portfolioYield = totalValue > 0 ? +(totalNoi / totalValue * 100).toFixed(2) : 0;
    const avgOccupancy = rows.length ? Math.round(rows.reduce((s, r) => s + r.occupancy, 0) / rows.length) : 0;

    return {
      ownerId: owner.id,
      portfolio: {
        totalProperties: rows.length,
        totalUnits: rows.reduce((s, r) => s + r.totalUnits, 0),
        avgOccupancy,
        trailing12Revenue: Math.round(totalRevenue),
        trailing12Expenses: Math.round(totalExpenses),
        netOperatingIncome: Math.round(totalNoi),
        propertyValueEstimate: Math.round(totalValue),
        portfolioYieldPct: portfolioYield,
      },
      properties: rows,
      monthly,
      yoy,
      heatStrip,
      asOf: now.toISOString(),
    };
  }

  /**
   * Market intel — for each unit in the owner's portfolio, compare current rent
   * against RERA Index Cache and across same-area/type peers in the workspace.
   * No client-side synthesis — every number comes from a real table.
   */
  async getMarketIntel(workspaceId: string, ownerId: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: { where: { status: 'ACTIVE' }, select: { annualRent: true }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');

    const propertyIds = owner.properties.map(p => p.id);

    // Pull RERA index entries for every area we have units in
    const areas = Array.from(new Set(owner.properties.map(p => p.area).filter(Boolean) as string[]));
    const reraIndex = areas.length
      ? await this.prisma.reraIndexCache.findMany({ where: { area: { in: areas } } })
      : [];
    const reraKey = (a: string, t: string, b: number | null) => `${a}|${t}|${b ?? 'null'}`;
    const reraMap = new Map<string, any>();
    for (const r of reraIndex) reraMap.set(reraKey(r.area, r.propertyType, r.bedroomCount), r);

    // Pull workspace-wide peer units (same area + type + bedrooms) for comparables
    const peerUnits = await this.prisma.unit.findMany({
      where: { workspaceId, annualRent: { not: null } },
      select: {
        id: true, unitNumber: true, annualRent: true, bedroomCount: true, type: true,
        property: { select: { id: true, name: true, area: true, type: true } },
      },
    });

    const results = owner.properties.flatMap(prop => {
      return (prop.units ?? []).map(unit => {
        const lease = (unit.leases ?? [])[0];
        const currentAnnualRent = Number(lease?.annualRent ?? unit.annualRent ?? 0);
        const propType = prop.type;
        const beds = unit.bedroomCount;

        // RERA lookup
        const rera = reraMap.get(reraKey(prop.area ?? '', propType, beds));
        const reraMin  = rera ? Number(rera.minRent) : null;
        const reraMax  = rera ? Number(rera.maxRent) : null;
        const reraAvg  = rera ? Number(rera.avgRent) : null;
        const vsReraPct = (reraAvg && currentAnnualRent)
          ? +(((currentAnnualRent - reraAvg) / reraAvg) * 100).toFixed(1)
          : null;

        // Peer comparables: same area + bedrooms (+/-1) + same property type
        const peers = peerUnits.filter(p =>
          p.property?.area === prop.area &&
          p.property?.type === propType &&
          (p.bedroomCount ?? -1) === (beds ?? -2) &&
          p.id !== unit.id
        ).slice(0, 5);

        return {
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          propertyId: prop.id,
          propertyName: prop.name,
          area: prop.area,
          propertyType: propType,
          bedroomCount: beds,
          currentAnnualRent,
          rera: rera ? {
            min: reraMin,
            avg: reraAvg,
            max: reraMax,
            vsAvgPct: vsReraPct,
            effectiveDate: rera.effectiveDate,
            source: rera.source,
            refreshedAt: rera.refreshedAt,
          } : null,
          peers: peers.map(p => ({
            unitId: p.id,
            unitNumber: p.unitNumber,
            propertyId: p.property?.id,
            propertyName: p.property?.name,
            annualRent: Number(p.annualRent ?? 0),
          })),
          recommendation:
            vsReraPct == null ? null :
            vsReraPct <= -8  ? 'BELOW_MARKET_RAISE' :
            vsReraPct <= -3  ? 'SLIGHTLY_BELOW' :
            vsReraPct >= 8   ? 'ABOVE_MARKET_HOLD' :
            'AT_MARKET',
        };
      });
    });

    // Aggregate insights
    const belowMarket = results.filter(r => r.rera?.vsAvgPct != null && r.rera.vsAvgPct < -3);
    const aboveMarket = results.filter(r => r.rera?.vsAvgPct != null && r.rera.vsAvgPct > 3);
    const upliftOpportunityAed = belowMarket.reduce((s, r) => {
      if (!r.rera?.avg || !r.currentAnnualRent) return s;
      const gap = r.rera.avg - r.currentAnnualRent;
      // Be conservative — cap at +20% per UAE RERA rules
      return s + Math.min(gap, r.currentAnnualRent * 0.20);
    }, 0);

    return {
      ownerId,
      units: results,
      insights: {
        belowMarketCount: belowMarket.length,
        atMarketCount: results.length - belowMarket.length - aboveMarket.length,
        aboveMarketCount: aboveMarket.length,
        upliftOpportunityAed: Math.round(upliftOpportunityAed),
      },
      asOf: new Date().toISOString(),
      reraIndexSize: reraIndex.length,
    };
  }
}
