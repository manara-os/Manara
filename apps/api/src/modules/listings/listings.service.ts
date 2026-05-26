import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ListingPortal, ListingStatus } from '@prisma/client';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: { status?: ListingStatus; portal?: ListingPortal; propertyId?: string }) {
    return this.prisma.propertyListing.findMany({
      where: {
        workspaceId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.portal && { portal: filters.portal }),
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
      },
      include: {
        property: { select: { id: true, name: true, area: true, city: true, photos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const listing = await this.prisma.propertyListing.findFirst({
      where: { id, workspaceId },
      include: {
        property: true,
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async create(workspaceId: string, dto: {
    propertyId: string;
    unitId?: string;
    portal: ListingPortal;
    title?: string;
    askingRent?: number;
    listingUrl?: string;
  }) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, workspaceId },
    });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.propertyListing.create({
      data: {
        workspaceId,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        portal: dto.portal,
        title: dto.title ?? property.name,
        askingRent: dto.askingRent,
        listingUrl: dto.listingUrl,
        status: ListingStatus.DRAFT,
      },
    });
  }

  async publish(workspaceId: string, id: string) {
    const listing = await this.prisma.propertyListing.findFirst({ where: { id, workspaceId } });
    if (!listing) throw new NotFoundException('Listing not found');

    return this.prisma.propertyListing.update({
      where: { id },
      data: {
        status: ListingStatus.ACTIVE,
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        externalListingId: listing.externalListingId ?? `${listing.portal.toLowerCase()}-${id.slice(0, 8)}`,
      },
    });
  }

  async pause(workspaceId: string, id: string) {
    const listing = await this.prisma.propertyListing.findFirst({ where: { id, workspaceId } });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.propertyListing.update({
      where: { id },
      data: { status: ListingStatus.PAUSED },
    });
  }

  async cancel(workspaceId: string, id: string) {
    const listing = await this.prisma.propertyListing.findFirst({ where: { id, workspaceId } });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.propertyListing.update({
      where: { id },
      data: { status: ListingStatus.EXPIRED },
    });
  }

  async summary(workspaceId: string) {
    const all = await this.prisma.propertyListing.findMany({
      where: { workspaceId },
      select: { status: true, portal: true, views: true, inquiries: true, askingRent: true },
    });

    const byStatus: Record<string, number> = {};
    const byPortal: Record<string, number> = {};
    let totalViews = 0;
    let totalInquiries = 0;
    let totalAsking = 0;

    for (const l of all) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
      byPortal[l.portal] = (byPortal[l.portal] ?? 0) + 1;
      totalViews += l.views ?? 0;
      totalInquiries += l.inquiries ?? 0;
      totalAsking += Number(l.askingRent ?? 0);
    }

    return {
      total: all.length,
      active: byStatus[ListingStatus.ACTIVE] ?? 0,
      draft: byStatus[ListingStatus.DRAFT] ?? 0,
      paused: byStatus[ListingStatus.PAUSED] ?? 0,
      expired: byStatus[ListingStatus.EXPIRED] ?? 0,
      byPortal,
      totalViews,
      totalInquiries,
      conversionRate: totalViews > 0 ? Math.round((totalInquiries / totalViews) * 1000) / 10 : 0,
      avgAskingRent: all.length > 0 ? Math.round(totalAsking / all.length) : 0,
    };
  }
}
