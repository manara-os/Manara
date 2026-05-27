import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

const STAFF_ROLES: UserRole[] = [UserRole.PLATFORM_ADMIN, UserRole.PM_ADMIN, UserRole.PM_OPS];

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async list(workspaceId: string) {
    const wsUsers = await this.prisma.workspaceUser.findMany({
      where: { workspaceId, role: { in: STAFF_ROLES } },
      include: { user: { select: { id: true, fullName: true, phone: true, email: true, avatarUrl: true, lastLoginAt: true, isActive: true, createdAt: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    return wsUsers.map((wu) => {
      const perm = (wu.permissions as any) ?? {};
      return {
        id: wu.id,
        userId: wu.userId,
        role: wu.role,
        isActive: wu.isActive,
        joinedAt: wu.joinedAt,
        title: perm.title ?? this.defaultTitle(wu.role),
        department: perm.department ?? 'Operations',
        escalationLevel: perm.escalationLevel ?? this.defaultEscalation(wu.role),
        reportingManagerId: perm.reportingManagerId ?? null,
        responsibilities: perm.responsibilities ?? [],
        onCallContact: perm.onCallContact ?? wu.user?.phone,
        alternateEmail: perm.alternateEmail ?? null,
        shiftPattern: perm.shiftPattern ?? 'Mon-Fri 9-6',
        fullName: wu.user?.fullName,
        phone: wu.user?.phone,
        email: wu.user?.email,
        avatarUrl: wu.user?.avatarUrl,
        lastLoginAt: wu.user?.lastLoginAt,
      };
    });
  }

  async getEscalationMatrix(workspaceId: string) {
    const team = await this.list(workspaceId);
    // Tier them by escalation level descending: level 4 = top, level 1 = first responder
    const tiers: Record<number, any[]> = { 4: [], 3: [], 2: [], 1: [] };
    for (const m of team) {
      const lvl = Math.max(1, Math.min(4, m.escalationLevel));
      tiers[lvl].push(m);
    }
    return {
      tier4: { label: 'Tier 4 — Executive', sla: '4 hours', members: tiers[4] },
      tier3: { label: 'Tier 3 — Management', sla: '2 hours', members: tiers[3] },
      tier2: { label: 'Tier 2 — Senior ops', sla: '1 hour', members: tiers[2] },
      tier1: { label: 'Tier 1 — First responders', sla: '15 minutes', members: tiers[1] },
    };
  }

  private defaultTitle(role: UserRole): string {
    switch (role) {
      case UserRole.PLATFORM_ADMIN: return 'Platform Administrator';
      case UserRole.PM_ADMIN: return 'Property Manager';
      case UserRole.PM_OPS: return 'Operations Specialist';
      default: return 'Team Member';
    }
  }
  private defaultEscalation(role: UserRole): number {
    switch (role) {
      case UserRole.PLATFORM_ADMIN: return 4;
      case UserRole.PM_ADMIN: return 3;
      case UserRole.PM_OPS: return 1;
      default: return 1;
    }
  }
}
