export class NotificationFanoutDto {
  companyId: string;
  userIds: string[];
  type: string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}
