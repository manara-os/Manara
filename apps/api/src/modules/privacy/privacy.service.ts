import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * GDPR + UAE PDPL (Federal Decree-Law No. 45 of 2021) data subject rights.
 *
 *   - export    — full machine-readable dump of a user's PII across all entities
 *   - delete    — soft-delete with 30-day grace period, hard-delete on day 31
 *   - rectify   — update a field on a user-controlled resource
 */
@Injectable()
export class PrivacyService {
  constructor(private prisma: PrismaService) {}

  /** Build a complete data export for the authenticated user. */
  async exportPersonalData(userId: string): Promise<Record<string, any>> {
    const [user, refreshTokens, otps, pushTokens, workspaceUsers] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.refreshToken.findMany({ where: { userId } }),
      this.prisma.otpCode.findMany({ where: { userId } }),
      this.prisma.pushToken.findMany({ where: { userId } }),
      this.prisma.workspaceUser.findMany({ where: { userId }, include: { workspace: { select: { id: true, name: true, slug: true } } } }),
    ]);

    // Find linked tenant/owner/vendor profiles
    const [tenant, owner, vendor] = await Promise.all([
      this.prisma.tenant.findFirst({ where: { userId }, include: { leases: true, rentCollections: true, tickets: true } }),
      this.prisma.owner.findFirst({ where: { userId }, include: { properties: true, ownerSoas: true } }),
      this.prisma.vendor.findFirst({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      legalBasis: 'GDPR Art. 20 / UAE PDPL Art. 8 — right to data portability',
      user,
      workspaceMemberships: workspaceUsers,
      authentication: { refreshTokensCount: refreshTokens.length, otpHistoryCount: otps.length, pushTokensCount: pushTokens.length },
      tenantProfile: tenant,
      ownerProfile: owner,
      vendorProfile: vendor,
    };
  }

  /**
   * Soft-delete user account. Hard-delete is performed by the cron job after grace period.
   * Cascades to detach workspace memberships immediately and revokes tokens.
   */
  async requestAccountDeletion(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive: false, deletedAt: new Date() },
      });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.workspaceUser.updateMany({ where: { userId }, data: { isActive: false } });
      return { status: 'queued_for_deletion', gracePeriodDays: 30, hardDeleteAt: new Date(Date.now() + 30 * 86_400_000) };
    });
  }

  /** Rectify a field on the user's profile. Only a whitelist of fields is editable. */
  async rectify(userId: string, field: 'fullName' | 'email' | 'avatarUrl', value: string) {
    if (!['fullName', 'email', 'avatarUrl'].includes(field)) throw new Error('Field not editable');
    return this.prisma.user.update({ where: { id: userId }, data: { [field]: value } });
  }

  /** Hard-delete users whose grace period has elapsed. Called nightly by cron. */
  async purgeGracePeriodAccounts() {
    const cutoff = new Date(Date.now() - 30 * 86_400_000);
    const purgeable = await this.prisma.user.findMany({
      where: { deletedAt: { not: null, lt: cutoff } },
      select: { id: true },
    });
    let purged = 0;
    for (const u of purgeable) {
      await this.prisma.user.delete({ where: { id: u.id } }).then(() => purged++).catch(() => {});
    }
    return { purged };
  }
}
