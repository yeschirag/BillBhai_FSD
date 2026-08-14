import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { verifyToken } from '../utils/jwt.util';

@Injectable()
export class AuthJwtGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: any }>();

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyToken(token);
      request.user = decoded;

      const userRole = String(decoded.role || '').trim().toLowerCase().replace(/\s+/g, '');
      const allowedRoles = requiredRoles.map((role) =>
        String(role).trim().toLowerCase().replace(/\s+/g, ''),
      );

      if (!allowedRoles.includes(userRole)) {
        throw new ForbiddenException(
          `Access denied for role: ${decoded.role}. Allowed roles: ${requiredRoles.join(', ')}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
