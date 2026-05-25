import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { getQueueToken } from '@nestjs/bullmq';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  workspaceMember: {
    findFirst: jest.fn(),
  },
};

const mockOtpService = {
  generateAndSendOtp: jest.fn(),
  verifyOtp: jest.fn(),
};

const mockTokenService = {
  generateTokenPair: jest.fn().mockReturnValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-32-chars-minimum-length',
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
        { provide: OtpService, useValue: mockOtpService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
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
    it('should call OtpService for a known user', async () => {
      const phone = '+971501000002';
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', phone, role: 'PM_ADMIN', isActive: true });
      mockOtpService.generateAndSendOtp.mockResolvedValue(true);

      await service.sendOtp(phone);

      expect(mockOtpService.generateAndSendOtp).toHaveBeenCalledWith('u-1', phone);
    });

    it('should throw UnauthorizedException for unknown phone in production', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('production');

      await expect(service.sendOtp('+971500000000')).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {
    it('should return access and refresh tokens on valid OTP', async () => {
      const phone = '+971501000002';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1', phone, role: 'PM_ADMIN', isActive: true,
      });
      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1', status: 'ACTIVE' },
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1' });

      const result = await service.verifyOtp(phone, '123456');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockTokenService.generateTokenPair).toHaveBeenCalled();
    });

    it('should throw on invalid OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', phone: '+971501000002' });
      mockOtpService.verifyOtp.mockRejectedValue(new Error('Invalid OTP'));

      await expect(service.verifyOtp('+971501000002', '000000')).rejects.toThrow();
    });
  });
});
