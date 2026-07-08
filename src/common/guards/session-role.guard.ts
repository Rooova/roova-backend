import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Type,
} from '@nestjs/common';
import type { Request } from 'express';

export function createSessionAuthGuard(
  role: 'AGENCY' | 'ADMIN' | 'INVESTOR',
): Type<CanActivate> {
  @Injectable()
  class SessionAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<Request>();
      if (request.session?.auth?.role !== role) {
        throw new UnauthorizedException('Not authenticated');
      }
      return true;
    }
  }

  return SessionAuthGuard;
}
