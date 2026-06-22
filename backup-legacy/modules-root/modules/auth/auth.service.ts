import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { RevokeFcmTokenDto } from './dto/revoke-fcm-token.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      const user = await this.prisma.ms_users.findUnique({
        where: { email },
        include: {
          ms_roles: true,
          ms_employees: {
            include: {
              ms_locations: true,
              tr_remote_work_requests_current_remote_work: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new InternalServerErrorException('JWT_SECRET not configured');
      }
      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.ms_roles?.name || 'karyawan',
          employee_id: user.ms_employees?.id || null,
          company_id: user.company_id,
        },
        jwtSecret,
        { expiresIn: '7d' },
      );

      // Update last login
      await this.prisma.ms_users.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

      // Build assigned locations for the employee
      const assignedLocations = await this.buildAssignedLocations(
        user.ms_employees?.id,
        user.ms_employees,
      );

      return {
        access_token: token,
        employee_id: user.ms_employees?.id || null,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.ms_roles?.name || 'karyawan',
        },
        assigned_locations: assignedLocations,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login failed for ${loginDto.email}:`, error);
      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable',
      );
    }
  }

  private async buildAssignedLocations(
    employeeId: string | undefined,
    employeeData?: any,
  ) {
    const locations = [];
    if (!employeeId) {
      this.logger.log(`[buildAssignedLocations] No employeeId provided`);
      return locations;
    }

    let employee = employeeData;

    // Only query if employeeData was not provided or doesn't have the required includes
    if (!employee || !employee.ms_locations) {
      employee = await this.prisma.ms_employees.findUnique({
        where: { id: employeeId },
        include: {
          ms_locations: true,
          tr_remote_work_requests_current_remote_work: true,
        },
      });
    }

    if (!employee) {
      this.logger.log(
        `[buildAssignedLocations] Employee ${employeeId} not found`,
      );
      return locations;
    }

    this.logger.log(
      `[buildAssignedLocations] Employee ${employeeId}, current_remote_work_id=${employee.current_remote_work_id}, location_id=${employee.location_id}`,
    );

    if (employee.ms_locations) {
      locations.push({
        id: employee.ms_locations.id,
        name: employee.ms_locations.name,
        type: employee.ms_locations.type || 'office',
        latitude: employee.ms_locations.latitude,
        longitude: employee.ms_locations.longitude,
        radius_meters: employee.ms_locations.radius_meters,
        address: employee.ms_locations.address,
        is_active: employee.ms_locations.is_active,
      });
    }

    if (employee.current_remote_work_id) {
      const todayStr = new Date().toISOString().split('T')[0];

      // Use pre-fetched data if available, otherwise query
      const wfh =
        employee.tr_remote_work_requests_current_remote_work ||
        (await this.prisma.tr_remote_work_requests.findUnique({
          where: { id: employee.current_remote_work_id },
        }));

      this.logger.log(
        `[buildAssignedLocations] WFH request found: status=${wfh?.status}, start=${wfh?.start_date}, end=${wfh?.end_date}, today=${todayStr}`,
      );

      const startStr = wfh?.start_date
        ? new Date(wfh.start_date).toISOString().split('T')[0]
        : null;
      const endStr = wfh?.end_date
        ? new Date(wfh.end_date).toISOString().split('T')[0]
        : null;

      if (
        wfh &&
        wfh.status === 'approved' &&
        startStr &&
        endStr &&
        startStr <= todayStr &&
        endStr >= todayStr
      ) {
        this.logger.log(`[buildAssignedLocations] WFH location ADDED`);
        locations.push({
          id: wfh.id,
          name: `WFH - ${wfh.address || 'Rumah'}`,
          type: 'wfh',
          latitude: wfh.latitude,
          longitude: wfh.longitude,
          radius_meters: wfh.radius_meters || 50,
          address: wfh.address,
          is_active: true,
          start_date: wfh.start_date,
          end_date: wfh.end_date,
        });
      } else {
        this.logger.log(
          `[buildAssignedLocations] WFH location NOT added. wfh=${!!wfh}, status=${wfh?.status}, startStr=${startStr}, endStr=${endStr}, todayStr=${todayStr}`,
        );
      }
    } else {
      this.logger.log(`[buildAssignedLocations] No current_remote_work_id`);
    }

    this.logger.log(
      `[buildAssignedLocations] Returning ${locations.length} locations`,
    );
    return locations;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_roles: true, ms_employees: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: user.ms_roles?.name || 'karyawan',
      employee_id: user.ms_employees?.id || null,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
    };
  }

  async saveFcmToken(userId: string, dto: SaveFcmTokenDto) {
    try {
      // Upsert device by fcm_token (unique)
      const device = await this.prisma.tr_user_devices.upsert({
        where: { fcm_token: dto.fcm_token },
        update: {
          user_id: userId,
          device_id: dto.device_id || null,
          platform: dto.platform || null,
          is_active: true,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          fcm_token: dto.fcm_token,
          device_id: dto.device_id || null,
          platform: dto.platform || null,
          is_active: true,
        },
      });

      // Also update legacy fcm_token on ms_users for backward compatibility
      await this.prisma.ms_users.update({
        where: { id: userId },
        data: { fcm_token: dto.fcm_token },
      });

      return {
        message: 'FCM token saved successfully',
        device_id: device.id,
      };
    } catch (error) {
      this.logger.error(`Failed to save FCM token for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to save FCM token');
    }
  }

  async revokeFcmToken(userId: string, dto: RevokeFcmTokenDto) {
    try {
      const device = await this.prisma.tr_user_devices.findFirst({
        where: {
          user_id: userId,
          fcm_token: dto.fcm_token,
        },
      });

      if (!device) {
        return { message: 'Token not found or already revoked' };
      }

      await this.prisma.tr_user_devices.update({
        where: { id: device.id },
        data: { is_active: false, updated_at: new Date() },
      });

      return { message: 'FCM token revoked successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to revoke FCM token for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to revoke FCM token');
    }
  }

  async revokeAllFcmTokens(userId: string) {
    try {
      const { count } = await this.prisma.tr_user_devices.updateMany({
        where: { user_id: userId, is_active: true },
        data: { is_active: false, updated_at: new Date() },
      });

      return {
        message: 'All FCM tokens revoked successfully',
        revoked_count: count,
      };
    } catch (error) {
      this.logger.error(
        `Failed to revoke all FCM tokens for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to revoke FCM tokens');
    }
  }
}
