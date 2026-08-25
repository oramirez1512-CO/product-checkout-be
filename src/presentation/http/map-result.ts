import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DomainError, Result } from '../../domain/result';

export function unwrapResult<T>(result: Result<T>): T {
  if (result.ok) {
    return result.value;
  }
  throw mapDomainError(result.error);
}

export function mapDomainError(error: DomainError): HttpException {
  switch (error.code) {
    case 'NOT_FOUND':
      return new NotFoundException(error.message);
    case 'VALIDATION':
      return new BadRequestException(error.message);
    case 'CONFLICT':
      return new ConflictException(error.message);
    default:
      return new InternalServerErrorException(error.message);
  }
}
