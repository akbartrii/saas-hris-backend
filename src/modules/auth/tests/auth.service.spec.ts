import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  const mockPrisma = {
    ms_users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ms_role_permissions: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    tr_user_devices: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'JWT_EXPIRATION') return '30d';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.ms_users.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow('Invalid email or password');
      expect(mockPrisma.ms_users.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUser = { id: '1', email: loginDto.email, password: 'hashed', ms_roles: { name: 'karyawan' }, ms_employees: null };
      mockPrisma.ms_users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow('Invalid email or password');
    });

    it('should return user data and token on successful login', async () => {
      const mockUser = {
        id: '1',
        email: loginDto.email,
        full_name: 'Test User',
        company_id: 'c1',
        password: 'hashed',
        is_active: true,
        ms_roles: { id: 'r1', name: 'karyawan' },
        ms_employees: {
          id: 'e1',
          full_name: 'Test User',
          department_id: null,
          position_id: null,
          manager_id: null,
          supervisor_id: null,
          location_id: null,
          current_remote_work_id: null,
          ms_locations: null,
          tr_remote_work_requests_current_remote_work: null,
          ms_departments_ms_employees_department_idToms_departments: null,
        },
      };
      mockPrisma.ms_users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token' as any);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '08123456789',
        ms_roles: { id: 'r1', name: 'karyawan' },
        ms_employees: {
          id: 'e1',
          full_name: 'Test User',
          ms_departments_ms_employees_department_idToms_departments: null,
          ms_positions: null,
          ms_locations: null,
          ms_teams: null,
        },
      };
      mockPrisma.ms_users.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('1');
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('saveFcmToken', () => {
    it('should upsert FCM token device', async () => {
      mockPrisma.tr_user_devices.findUnique.mockResolvedValue(null);
      mockPrisma.tr_user_devices.create.mockResolvedValue({ id: 'd1', fcm_token: 'fcm-token' });

      const result = await service.saveFcmToken('1', { fcm_token: 'fcm-token', token: 'fcm-token' } as any);
      expect(result).toBeDefined();
    });
  });
});
