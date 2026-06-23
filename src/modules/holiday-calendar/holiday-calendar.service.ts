import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { UpdateHolidayDto } from "./dto/update-holiday.dto";
import { ListHolidayDto } from "./dto/list-holiday.dto";

@Injectable()
export class HolidayCalendarService {
  constructor(private prisma: PrismaService) {}

  private isAdminOrHRD(role: string): boolean {
    return ["manager_hrga", "hrd", "admin", "super_admin"].includes(role);
  }

  async list(
    userId: string,
    companyId: string,
    userRole: string,
    query: ListHolidayDto,
  ) {
    const where: any = { company_id: companyId };
    if (query.year) {
      where.year = query.year;
    }

    return this.prisma.ms_holiday_calendars.findMany({
      where,
      orderBy: { holiday_date: "asc" },
    });
  }

  async create(
    userId: string,
    companyId: string,
    userRole: string,
    dto: CreateHolidayDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException("Only HRD or admin can manage holidays");
    }

    const existing = await this.prisma.ms_holiday_calendars.findFirst({
      where: {
        company_id: companyId,
        holiday_date: new Date(dto.holiday_date),
      },
    });
    if (existing) {
      throw new ForbiddenException(
        "Holiday already exists for this date and company",
      );
    }

    return this.prisma.ms_holiday_calendars.create({
      data: {
        company_id: companyId,
        holiday_date: new Date(dto.holiday_date),
        name: dto.name,
        type: dto.type,
        is_recurring: dto.is_recurring ?? false,
        year: dto.year,
      },
    });
  }

  async update(
    userId: string,
    companyId: string,
    userRole: string,
    id: string,
    dto: UpdateHolidayDto,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException("Only HRD or admin can manage holidays");
    }

    const holiday = await this.prisma.ms_holiday_calendars.findUnique({
      where: { id },
    });
    if (!holiday) {
      throw new NotFoundException("Holiday not found");
    }

    const data: any = {};
    if (dto.company_id !== undefined) data.company_id = dto.company_id;
    if (dto.holiday_date !== undefined)
      data.holiday_date = new Date(dto.holiday_date);
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.is_recurring !== undefined) data.is_recurring = dto.is_recurring;
    if (dto.year !== undefined) data.year = dto.year;

    return this.prisma.ms_holiday_calendars.update({ where: { id }, data });
  }

  async delete(
    userId: string,
    companyId: string,
    userRole: string,
    id: string,
  ) {
    if (!this.isAdminOrHRD(userRole)) {
      throw new ForbiddenException("Only HRD or admin can manage holidays");
    }

    const holiday = await this.prisma.ms_holiday_calendars.findUnique({
      where: { id },
    });
    if (!holiday) {
      throw new NotFoundException("Holiday not found");
    }

    return this.prisma.ms_holiday_calendars.delete({ where: { id } });
  }

  async syncHolidays(companyId: string, year: number) {
    try {
      const response = await fetch(
        `https://api-hari-libur.vercel.app/api?year=${year}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch holidays from public API");
      }

      const holidays = await response.json();
      const results = [];

      for (const h of holidays) {
        const holidayDate = new Date(h.holiday_date);

        const upserted = await this.prisma.ms_holiday_calendars.upsert({
          where: {
            company_id_holiday_date: {
              company_id: companyId,
              holiday_date: holidayDate,
            },
          },
          update: {
            name: h.holiday_name,
            type: h.is_national_holiday ? "national" : "other",
            year: year,
          },
          create: {
            company_id: companyId,
            holiday_date: holidayDate,
            name: h.holiday_name,
            type: h.is_national_holiday ? "national" : "other",
            year: year,
            is_recurring: false,
          },
        });
        results.push(upserted);
      }

      return {
        message: `Successfully synced ${results.length} holidays for year ${year}`,
        count: results.length,
      };
    } catch (error) {
      throw new Error(`Holiday sync failed: ${error.message}`);
    }
  }
}
