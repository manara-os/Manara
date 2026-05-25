import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

const WORKSPACE_ID = 'ws-test-123';

const mockPrisma = {
  rentCollection: {
    findMany: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  pDCCheque: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  expense: {
    findMany: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  ownerStatement: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  unit: {
    count: jest.fn(),
    aggregate: jest.fn(),
  },
};

const mockNotificationsQueue = { add: jest.fn() };

describe('FinanceService', () => {
  let service: FinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('notifications'), useValue: mockNotificationsQueue },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardSummary', () => {
    it('should return summary with correct calculations', async () => {
      mockPrisma.rentCollection.aggregate.mockResolvedValue({ _sum: { amount: 150000 } });
      mockPrisma.pDCCheque.aggregate.mockResolvedValue({ _sum: { amount: 25000 } });
      mockPrisma.pDCCheque.findMany.mockResolvedValue([{ amount: 25000, tenantId: 't-1' }]);
      mockPrisma.unit.count.mockResolvedValueOnce(100).mockResolvedValueOnce(85);

      const result = await service.getDashboardSummary(WORKSPACE_ID);
      expect(result).toHaveProperty('revenueMtd');
      expect(result).toHaveProperty('occupancyRate');
      expect(result.occupancyRate).toBe(85);
    });
  });

  describe('getOverdueRent', () => {
    it('should return overdue PDC cheques', async () => {
      const overdueCheques = [
        { id: 'c-1', amount: 10000, chequeDate: new Date('2024-01-01'), status: 'PENDING', tenant: { fullName: 'Hassan' } },
      ];
      mockPrisma.pDCCheque.findMany.mockResolvedValue(overdueCheques);

      const result = await service.getOverdueRent(WORKSPACE_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c-1');
    });

    it('should only return PENDING cheques past due date', async () => {
      mockPrisma.pDCCheque.findMany.mockResolvedValue([]);

      await service.getOverdueRent(WORKSPACE_ID);
      expect(mockPrisma.pDCCheque.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: WORKSPACE_ID,
            status: 'PENDING',
            chequeDate: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  describe('recordCollection', () => {
    it('should create a rent collection record', async () => {
      const dto = { leaseId: 'l-1', tenantId: 't-1', amount: 10000, collectedAt: new Date().toISOString() };
      const created = { id: 'rc-1', ...dto, workspaceId: WORKSPACE_ID };
      mockPrisma.rentCollection.create.mockResolvedValue(created);

      const result = await service.recordCollection(WORKSPACE_ID, dto as any);
      expect(result.id).toBe('rc-1');
      expect(mockNotificationsQueue.add).toHaveBeenCalled();
    });
  });

  describe('updateChequeStatus', () => {
    it('should set clearedAt when status is CLEARED', async () => {
      mockPrisma.pDCCheque.findFirst.mockResolvedValue({ id: 'c-1', workspaceId: WORKSPACE_ID });
      mockPrisma.pDCCheque.update.mockResolvedValue({ id: 'c-1', status: 'CLEARED', clearedAt: new Date() });

      const result = await service.updateChequeStatus('c-1', WORKSPACE_ID, 'CLEARED');
      expect(result.status).toBe('CLEARED');
      expect(mockPrisma.pDCCheque.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CLEARED', clearedAt: expect.any(Date) }),
        }),
      );
    });

    it('should not set clearedAt for non-CLEARED status', async () => {
      mockPrisma.pDCCheque.findFirst.mockResolvedValue({ id: 'c-1', workspaceId: WORKSPACE_ID });
      mockPrisma.pDCCheque.update.mockResolvedValue({ id: 'c-1', status: 'BOUNCED' });

      await service.updateChequeStatus('c-1', WORKSPACE_ID, 'BOUNCED');
      expect(mockPrisma.pDCCheque.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ clearedAt: expect.anything() }),
        }),
      );
    });
  });
});
