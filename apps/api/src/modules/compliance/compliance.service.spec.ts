import { Test } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../database/prisma.service';
import { ComplianceCategory, ComplianceStatus } from '@prisma/client';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      complianceItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ComplianceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get<ComplianceService>(ComplianceService);
  });

  describe('computeStatus (via findAll)', () => {
    it('flags expired items', async () => {
      prisma.complianceItem.findMany.mockResolvedValue([
        { id: '1', expiryDate: new Date(Date.now() - 86_400_000), costAed: 0 },
      ]);
      const items = await service.findAll('ws-1');
      expect(items[0].status).toBe(ComplianceStatus.EXPIRED);
    });

    it('flags expiring-soon within 30 days', async () => {
      prisma.complianceItem.findMany.mockResolvedValue([
        { id: '2', expiryDate: new Date(Date.now() + 10 * 86_400_000), costAed: 0 },
      ]);
      const items = await service.findAll('ws-1');
      expect(items[0].status).toBe(ComplianceStatus.EXPIRING_SOON);
    });

    it('flags valid for >30 days out', async () => {
      prisma.complianceItem.findMany.mockResolvedValue([
        { id: '3', expiryDate: new Date(Date.now() + 90 * 86_400_000), costAed: 0 },
      ]);
      const items = await service.findAll('ws-1');
      expect(items[0].status).toBe(ComplianceStatus.VALID);
    });
  });

  describe('getKpis', () => {
    it('aggregates correctly across statuses', async () => {
      prisma.complianceItem.findMany.mockResolvedValue([
        { expiryDate: new Date(Date.now() - 86_400_000), costAed: 100 },          // expired
        { expiryDate: new Date(Date.now() + 5 * 86_400_000), costAed: 200 },      // expiring soon
        { expiryDate: new Date(Date.now() + 90 * 86_400_000), costAed: 300 },     // valid
      ]);
      const kpis = await service.getKpis('ws-1');
      expect(kpis.expired).toBe(1);
      expect(kpis.expiringSoon).toBe(1);
      expect(kpis.valid).toBe(1);
      expect(kpis.annualCost).toBe(600);
      expect(kpis.total).toBe(3);
    });
  });

  describe('create', () => {
    it('persists with category and computed status', async () => {
      prisma.complianceItem.create.mockImplementation((args: any) => Promise.resolve({ id: 'new', ...args.data }));
      const future = new Date(Date.now() + 90 * 86_400_000);
      const result = await service.create('ws-1', { category: ComplianceCategory.TRADE_LICENSE, name: 'Trade lic', expiryDate: future });
      expect(prisma.complianceItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: ComplianceStatus.VALID }) }),
      );
      expect(result.id).toBe('new');
    });
  });
});
