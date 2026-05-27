import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NpsStatus } from '@prisma/client';

@Injectable()
export class NpsService {
  constructor(private prisma: PrismaService) {}

  async dispatchCampaign(workspaceId: string, campaignName: string) {
    const activeTenants = await this.prisma.tenant.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, phone: true, email: true },
    });

    await this.prisma.npsResponse.createMany({
      data: activeTenants.map((t) => ({
        workspaceId,
        campaignName,
        tenantId: t.id,
        recipientPhone: t.phone,
        recipientEmail: t.email,
        status: NpsStatus.PENDING,
        channel: 'WHATSAPP',
      })),
      skipDuplicates: true,
    });

    return { dispatched: activeTenants.length, campaignName };
  }

  async recordResponse(workspaceId: string, npsId: string, score: number, comment?: string) {
    return this.prisma.npsResponse.update({
      where: { id: npsId, workspaceId } as any,
      data: { score, comment, status: NpsStatus.RESPONDED, respondedAt: new Date() },
    });
  }

  list(workspaceId: string, campaignName?: string) {
    return this.prisma.npsResponse.findMany({
      where: { workspaceId, ...(campaignName && { campaignName }) },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
