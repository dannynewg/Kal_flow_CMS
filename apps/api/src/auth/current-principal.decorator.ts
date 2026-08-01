import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './authentication.guard';
export const CurrentPrincipal = createParamDecorator((_data:unknown, context:ExecutionContext) => context.switchToHttp().getRequest<AuthenticatedRequest>().principal);
