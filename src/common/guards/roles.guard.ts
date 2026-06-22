import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Role hierarchy
    const roleHierarchy: Role[] = [
      'karyawan',
      'atasan',
      'manager_hrga',
      'hrd',
      'admin',
      'super_admin',
    ];
    const userRoleIndex = roleHierarchy.indexOf(user.role as Role);
    const requiredRoleIndex = Math.min(
      ...requiredRoles.map((role) => roleHierarchy.indexOf(role)),
    );

    if (userRoleIndex < requiredRoleIndex) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
