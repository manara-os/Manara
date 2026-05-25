import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  phone: string;
  workspaceId: string | null;
  role: UserRole;
  countryCode: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}
