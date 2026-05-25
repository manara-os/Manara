import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: {
    type?: DocumentType;
    leaseId?: string;
    tenantId?: string;
    ownerId?: string;
    propertyId?: string;
  }) {
    return this.prisma.document.findMany({
      where: {
        workspaceId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
        ...(filters?.tenantId && { tenantId: filters.tenantId }),
        ...(filters?.ownerId && { ownerId: filters.ownerId }),
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, workspaceId } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(workspaceId: string, dto: {
    type: DocumentType;
    name: string;
    s3Key: string;
    s3Url: string;
    mimeType?: string;
    fileSizeBytes?: number;
    leaseId?: string;
    tenantId?: string;
    ownerId?: string;
    propertyId?: string;
    expiryDate?: Date;
  }) {
    return this.prisma.document.create({ data: { workspaceId, ...dto } });
  }

  async delete(workspaceId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, workspaceId } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.document.delete({ where: { id } });
  }

  async getExpiring(workspaceId: string, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return this.prisma.document.findMany({
      where: {
        workspaceId,
        expiryDate: { lte: cutoff, gte: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
