import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { roleAtLeast, type Role, type JwtPayload } from '@madcreate/shared';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.superAdmin) return true;
    if (!user.role) throw new ForbiddenException('No workspace role on token');

    const passes = required.some((min) => roleAtLeast(user.role as Role, min));
    if (!passes) throw new ForbiddenException(`Requires role ≥ ${required.join(' | ')}`);
    return true;
  }
}
