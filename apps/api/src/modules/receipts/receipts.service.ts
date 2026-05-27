import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReceiptStatus, TicketCategory } from '@prisma/client';

@Injectable()
export class ReceiptsService {
  constructor(private prisma: PrismaService) {}

  async findByOwner(workspaceId: string, ownerId: string) {
    const receipts = await this.prisma.receipt.findMany({
      where: { workspaceId, ownerId },
      include: { vendor: { select: { id: true, companyName: true } }, unit: { select: { id: true, unitNumber: true } } },
      orderBy: { receiptDate: 'desc' },
    });
    const total = receipts.reduce((s, r) => s + Number(r.amount) + Number(r.vatAmount), 0);
    const vatTotal = receipts.reduce((s, r) => s + Number(r.vatAmount), 0);
    return { receipts, kpis: { total, vatTotal, count: receipts.length, savings: 0 } };
  }

  async findOne(workspaceId: string, id: string) {
    const r = await this.prisma.receipt.findFirst({
      where: { id, workspaceId },
      include: { vendor: true, unit: true, ticket: true, owner: true },
    });
    if (!r) throw new NotFoundException();
    return r;
  }

  create(workspaceId: string, dto: any) {
    return this.prisma.receipt.create({
      data: {
        workspaceId,
        ownerId: dto.ownerId,
        unitId: dto.unitId,
        ticketId: dto.ticketId,
        vendorId: dto.vendorId,
        category: dto.category ?? TicketCategory.OTHER,
        description: dto.description,
        vendorInvoiceNo: dto.vendorInvoiceNo,
        amount: dto.amount,
        vatAmount: dto.vatAmount ?? Number(dto.amount) * 0.05,
        receiptDate: new Date(dto.receiptDate ?? Date.now()),
        beforePhotoUrl: dto.beforePhotoUrl,
        afterPhotoUrl: dto.afterPhotoUrl,
        invoicePdfUrl: dto.invoicePdfUrl,
        status: dto.status ?? ReceiptStatus.PENDING_APPROVAL,
        meta: dto.meta ?? {},
      },
    });
  }

  approve(workspaceId: string, id: string, userId: string) {
    return this.prisma.receipt.update({
      where: { id, workspaceId } as any,
      data: { status: ReceiptStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
    });
  }

  reject(workspaceId: string, id: string, reason: string) {
    return this.prisma.receipt.update({
      where: { id, workspaceId } as any,
      data: { status: ReceiptStatus.REJECTED, meta: { rejectionReason: reason } },
    });
  }

  markPaid(workspaceId: string, id: string) {
    return this.prisma.receipt.update({ where: { id, workspaceId } as any, data: { status: ReceiptStatus.PAID } });
  }
}
