import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const WORKSPACE_ID = 'ws-test-123';

const mockPrisma = {
  property: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('PropertiesService', () => {
  let service: PropertiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return properties for workspace', async () => {
      const mockProperties = [
        { id: 'p-1', name: 'Marina Tower', workspaceId: WORKSPACE_ID },
        { id: 'p-2', name: 'JLT Residency', workspaceId: WORKSPACE_ID },
      ];
      mockPrisma.property.findMany.mockResolvedValue(mockProperties);
      mockPrisma.property.count.mockResolvedValue(2);

      const result = await service.findAll(WORKSPACE_ID, {});
      expect(result.data).toHaveLength(2);
      expect(mockPrisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workspaceId: WORKSPACE_ID }) }),
      );
    });

    it('should filter by city', async () => {
      mockPrisma.property.findMany.mockResolvedValue([]);
      mockPrisma.property.count.mockResolvedValue(0);

      await service.findAll(WORKSPACE_ID, { city: 'Dubai' });
      expect(mockPrisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ city: 'Dubai' }) }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a property by id', async () => {
      const mockProperty = { id: 'p-1', name: 'Marina Tower', workspaceId: WORKSPACE_ID };
      mockPrisma.property.findFirst.mockResolvedValue(mockProperty);

      const result = await service.findOne('p-1', WORKSPACE_ID);
      expect(result.id).toBe('p-1');
    });

    it('should throw NotFoundException for non-existent property', async () => {
      mockPrisma.property.findFirst.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', WORKSPACE_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a property', async () => {
      const createDto = {
        name: 'New Tower',
        address: '123 Sheikh Zayed Rd',
        city: 'Dubai',
        propertyType: 'RESIDENTIAL',
        totalUnits: 50,
      };
      const created = { id: 'p-new', ...createDto, workspaceId: WORKSPACE_ID };
      mockPrisma.property.create.mockResolvedValue(created);

      const result = await service.create(WORKSPACE_ID, createDto as any);
      expect(result.name).toBe('New Tower');
      expect(mockPrisma.property.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ workspaceId: WORKSPACE_ID }) }),
      );
    });
  });

  describe('update', () => {
    it('should update a property', async () => {
      mockPrisma.property.findFirst.mockResolvedValue({ id: 'p-1', workspaceId: WORKSPACE_ID });
      mockPrisma.property.update.mockResolvedValue({ id: 'p-1', name: 'Updated Tower', workspaceId: WORKSPACE_ID });

      const result = await service.update('p-1', WORKSPACE_ID, { name: 'Updated Tower' } as any);
      expect(result.name).toBe('Updated Tower');
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrisma.property.findFirst.mockResolvedValue(null);
      await expect(service.update('nonexistent', WORKSPACE_ID, {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
