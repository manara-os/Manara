import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BidStatus, TicketStatus } from '@prisma/client';

@Injectable()
export class BidsService {
  constructor(private prisma: PrismaService) {}

  async listForTicket(workspaceId: string, ticketId: string) {
    const bids = await this.prisma.ticketBid.findMany({
      where: { ticketId, workspaceId },
      include: {
        vendor: { select: { id: true, companyName: true, rating: true, totalJobsCompleted: true } },
      },
      orderBy: [{ status: 'asc' }, { amountAed: 'asc' }],
    });

    const lowest = bids.length ? Math.min(...bids.map((b) => Number(b.amountAed))) : 0;
    const avg = bids.length ? bids.reduce((s, b) => s + Number(b.amountAed), 0) / bids.length : 0;
    const savings = Math.max(avg - lowest, 0);

    return { bids: this.rankBids(bids), kpis: { count: bids.length, lowest, avg: Math.round(avg), savings: Math.round(savings) } };
  }

  private rankBids(bids: any[]) {
    if (!bids.length) return bids;
    const scored = bids.map((b) => {
      const rating = Number(b.vendor?.rating ?? 0);
      const amount = Number(b.amountAed);
      const eta = b.etaHours;
      const warranty = b.warrantyDays;
      // Composite: lower amount good, higher rating good, lower eta good, higher warranty good
      const score = (rating / 5) * 30 + Math.max(0, 100 - amount / 50) * 0.25 + Math.max(0, 50 - eta) * 0.5 + Math.min(100, warranty) * 0.2;
      return { ...b, _score: score };
    });
    scored.sort((a, b) => b._score - a._score);
    return scored.map((b, idx) => ({
      ...b,
      aiRank: idx + 1,
      aiRecommended: idx === 0,
      aiReason: idx === 0 ? this.explainTopBid(b, scored) : null,
    }));
  }

  private explainTopBid(top: any, all: any[]) {
    const reasons: string[] = [];
    if (Number(top.vendor?.rating ?? 0) >= 4.5) reasons.push(`top-rated (${Number(top.vendor?.rating).toFixed(1)}★)`);
    if (top.etaHours <= Math.min(...all.map((b) => b.etaHours))) reasons.push(`fastest ETA (${top.etaHours}h)`);
    if (top.warrantyDays >= Math.max(...all.map((b) => b.warrantyDays))) reasons.push(`longest warranty (${top.warrantyDays}d)`);
    return `Recommended: ${reasons.join(' · ') || 'best overall value'}`;
  }

  async submit(workspaceId: string, ticketId: string, dto: any) {
    return this.prisma.ticketBid.create({
      data: {
        workspaceId,
        ticketId,
        vendorId: dto.vendorId,
        amountAed: dto.amountAed,
        vatIncluded: dto.vatIncluded ?? true,
        etaHours: dto.etaHours,
        warrantyDays: dto.warrantyDays ?? 30,
        message: dto.message,
        status: BidStatus.PENDING,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        meta: dto.meta ?? {},
      },
    });
  }

  async accept(workspaceId: string, bidId: string) {
    const bid = await this.prisma.ticketBid.findFirst({ where: { id: bidId, workspaceId } });
    if (!bid) throw new NotFoundException();
    if (bid.status !== BidStatus.PENDING) throw new BadRequestException('Bid no longer pending');

    return this.prisma.$transaction(async (tx) => {
      const accepted = await tx.ticketBid.update({
        where: { id: bidId },
        data: { status: BidStatus.ACCEPTED, acceptedAt: new Date() },
      });
      await tx.ticketBid.updateMany({
        where: { ticketId: bid.ticketId, id: { not: bidId }, status: BidStatus.PENDING },
        data: { status: BidStatus.REJECTED },
      });
      await tx.ticket.update({
        where: { id: bid.ticketId },
        data: {
          assignedVendorId: bid.vendorId,
          status: TicketStatus.ASSIGNED,
          assignedAt: new Date(),
          vendorInvoiceAmount: bid.amountAed,
        },
      });
      return accepted;
    });
  }

  reject(workspaceId: string, bidId: string) {
    return this.prisma.ticketBid.update({ where: { id: bidId, workspaceId } as any, data: { status: BidStatus.REJECTED } });
  }

  withdraw(workspaceId: string, bidId: string) {
    return this.prisma.ticketBid.update({ where: { id: bidId, workspaceId } as any, data: { status: BidStatus.WITHDRAWN } });
  }
}
