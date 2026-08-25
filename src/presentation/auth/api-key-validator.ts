import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

export const API_KEY_HEADER = 'x-api-key';

@Injectable()
export class ApiKeyValidator implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Keep health open for uptime checks / Vercel probes.
    if (request.path === '/health' || request.url?.startsWith('/health')) {
      return true;
    }

    const expected = process.env.API_KEY?.trim();
    if (!expected) {
      throw new UnauthorizedException('API key is not configured');
    }

    const provided = request.header(API_KEY_HEADER)?.trim();
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
