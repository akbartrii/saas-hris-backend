import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../notification.service';
import { HrisRequestEvent, HrisModuleType, HrisActionType } from '../events/hris-request.event';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private getModuleLabel(module: HrisModuleType): string {
    switch (module) {
      case 'remote_work':
        return 'WFH';
      case 'reimbursement':
        return 'Reimbursement';
      case 'leave':
        return 'Cuti';
      case 'time_off':
        return 'Izin';
      case 'overtime':
        return 'Lembur';
      default:
        return 'Permohonan';
    }
  }

  @OnEvent('hris.request')
  async handleHrisRequest(event: HrisRequestEvent) {
    this.logger.log(
      `[Event Captured] module=${event.module}, action=${event.action}, requestId=${event.requestId}, requesterId=${event.requesterId}`,
    );

    try {
      const requester = await this.prisma.ms_employees.findUnique({
        where: { id: event.requesterId },
        include: { ms_users: true },
      });

      if (!requester) {
        this.logger.error(`Requester employee with ID ${event.requesterId} not found`);
        return;
      }

      const requesterName = requester.full_name;
      const moduleLabel = this.getModuleLabel(event.module);

      // Determine targets and notify based on action type
      switch (event.action) {
        case 'submitted':
        case 'cancelled':
          // Notify requester's direct supervisor
          if (requester.supervisor_id) {
            const supervisor = await this.prisma.ms_employees.findUnique({
              where: { id: requester.supervisor_id },
              include: { ms_users: true },
            });

            if (supervisor?.ms_users) {
              const title = event.action === 'submitted'
                ? `Permintaan ${moduleLabel} Baru`
                : `${moduleLabel} Dibatalkan`;

              const message = event.action === 'submitted'
                ? `${requesterName} mengajukan ${moduleLabel} baru.${event.metadata?.details ? ' ' + event.metadata.details : ''}`
                : `${requesterName} membatalkan permintaan ${moduleLabel}.${event.metadata?.rejectionReason ? ' Alasan: ' + event.metadata.rejectionReason : ''}`;

              this.logger.log(
                `Notifying supervisor ${supervisor.full_name} for ${event.action} ${event.module}`,
              );
              await this.notificationService.createNotificationInternal(
                supervisor.ms_users.id,
                requester.company_id,
                `${event.module}_${event.action}`,
                title,
                message,
                event.module,
                event.requestId,
              );
            } else {
              this.logger.warn(
                `Supervisor for employee ${requesterName} has no linked user account`,
              );
            }
          } else {
            this.logger.warn(`Requester employee ${requesterName} has no supervisor_id set`);
          }
          break;

        case 'supervisor_approved':
          // Notify HR / Admin users for second-layer approval
          const hrUsers = await this.prisma.ms_users.findMany({
            where: {
              ms_roles: {
                name: {
                  in: ['manager_hrga', 'hrd', 'admin', 'super_admin'],
                },
              },
            },
          });

          if (hrUsers.length > 0) {
            const title = `${moduleLabel} Disetujui Atasan`;
            const message = `Permintaan ${moduleLabel} dari ${requesterName} telah disetujui oleh atasan dan memerlukan persetujuan akhir HR.`;

            this.logger.log(`Notifying ${hrUsers.length} HR users for supervisor approved leave`);
            for (const hr of hrUsers) {
              await this.notificationService.createNotificationInternal(
                hr.id,
                requester.company_id,
                `${event.module}_supervisor_approved`,
                title,
                message,
                event.module,
                event.requestId,
              );
            }
          } else {
            this.logger.warn('No active HR/Admin users found to notify for second-layer approval');
          }
          break;

        case 'approved':
        case 'rejected':
          // Notify the requester employee of the final outcome
          if (requester.ms_users) {
            const title = event.action === 'approved'
              ? `${moduleLabel} Disetujui`
              : `${moduleLabel} Ditolak`;

            const message = event.action === 'approved'
              ? `Permintaan ${moduleLabel} kamu telah disetujui.${event.metadata?.details ? ' ' + event.metadata.details : ''}`
              : `Permintaan ${moduleLabel} kamu ditolak.${event.metadata?.rejectionReason ? ' Alasan: ' + event.metadata.rejectionReason : ' Rejected by supervisor/HR'}`;

            this.logger.log(
              `Notifying requester ${requesterName} that request was ${event.action}`,
            );
            await this.notificationService.createNotificationInternal(
              requester.ms_users.id,
              requester.company_id,
              `${event.module}_status`,
              title,
              message,
              event.module,
              event.requestId,
            );
          } else {
            this.logger.warn(
              `Requester employee ${requesterName} has no linked user account to notify`,
            );
          }
          break;

        default:
          this.logger.warn(`Unhandled action type: ${event.action}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to process notification event for request ${event.requestId}: ${err.message}`,
        err.stack,
      );
    }
  }
}
