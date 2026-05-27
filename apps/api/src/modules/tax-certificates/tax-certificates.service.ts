import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxCertificateStatus } from '@prisma/client';

@Injectable()
export class TaxCertificatesService {
  constructor(private prisma: PrismaService) {}

  findByOwner(workspaceId: string, ownerId: string) {
    return this.prisma.taxCertificate.findMany({
      where: { workspaceId, ownerId },
      orderBy: { taxYear: 'desc' },
    });
  }

  async generate(workspaceId: string, ownerId: string, taxYear: number) {
    // Compute real numbers from ledger
    const yearStart = new Date(taxYear, 0, 1);
    const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59);

    // Sum rental income from rent collections for this owner's units
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  include: { rentCollections: { where: { collectedAt: { gte: yearStart, lte: yearEnd } } } },
                },
              },
            },
          },
        },
      },
    });

    if (!owner) throw new NotFoundException('Owner not found');

    let gross = 0;
    let vatCollected = 0;
    for (const property of owner.properties) {
      for (const unit of property.units) {
        for (const lease of unit.leases) {
          for (const rc of lease.rentCollections) {
            gross += Number(rc.amount);
            vatCollected += Number(rc.vatAmount ?? 0);
          }
        }
      }
    }

    // Sum maintenance + management expenses for this owner
    const receipts = await this.prisma.receipt.findMany({
      where: { workspaceId, ownerId, receiptDate: { gte: yearStart, lte: yearEnd }, status: { in: ['APPROVED', 'PAID'] } },
    });
    const expenses = receipts.reduce((s, r) => s + Number(r.amount) + Number(r.vatAmount), 0);

    const mgmtFee = gross * (Number(owner.mgmtFeePct) / 100);
    const netIncome = gross - expenses - mgmtFee;
    const ftaReference = `TC-${taxYear}-${Date.now().toString().slice(-6)}`;

    const existing = await this.prisma.taxCertificate.findFirst({ where: { ownerId, taxYear } });
    if (existing) {
      return this.prisma.taxCertificate.update({
        where: { id: existing.id },
        data: {
          grossIncomeAed: gross,
          expensesAed: expenses,
          mgmtFeeAed: mgmtFee,
          vatCollectedAed: vatCollected,
          netIncomeAed: netIncome,
          ftaReference,
          status: TaxCertificateStatus.GENERATED,
        },
      });
    }

    return this.prisma.taxCertificate.create({
      data: {
        workspaceId,
        ownerId,
        taxYear,
        grossIncomeAed: gross,
        expensesAed: expenses,
        mgmtFeeAed: mgmtFee,
        vatCollectedAed: vatCollected,
        netIncomeAed: netIncome,
        ftaReference,
        status: TaxCertificateStatus.GENERATED,
      },
    });
  }

  async emailTo(workspaceId: string, id: string, email: string) {
    return this.prisma.taxCertificate.update({
      where: { id, workspaceId } as any,
      data: { status: TaxCertificateStatus.EMAILED, emailedAt: new Date(), emailedTo: email },
    });
  }
}
