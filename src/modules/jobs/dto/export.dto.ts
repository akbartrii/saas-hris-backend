export enum ExportType {
  PAYROLL = "payroll",
  ATTENDANCE = "attendance",
  LEAVE = "leave",
  OVERTIME = "overtime",
}

export enum ExportFormat {
  EXCEL = "excel",
  PDF = "pdf",
}

export class ExportDto {
  type: ExportType;
  format: ExportFormat;
  companyId: string;
  filters?: Record<string, any>;
}
