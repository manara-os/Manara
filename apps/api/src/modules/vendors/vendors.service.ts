import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VendorStatus, TicketCategory } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: {
    status?: VendorStatus;
    category?: TicketCategory;
    search?: string;
  }) {
    return this.prisma.vendor.findMany({
      where: {
        workspaceId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.category && { serviceCategories: { has: filters.category } }),
        ...(filters?.search && {
          OR: [
            { companyName: { contains: filters.search, mode: 'insensitive' } },
            { contactName: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
          ],
        }),
      },
      include: {
        _count: { select: { tickets: true } },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, workspaceId },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            unit: { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    // Compute ticket counts properly
    const [totalTickets, activeTickets, completedTickets, ratings] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId, assignedVendorId: id } }),
      this.prisma.ticket.count({
        where: { workspaceId, assignedVendorId: id, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] as any } },
      }),
      this.prisma.ticket.count({
        where: { workspaceId, assignedVendorId: id, status: { in: ['COMPLETED', 'CLOSED'] as any } },
      }),
      this.prisma.ticket.findMany({
        where: { workspaceId, assignedVendorId: id, tenantRating: { not: null } },
        select: { tenantRating: true },
      }),
    ]);

    const avgRating = ratings.length
      ? Number((ratings.reduce((s, r) => s + (r.tenantRating ?? 0), 0) / ratings.length).toFixed(2))
      : null;

    const fallbackRating = Number(vendor.rating ?? 0);
    return {
      ...vendor,
      _count: { tickets: totalTickets, activeTickets, completedTickets },
      avgRating: avgRating ?? (fallbackRating > 0 ? fallbackRating : null),
    };
  }

  /**
   * Vendor wallet — real earnings from ticket invoices.
   *
   *   - cleared: ticket completed/closed AND >7 days old (payout cleared)
   *   - pending: ticket completed/closed within last 7 days (awaiting payout)
   *   - inProgress: ticket ASSIGNED/IN_PROGRESS (estimated)
   *
   * Uses Ticket.vendorInvoiceAmount when present; falls back to per-category default rate.
   */
  async getWallet(workspaceId: string, vendorId: string) {
    const FALLBACK_RATES: Record<string, number> = {
      PLUMBING: 450, ELECTRICAL: 380, AC_HVAC: 600, PAINTING: 550,
      PEST_CONTROL: 300, CLEANING: 200, CARPENTRY: 400,
      LANDSCAPING: 320, APPLIANCE: 420, SECURITY: 380, OTHER: 350,
    };
    const rate = (t: any) =>
      Number(t.vendorInvoiceAmount ?? 0) || FALLBACK_RATES[t.category] || 350;

    const tickets = await this.prisma.ticket.findMany({
      where: { workspaceId, assignedVendorId: vendorId },
      select: {
        id: true,
        category: true,
        status: true,
        vendorInvoiceAmount: true,
        invoiceApprovedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const now = Date.now();
    const dayMs = 86_400_000;

    const inProgress = tickets.filter(t => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status));
    const completed  = tickets.filter(t => ['COMPLETED', 'CLOSED'].includes(t.status));
    const pending    = completed.filter(t => {
      const ref = t.invoiceApprovedAt ?? t.completedAt ?? t.updatedAt;
      return ref && (now - new Date(ref).getTime()) < 7 * dayMs;
    });
    const cleared    = completed.filter(t => {
      const ref = t.invoiceApprovedAt ?? t.completedAt ?? t.updatedAt;
      return !ref || (now - new Date(ref).getTime()) >= 7 * dayMs;
    });

    // Last 12 rolling weeks
    const weeks: { week: string; earnings: number; count: number; weekStart: string }[] = [];
    for (let w = 11; w >= 0; w--) {
      const ws = new Date(now - (w + 1) * 7 * dayMs);
      const we = new Date(now - w * 7 * dayMs);
      const inWeek = completed.filter(t => {
        const ref = t.invoiceApprovedAt ?? t.completedAt ?? t.updatedAt;
        if (!ref) return false;
        const d = new Date(ref);
        return d >= ws && d < we;
      });
      weeks.push({
        week: ws.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }),
        weekStart: ws.toISOString(),
        earnings: Math.round(inWeek.reduce((s, t) => s + rate(t), 0)),
        count: inWeek.length,
      });
    }

    const today = new Date(now);
    const daysToFriday = (5 - today.getDay() + 7) % 7 || 7;
    const nextPayout = new Date(now + daysToFriday * dayMs);

    return {
      inProgressCount: inProgress.length,
      inProgressEarning: Math.round(inProgress.reduce((s, t) => s + rate(t), 0)),
      pendingCount: pending.length,
      pendingTotal: Math.round(pending.reduce((s, t) => s + rate(t), 0)),
      clearedCount: cleared.length,
      clearedTotal: Math.round(cleared.reduce((s, t) => s + rate(t), 0)),
      ytdTotal: Math.round(completed.reduce((s, t) => s + rate(t), 0)),
      weeks,
      nextPayout: nextPayout.toISOString(),
      currencyCode: 'AED',
    };
  }

  async create(workspaceId: string, dto: {
    userId?: string;
    companyName: string;
    contactName: string;
    phone: string;
    email?: string;
    tradeLicenseNo?: string;
    tradeLicenseExpiry?: Date;
    serviceCategories: TicketCategory[];
    coverageAreas?: string[];
  }) {
    return this.prisma.vendor.create({
      data: {
        workspaceId,
        ...dto,
        status: VendorStatus.ACTIVE,
        isApproved: false,
      },
    });
  }

  async update(workspaceId: string, id: string, dto: any) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, workspaceId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async approve(workspaceId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, workspaceId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({ where: { id }, data: { isApproved: true } });
  }

  async getPerformance(workspaceId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, workspaceId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const [total, resolved, overSla] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId, assignedVendorId: vendorId } }),
      this.prisma.ticket.count({ where: { workspaceId, assignedVendorId: vendorId, status: 'COMPLETED' } }),
      this.prisma.ticket.count({
        where: {
          workspaceId,
          assignedVendorId: vendorId,
          status: 'COMPLETED',
          resolvedAt: { not: null },
        },
      }),
    ]);

    return {
      vendorId,
      companyName: vendor.companyName,
      totalTickets: total,
      resolvedTickets: resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }
}
