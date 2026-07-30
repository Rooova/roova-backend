import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Type,
} from '@nestjs/common';
import type { Request } from 'express';

export type SessionRole = 'AGENCY' | 'ADMIN' | 'INVESTOR';

export function createSessionAuthGuard(
  role: SessionRole | SessionRole[],
): Type<CanActivate> {
  const allowedRoles = Array.isArray(role) ? role : [role];

  @Injectable()
  class SessionAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<Request>();
      const sessionRole = request.session?.auth?.role;
      if (!sessionRole || !allowedRoles.includes(sessionRole)) {
        throw new UnauthorizedException('Not authenticated');
      }
      return true;
    }
  }

  return SessionAuthGuard;
}
