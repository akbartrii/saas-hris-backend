import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ListLocationDto } from './dto/list-location.dto';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  private canManageLocations(role: string): boolean {
    return ['manager_hrga', 'hrd', 'admin', 'super_admin'].includes(role);
  }

  async list(userId: string, query: ListLocationDto) {
    const where: any = {};
    if (query.company_id) {
      where.company_id = query.company_id;
    }
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    const locations = await this.prisma.ms_locations.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: true },
    });

    if (user?.ms_employees) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check current active remote work
      if (user.ms_employees.current_remote_work_id) {
        const wfh = await this.prisma.tr_remote_work_requests.findUnique({
          where: { id: user.ms_employees.current_remote_work_id },
        });

        if (
          wfh &&
          wfh.status === 'approved' &&
          wfh.start_date <= today &&
          wfh.end_date >= today
        ) {
          const wfhLocation = {
            id: wfh.id,
            name: `WFH - ${wfh.address || 'Rumah'}`,
            type: 'wfh',
            latitude: wfh.latitude,
            longitude: wfh.longitude,
            radius_meters: wfh.radius_meters || 50,
            address: wfh.address,
            is_active: true,
            is_wfh: true,
            start_date: wfh.start_date,
            end_date: wfh.end_date,
          };
          return [...locations, wfhLocation];
        }
      }
    }

    return locations;
  }

  async getAssignedLocations(userId: string) {
    const locations: any[] = [];

    const user = await this.prisma.ms_users.findUnique({
      where: { id: userId },
      include: { ms_employees: { include: { ms_locations: true } } },
    });

    if (!user?.ms_employees) {
      return locations;
    }

    const employee = user.ms_employees;

    // Office location
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

    // Active WFH location
    if (employee.current_remote_work_id) {
      const todayStr = new Date().toISOString().split('T')[0];

      const wfh = await this.prisma.tr_remote_work_requests.findUnique({
        where: { id: employee.current_remote_work_id },
      });

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
      }
    }

    return locations;
  }

  async create(userRole: string, dto: CreateLocationDto) {
    if (!this.canManageLocations(userRole)) {
      throw new ForbiddenException(
        'Only manager HRGA, HRD, or admin can manage locations',
      );
    }
    return this.prisma.ms_locations.create({
      data: {
        company_id: dto.company_id,
        name: dto.name,
        type: dto.type,
        latitude: dto.latitude !== undefined ? dto.latitude : null,
        longitude: dto.longitude !== undefined ? dto.longitude : null,
        radius_meters: dto.radius_meters || 100,
        address: dto.address,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
      },
    });
  }

  async update(userRole: string, id: string, dto: UpdateLocationDto) {
    if (!this.canManageLocations(userRole)) {
      throw new ForbiddenException(
        'Only manager HRGA, HRD, or admin can manage locations',
      );
    }
    const exists = await this.prisma.ms_locations.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Location not found');
    }

    const data: any = {};
    if (dto.company_id !== undefined) data.company_id = dto.company_id;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.radius_meters !== undefined) data.radius_meters = dto.radius_meters;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.prisma.ms_locations.update({ where: { id }, data });
  }

  async delete(userRole: string, id: string) {
    if (!this.canManageLocations(userRole)) {
      throw new ForbiddenException(
        'Only manager HRGA, HRD, or admin can manage locations',
      );
    }
    const exists = await this.prisma.ms_locations.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Location not found');
    }
    return this.prisma.ms_locations.delete({ where: { id } });
  }
}
