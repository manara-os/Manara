import { Test } from '@nestjs/testing';
import { BidsService } from './bids.service';
import { PrismaService } from '../../database/prisma.service';
import { BidStatus } from '@prisma/client';

describe('BidsService', () => {
  let service: BidsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      ticketBid: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      ticket: { update: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [BidsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get<BidsService>(BidsService);
  });

  describe('listForTicket', () => {
    it('returns ranked bids with AI recommendation on the best', async () => {
      prisma.ticketBid.findMany.mockResolvedValue([
        { id: 'b1', amountAed: 850, etaHours: 4,  warrantyDays: 90, vendor: { id: 'v1', companyName: 'CoolBreeze', rating: 4.8 }, status: 'PENDING' },
        { id: 'b2', amountAed: 720, etaHours: 8,  warrantyDays: 30, vendor: { id: 'v2', companyName: 'PolarFix',    rating: 4.5 }, status: 'PENDING' },
        { id: 'b3', amountAed: 950, etaHours: 6,  warrantyDays: 60, vendor: { id: 'v3', companyName: 'Arctic',      rating: 4.2 }, status: 'PENDING' },
      ]);
      const result = await service.listForTicket('ws-1', 't-1');
      expect(result.bids[0].aiRecommended).toBe(true);
      expect(result.bids[0].aiReason).toBeTruthy();
      expect(result.kpis.lowest).toBe(720);
      expect(result.kpis.count).toBe(3);
    });
  });

  describe('accept', () => {
    it('marks bid accepted, others rejected, and assigns ticket', async () => {
      prisma.ticketBid.findFirst.mockResolvedValue({ id: 'b1', ticketId: 't1', vendorId: 'v1', status: BidStatus.PENDING, amountAed: 800 });
      prisma.ticketBid.update.mockImplementation((args: any) => Promise.resolve({ id: args.where.id, status: BidStatus.ACCEPTED }));
      await service.accept('ws-1', 'b1');
      expect(prisma.ticketBid.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'b1' }, data: expect.objectContaining({ status: BidStatus.ACCEPTED }) }));
      expect(prisma.ticketBid.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ ticketId: 't1', id: { not: 'b1' }, status: BidStatus.PENDING }), data: { status: BidStatus.REJECTED } }),
      );
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' }, data: expect.objectContaining({ assignedVendorId: 'v1', status: 'ASSIGNED' }) }),
      );
    });
  });
});
