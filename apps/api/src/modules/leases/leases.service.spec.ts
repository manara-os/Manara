import { Test, TestingModule } from '@nestjs/testing';
import { LeasesService } from './leases.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const WORKSPACE_ID = 'ws-test-123';

const mockPrisma = {
  lease: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  unit: {
    update: jest.fn(),
  },
};

const mockRenewalQueue = { add: jest.fn() };
const mockEjariQueue = { add: jest.fn() };
const mockNotificationsQueue = { add: jest.fn() };

describe('LeasesService', () => {
  let service: LeasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeasesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('renewal-alerts'), useValue: mockRenewalQueue },
        { provide: getQueueToken('ejari'), useValue: mockEjariQueue },
        { provide: getQueueToken('notifications'), useValue: mockNotificationsQueue },
      ],
    }).compile();

    service = module.get<LeasesService>(LeasesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getExpiring', () => {
    it('should return leases expiring within 90 days by default', async () => {
      const expiringLeases = [
        { id: 'l-1', endDate: new Date(Date.now() + 30 * 86400000), status: 'ACTIVE' },
        { id: 'l-2', endDate: new Date(Date.now() + 60 * 86400000), status: 'ACTIVE' },
      ];
      mockPrisma.lease.findMany.mockResolvedValue(expiringLeases);

      const result = await service.getExpiring(WORKSPACE_ID, 90);
      expect(result).toHaveLength(2);
    });
  });

  describe('renew', () => {
    it('should renew an active lease', async () => {
      const activeLease = {
        id: 'l-1',
        workspaceId: WORKSPACE_ID,
        status: 'ACTIVE',
        unitId: 'unit-1',
        tenantId: 't-1',
        endDate: new Date('2025-12-31'),
        annualRent: 60000,
      };
      mockPrisma.lease.findFirst.mockResolvedValue(activeLease);
      mockPrisma.lease.update.mockResolvedValue({ ...activeLease, status: 'EXPIRED' });
      mockPrisma.lease.create.mockResolvedValue({
        id: 'l-new',
        status: 'ACTIVE',
        annualRent: 62000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const renewDto = {
        newStartDate: '2026-01-01',
        newEndDate: '2026-12-31',
        newAnnualRent: 62000,
      };

      const result = await service.renew('l-1', WORKSPACE_ID, renewDto as any);
      expect(result.status).toBe('ACTIVE');
      expect(mockNotificationsQueue.add).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-ACTIVE lease', async () => {
      mockPrisma.lease.findFirst.mockResolvedValue({ id: 'l-1', status: 'EXPIRED', workspaceId: WORKSPACE_ID });
      await expect(service.renew('l-1', WORKSPACE_ID, {} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('terminate', () => {
    it('should terminate an active lease', async () => {
      const activeLease = { id: 'l-1', status: 'ACTIVE', workspaceId: WORKSPACE_ID, unitId: 'unit-1' };
      mockPrisma.lease.findFirst.mockResolvedValue(activeLease);
      mockPrisma.lease.update.mockResolvedValue({ ...activeLease, status: 'TERMINATED', terminatedAt: new Date() });
      mockPrisma.unit.update.mockResolvedValue({});

      const result = await service.terminate('l-1', WORKSPACE_ID, { reason: 'Mutual agreement' } as any);
      expect(result.status).toBe('TERMINATED');
      expect(mockPrisma.unit.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ occupancyStatus: 'VACANT' }) }),
      );
    });
  });
});
