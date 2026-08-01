import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';
export const REQUIRED_PERMISSIONS_KEY = 'kal-flow:required-permissions';
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
