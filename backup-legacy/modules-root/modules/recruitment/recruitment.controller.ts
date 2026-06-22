import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RecruitmentService } from './recruitment.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ApplyJobDto } from './dto/apply-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ListJobDto } from './dto/list-job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Recruitment')
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post('jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hrd', 'admin', 'super_admin')
  @ApiBearerAuth()
  async createJob(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.recruitmentService.createJob(userId, dto);
  }

  @Patch('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hrd', 'admin', 'super_admin')
  @ApiBearerAuth()
  async updateJob(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.recruitmentService.updateJob(userId, id, dto);
  }

  @Delete('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hrd', 'admin', 'super_admin')
  @ApiBearerAuth()
  async deleteJob(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recruitmentService.deleteJob(userId, id);
  }

  @Get('jobs')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async listJobs(@Query() query: ListJobDto) {
    return this.recruitmentService.listJobs(query);
  }

  @Get('jobs/:slug')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getJobBySlug(@Param('slug') slug: string) {
    return this.recruitmentService.getJobBySlug(slug);
  }

  @Post('apply')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async applyJob(@Body() dto: ApplyJobDto) {
    return this.recruitmentService.applyJob(dto);
  }

  @Get('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hrd', 'admin', 'super_admin')
  @ApiBearerAuth()
  async listApplications(
    @CurrentUser('userId') userId: string,
    @Query() query: any,
  ) {
    return this.recruitmentService.listApplications(userId, query);
  }

  @Patch('applications/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hrd', 'admin', 'super_admin')
  @ApiBearerAuth()
  async updateApplicationStatus(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.recruitmentService.updateApplicationStatus(userId, id, dto);
  }
}
