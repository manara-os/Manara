import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { FilesService } from '../../files/files.service';

interface EjariRegistrationPayload {
  tenantName: string;
  tenantPassportNo: string;
  tenantEmiratesId?: string;
  landlordName: string;
  unitAddress: string;
  unitArea: string;
  dldPermitNo?: string;
  annualRent: number;
  startDate: string;
  endDate: string;
  currencyCode: string;
  leaseType: string;
}

interface EjariResponse {
  ejariNumber: string;
  certificateUrl: string;
  status: string;
  registeredAt: string;
}

@Injectable()
export class EjariService {
  private readonly logger = new Logger(EjariService.name);
  private readonly DLD_API_URL: string;
  private readonly DLD_API_KEY: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {
    this.DLD_API_URL = config.get('DLD_API_BASE_URL', 'https://api.dubailand.gov.ae');
    this.DLD_API_KEY = config.get('DLD_API_KEY', '');
  }

  async registerLease(leaseId: string, workspaceId?: string): Promise<void> {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, workspaceId },
      include: {
        tenant: true,
        unit: { include: { property: { include: { owner: true } } } },
      },
    });

    if (!lease) {
      this.logger.error(`Lease ${leaseId} not found for Ejari registration`);
      return;
    }

    if (lease.ejariNumber) {
      this.logger.warn(`Lease ${leaseId} already has Ejari number ${lease.ejariNumber}`);
      return;
    }

    const payload: EjariRegistrationPayload = {
      tenantName: lease.tenant.fullName,
      tenantPassportNo: lease.tenant.passportNo || '',
      tenantEmiratesId: lease.tenant.emiratesId || undefined,
      landlordName: lease.unit.property.owner?.fullName || 'Owner',
      unitAddress: lease.unit.property.address,
      unitArea: lease.unit.property.area,
      dldPermitNo: lease.unit.property.dldPermitNo || undefined,
      annualRent: Number(lease.annualRent),
      startDate: lease.startDate.toISOString().split('T')[0],
      endDate: lease.endDate.toISOString().split('T')[0],
      currencyCode: lease.currencyCode,
      leaseType: lease.leaseType,
    };

    try {
      // Update status to pending
      await this.prisma.lease.update({
        where: { id: leaseId },
        data: { ejariStatus: 'PENDING' },
      });

      const result = await this.callDldEjariApi(payload);

      // Store certificate in S3
      const certUrl = await this.storeEjariCertificate(result, leaseId, workspaceId);

      // Update lease with Ejari details
      await this.prisma.lease.update({
        where: { id: leaseId },
        data: {
          ejariNumber: result.ejariNumber,
          ejariRegisteredAt: new Date(result.registeredAt),
          ejariCertificateUrl: certUrl,
          ejariStatus: 'REGISTERED',
          ejariExpiryDate: lease.endDate,
        },
      });

      // Create document record
      await this.prisma.document.create({
        data: {
          workspaceId,
          entityType: 'lease',
          entityId: leaseId,
          docType: 'EJARI_CERTIFICATE',
          name: `Ejari Certificate - ${result.ejariNumber}`,
          url: certUrl,
          mimeType: 'application/pdf',
          isVerified: true,
          uploadedBy: 'system',
        },
      });

      this.logger.log(`Ejari registered successfully: ${result.ejariNumber} for lease ${leaseId}`);
    } catch (error) {
      this.logger.error(`Ejari registration failed for lease ${leaseId}`, error);

      await this.prisma.lease.update({
        where: { id: leaseId },
        data: { ejariStatus: 'FAILED' },
      });

      throw error;
    }
  }

  async getStatus(ejariNumber: string): Promise<any> {
    try {
      const response = await fetch(`${this.DLD_API_URL}/ejari/status/${ejariNumber}`, {
        headers: {
          Authorization: `Bearer ${this.DLD_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`DLD API error: ${response.statusText}`);
      return response.json();
    } catch (error) {
      this.logger.error(`Failed to get Ejari status for ${ejariNumber}`, error);
      throw new ServiceUnavailableException('DLD Ejari API unavailable');
    }
  }

  async getReraIndex(area: string, propertyType?: string, bedrooms?: number): Promise<any> {
    return this.getReraRentalIndex(area, propertyType, bedrooms);
  }

  async getReraRentalIndex(area: string, propertyType?: string, bedrooms?: number): Promise<any> {
    const RERA_API_URL = this.config.get('RERA_INDEX_API_URL');

    // Check cache first
    const cached = await this.prisma.reraIndexCache.findFirst({
      where: {
        area: { equals: area, mode: 'insensitive' },
        ...(propertyType && { propertyType }),
        ...(bedrooms !== undefined && { bedroomCount: bedrooms }),
        refreshedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7-day cache
      },
    });

    if (cached) return cached;

    // Fetch from API (or return mock data for dev)
    if (this.config.get('NODE_ENV') !== 'production') {
      return this.getMockReraIndex(area, propertyType, bedrooms);
    }

    try {
      const response = await fetch(`${RERA_API_URL}/index?area=${area}&type=${propertyType}&bedrooms=${bedrooms}`, {
        headers: { Authorization: `Bearer ${this.DLD_API_KEY}` },
      });
      const data = await response.json();

      // Cache the result
      const upserted = await this.prisma.reraIndexCache.upsert({
        where: {
          area_propertyType_bedroomCount: {
            area,
            propertyType: propertyType || 'ALL',
            bedroomCount: bedrooms ?? null,
          },
        },
        create: {
          area,
          propertyType: propertyType || 'ALL',
          bedroomCount: bedrooms,
          minRent: data.minRent,
          maxRent: data.maxRent,
          avgRent: data.avgRent,
          currency: 'AED',
          effectiveDate: new Date(data.effectiveDate),
        },
        update: {
          minRent: data.minRent,
          maxRent: data.maxRent,
          avgRent: data.avgRent,
          refreshedAt: new Date(),
        },
      });

      return upserted;
    } catch (error) {
      this.logger.error('RERA Index API failed, returning cached data', error);
      return this.prisma.reraIndexCache.findFirst({
        where: { area: { equals: area, mode: 'insensitive' } },
        orderBy: { refreshedAt: 'desc' },
      });
    }
  }

  private async callDldEjariApi(payload: EjariRegistrationPayload): Promise<EjariResponse> {
    // In development, return mock response
    if (this.config.get('NODE_ENV') !== 'production') {
      return {
        ejariNumber: `E-${Date.now().toString().slice(-8)}`,
        certificateUrl: 'https://placeholder.example.com/ejari-certificate.pdf',
        status: 'REGISTERED',
        registeredAt: new Date().toISOString(),
      };
    }

    const response = await fetch(`${this.DLD_API_URL}/ejari/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.DLD_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Client-ID': this.config.get('DLD_CLIENT_ID', ''),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DLD API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  private async storeEjariCertificate(
    result: EjariResponse,
    leaseId: string,
    workspaceId: string,
  ): Promise<string> {
    if (result.certificateUrl.startsWith('https://')) {
      // Fetch and re-upload to our S3 for control
      try {
        const response = await fetch(result.certificateUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const key = `${workspaceId}/ejari/${leaseId}/${result.ejariNumber}.pdf`;
        return this.filesService.uploadBuffer(buffer, key, 'application/pdf');
      } catch (err) {
        this.logger.warn(`Failed to re-upload Ejari cert, using original URL`);
        return result.certificateUrl;
      }
    }
    return result.certificateUrl;
  }

  private getMockReraIndex(area: string, propertyType?: string, bedrooms?: number) {
    const baseRent = 80000;
    const areaMultiplier: Record<string, number> = {
      'Dubai Marina': 1.4,
      'Downtown Dubai': 1.5,
      'JVC': 0.9,
      'Business Bay': 1.3,
      'JBR': 1.35,
      'Palm Jumeirah': 1.8,
    };
    const mult = areaMultiplier[area] || 1.0;
    const avg = baseRent * mult;

    return {
      area,
      propertyType: propertyType || 'APARTMENT',
      bedroomCount: bedrooms,
      minRent: Math.round(avg * 0.85),
      maxRent: Math.round(avg * 1.15),
      avgRent: Math.round(avg),
      currency: 'AED',
      effectiveDate: new Date(),
      refreshedAt: new Date(),
      source: 'MOCK',
    };
  }
}
