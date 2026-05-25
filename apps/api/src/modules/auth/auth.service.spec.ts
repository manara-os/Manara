import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  oTPCode: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  workspace: {
    findFirst: jest.fn(),
  },
  workspaceMember: {
    findFirst: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key];
  }),
};

const mockNotificationsQueue = { add: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getQueueToken('notifications'), useValue: mockNotificationsQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should create an OTP code for existing user', async () => {
      const phone = '+971501000002';
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone, role: 'PM_ADMIN' });
      mockPrisma.oTPCode.deleteMany.mockResolvedValue({});
      mockPrisma.oTPCode.create.mockResolvedValue({ code: '123456' });

      await service.sendOtp(phone);

      expect(mockPrisma.oTPCode.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.sendOtp('+971500000000')).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {
    it('should return tokens on valid OTP', async () => {
      const phone = '+971501000002';
      const userId = 'user-1';
      const workspaceId = 'ws-1';

      mockPrisma.user.findUnique.mockResolvedValue({ id: userId, phone, role: 'PM_ADMIN', workspaceMembers: [] });
      mockPrisma.oTPCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      });
      mockPrisma.oTPCode.updateMany.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({ id: userId });
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId, workspace: { id: workspaceId } });

      const result = await service.verifyOtp(phone, '123456');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw on invalid OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+971501000002' });
      mockPrisma.oTPCode.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp('+971501000002', '999999')).rejects.toThrow();
    });

    it('should throw on expired OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+971501000002' });
      mockPrisma.oTPCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        expiresAt: new Date(Date.now() - 60000),
        usedAt: null,
      });

      await expect(service.verifyOtp('+971501000002', '123456')).rejects.toThrow();
    });
  });
});
