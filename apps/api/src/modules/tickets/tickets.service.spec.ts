import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';

const WORKSPACE_ID = 'ws-test-123';

const mockPrisma = {
  ticket: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

const mockNotificationsQueue = { add: jest.fn() };

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('notifications'), useValue: mockNotificationsQueue },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a ticket with correct SLA for EMERGENCY priority', async () => {
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.ticket.create.mockImplementation(({ data }) => Promise.resolve({ id: 't-1', ...data }));

      const result = await service.create(WORKSPACE_ID, 'user-1', {
        title: 'Water flooding',
        priority: 'EMERGENCY',
        unitId: 'unit-1',
      } as any);

      const created = mockPrisma.ticket.create.mock.calls[0][0].data;
      const slaHours = (new Date(created.slaDueAt).getTime() - new Date(created.createdAt ?? Date.now()).getTime()) / 3600000;
      expect(Math.round(slaHours)).toBe(4);
      expect(created.ticketRef).toMatch(/^TKT-\d{4}-\d+/);
    });

    it('should create a ticket with 72h SLA for LOW priority', async () => {
      mockPrisma.ticket.count.mockResolvedValue(5);
      mockPrisma.ticket.create.mockImplementation(({ data }) => Promise.resolve({ id: 't-2', ...data }));

      await service.create(WORKSPACE_ID, 'user-1', {
        title: 'Light bulb replacement',
        priority: 'LOW',
        unitId: 'unit-1',
      } as any);

      const created = mockPrisma.ticket.create.mock.calls[0][0].data;
      const now = Date.now();
      const slaMs = new Date(created.slaDueAt).getTime() - now;
      const slaHours = slaMs / 3600000;
      expect(Math.round(slaHours)).toBeGreaterThanOrEqual(71);
      expect(Math.round(slaHours)).toBeLessThanOrEqual(73);
    });
  });

  describe('assign', () => {
    it('should assign vendor and update status to ASSIGNED', async () => {
      const ticket = { id: 't-1', workspaceId: WORKSPACE_ID, status: 'OPEN', vendorId: null };
      mockPrisma.ticket.findFirst.mockResolvedValue(ticket);
      mockPrisma.ticket.update.mockResolvedValue({ ...ticket, status: 'ASSIGNED', vendorId: 'v-1', assignedAt: new Date() });

      const result = await service.assign('t-1', WORKSPACE_ID, 'v-1');
      expect(result.status).toBe('ASSIGNED');
      expect(mockNotificationsQueue.add).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent ticket', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);
      await expect(service.assign('nonexistent', WORKSPACE_ID, 'v-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should set resolvedAt when status transitions to RESOLVED', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({ id: 't-1', workspaceId: WORKSPACE_ID, status: 'IN_PROGRESS' });
      mockPrisma.ticket.update.mockResolvedValue({ id: 't-1', status: 'RESOLVED', resolvedAt: new Date() });

      await service.updateStatus('t-1', WORKSPACE_ID, 'RESOLVED', undefined);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RESOLVED', resolvedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('getKanbanBoard', () => {
    it('should return tickets grouped by status', async () => {
      const mockTickets = [
        { id: 't-1', status: 'OPEN', priority: 'HIGH' },
        { id: 't-2', status: 'OPEN', priority: 'LOW' },
        { id: 't-3', status: 'IN_PROGRESS', priority: 'MEDIUM' },
      ];
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const board = await service.getKanbanBoard(WORKSPACE_ID);
      expect(board.OPEN).toHaveLength(2);
      expect(board.IN_PROGRESS).toHaveLength(1);
      expect(board.ASSIGNED).toHaveLength(0);
    });
  });
});
