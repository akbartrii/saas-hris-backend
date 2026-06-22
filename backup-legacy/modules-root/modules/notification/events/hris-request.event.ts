export type HrisModuleType = 'remote_work' | 'reimbursement' | 'leave' | 'time_off' | 'overtime';
export type HrisActionType = 'submitted' | 'supervisor_approved' | 'approved' | 'rejected' | 'cancelled';

export class HrisRequestEvent {
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
    public readonly module: HrisModuleType,
    public readonly action: HrisActionType,
    public readonly metadata?: {
      rejectionReason?: string;
      details?: string;
      [key: string]: any;
    },
  ) {}
}
