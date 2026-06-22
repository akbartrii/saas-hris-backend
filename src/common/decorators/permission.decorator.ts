import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export const RequirePermission = (menu: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { menu, action });
