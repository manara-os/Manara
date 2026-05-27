import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ComplianceCategory, ComplianceStatus, Prisma } from '@prisma/client';

const computeStatus = (expiry: Date): ComplianceStatus => {
  const now = Date.now();
  const exp = new Date(expiry).getTime();
  const daysToExpiry = (exp - now) / (1000 * 60 * 60 * 24);
  if (daysToExpiry < 0) return ComplianceStatus.EXPIRED;
  if (daysToExpiry <= 30) return ComplianceStatus.EXPIRING_SOON;
  return ComplianceStatus.VALID;
};

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, filters: { category?: ComplianceCategory; status?: ComplianceStatus } = {}) {
    const items = await this.prisma.complianceItem.findMany({
      where: { workspaceId, ...(filters.category && { category: filters.category }), ...(filters.status && { status: filters.status }) },
      orderBy: { expiryDate: 'asc' },
    });
    return items.map((item) => ({ ...item, status: computeStatus(item.expiryDate) }));
  }

  async getKpis(workspaceId: string) {
    const items = await this.prisma.complianceItem.findMany({ where: { workspaceId } });
    const expired = items.filter((i) => computeStatus(i.expiryDate) === ComplianceStatus.EXPIRED).length;
    const expiringSoon = items.filter((i) => computeStatus(i.expiryDate) === ComplianceStatus.EXPIRING_SOON).length;
    const valid = items.filter((i) => computeStatus(i.expiryDate) === ComplianceStatus.VALID).length;
    const annualCost = items.reduce((s, i) => s + Number(i.costAed ?? 0), 0);
    return { expired, expiringSoon, valid, annualCost, total: items.length };
  }

  findOne(workspaceId: string, id: string) {
    return this.prisma.complianceItem.findFirst({ where: { id, workspaceId } }).then((item) => {
      if (!item) throw new NotFoundException('Compliance item not found');
      return { ...item, status: computeStatus(item.expiryDate) };
    });
  }

  async create(workspaceId: string, dto: any) {
    return this.prisma.complianceItem.create({
      data: {
        workspaceId,
        category: dto.category,
        name: dto.name,
        referenceNumber: dto.referenceNumber,
        issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : null,
        expiryDate: new Date(dto.expiryDate),
        responsibleUserId: dto.responsibleUserId,
        costAed: dto.costAed ?? 0,
        reminderDaysBefore: dto.reminderDaysBefore ?? 30,
        documentId: dto.documentId,
        notes: dto.notes,
        status: computeStatus(new Date(dto.expiryDate)),
        meta: dto.meta ?? {},
      },
    });
  }

  async update(workspaceId: string, id: string, dto: any) {
    const data: Prisma.ComplianceItemUpdateInput = { ...dto };
    if (dto.expiryDate) {
      data.expiryDate = new Date(dto.expiryDate);
      data.status = computeStatus(new Date(dto.expiryDate));
    }
    return this.prisma.complianceItem.update({ where: { id, workspaceId } as any, data });
  }

  async renew(workspaceId: string, id: string, newExpiryDate: Date) {
    return this.prisma.complianceItem.update({
      where: { id, workspaceId } as any,
      data: {
        expiryDate: newExpiryDate,
        status: ComplianceStatus.VALID,
        remindersSentCount: 0,
        lastReminderAt: null,
        meta: { lastRenewedAt: new Date().toISOString() },
      },
    });
  }

  delete(workspaceId: string, id: string) {
    return this.prisma.complianceItem.delete({ where: { id, workspaceId } as any });
  }
}
