import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { addDays, differenceInDays } from 'date-fns';

@Processor('renewal-alerts')
export class RenewalAlertsProcessor {
  private readonly logger = new Logger(RenewalAlertsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @InjectQueue('ejari') private ejariQueue: Queue,
    @InjectQueue('notifications') private notifQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyAlerts() {
    this.logger.log('Running daily renewal alert scan');
    await this.processLeaseRenewals();
    await this.processPmaRenewals();
    await this.processDocumentExpiries();
    await this.processVacancyAlerts();
  }

  @Process('lease-renewal-check')
  async handleLeaseRenewalCheck(job: Job) {
    await this.processLeaseRenewals();
  }

  private async processLeaseRenewals() {
    const today = new Date();
    const thresholds = [90, 60, 30, 7];

    for (const days of thresholds) {
      const targetDate = addDays(today, days);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const expiringLeases = await this.prisma.lease.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          tenant: { select: { userId: true, fullName: true, phone: true } },
          unit: {
            include: {
              property: { include: { owner: { select: { userId: true, fullName: true } } } },
            },
          },
          workspace: { select: { id: true, name: true } },
        },
      });

      for (const lease of expiringLeases) {
        this.logger.log(`Lease ${lease.id} expires in ${days} days`);

        // Notify PM OPS
        await this.notifQueue.add('workspace-broadcast', {
          workspaceId: lease.workspaceId,
          roles: ['PM_ADMIN', 'PM_OPS'],
          type: 'LEASE_EXPIRY',
          title: `Lease Expiring in ${days} Days`,
          body: `${lease.tenant.fullName}'s lease at ${lease.unit.property.name} Unit ${lease.unit.unitNumber} expires on ${lease.endDate.toLocaleDateString()}`,
          data: { leaseId: lease.id, daysRemaining: days },
        });

        // Notify tenant (30 days or less)
        if (days <= 30 && lease.tenant.userId) {
          await this.notifQueue.add('send-push', {
            userId: lease.tenant.userId,
            workspaceId: lease.workspaceId,
            type: 'LEASE_RENEWAL',
            title: 'Lease Renewal Notice',
            body: `Your lease expires in ${days} days. Please contact your property manager regarding renewal.`,
            data: { leaseId: lease.id },
          });
        }

        // Notify owner
        if (days === 60 && lease.unit.property.owner?.userId) {
          await this.notifQueue.add('send-push', {
            userId: lease.unit.property.owner.userId,
            workspaceId: lease.workspaceId,
            type: 'LEASE_EXPIRY',
            title: 'Lease Renewal Required',
            body: `${lease.tenant.fullName}'s lease at Unit ${lease.unit.unitNumber} expires in ${days} days. Renewal offer pending your approval.`,
            data: { leaseId: lease.id, requiresApproval: true },
            appVariant: 'owner',
          });
        }
      }
    }
  }

  private async processPmaRenewals() {
    const today = new Date();
    const thresholds = [60, 30, 7];

    for (const days of thresholds) {
      const targetDate = addDays(today, days);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const expiringOwners = await this.prisma.owner.findMany({
        where: {
          pmaExpiryDate: { gte: startOfDay, lte: endOfDay },
          isActive: true,
        },
        include: {
          workspace: { select: { id: true } },
        },
      });

      for (const owner of expiringOwners) {
        await this.notifQueue.add('workspace-broadcast', {
          workspaceId: owner.workspaceId,
          roles: ['PM_ADMIN'],
          type: 'PMA_RENEWAL',
          title: `PMA Expiring in ${days} Days`,
          body: `Property Management Agreement with ${owner.fullName} expires in ${days} days.`,
          data: { ownerId: owner.id, daysRemaining: days },
        });

        if (owner.userId && days === 30) {
          await this.notifQueue.add('send-push', {
            userId: owner.userId,
            workspaceId: owner.workspaceId,
            type: 'PMA_RENEWAL',
            title: 'PMA Renewal Required',
            body: `Your Property Management Agreement expires in ${days} days. Please review and sign the renewal.`,
            data: { ownerId: owner.id },
            appVariant: 'owner',
          });
        }
      }
    }
  }

  private async processDocumentExpiries() {
    const today = new Date();
    const alertDate = addDays(today, 30);
    const startOfDay = new Date(alertDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(alertDate);
    endOfDay.setHours(23, 59, 59, 999);

    const expiringDocs = await this.prisma.document.findMany({
      where: {
        expiryDate: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
      include: {
        workspace: { select: { id: true } },
      },
    });

    for (const doc of expiringDocs) {
      await this.notifQueue.add('workspace-broadcast', {
        workspaceId: doc.workspaceId,
        roles: ['PM_ADMIN', 'PM_OPS'],
        type: 'DOCUMENT_EXPIRY',
        title: 'Document Expiring Soon',
        body: `${doc.name} (${doc.docType}) expires in 30 days.`,
        data: { documentId: doc.id, entityType: doc.entityType, entityId: doc.entityId },
      });
    }
  }

  private async processVacancyAlerts() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const longVacantUnits = await this.prisma.unit.findMany({
      where: {
        occupancyStatus: 'VACANT',
        deletedAt: null,
        updatedAt: { lte: thirtyDaysAgo },
      },
      include: {
        property: { include: { owner: { select: { userId: true, fullName: true } } } },
        workspace: { select: { id: true } },
      },
    });

    for (const unit of longVacantUnits) {
      const daysVacant = differenceInDays(new Date(), unit.updatedAt);

      await this.notifQueue.add('workspace-broadcast', {
        workspaceId: unit.workspaceId,
        roles: ['PM_ADMIN', 'PM_OPS'],
        type: 'VACANCY_ALERT',
        title: 'Long-term Vacancy Alert',
        body: `Unit ${unit.unitNumber} at ${unit.property.name} has been vacant for ${daysVacant} days.`,
        data: { unitId: unit.id, propertyId: unit.propertyId, daysVacant },
      });

      if (unit.property.owner?.userId) {
        await this.notifQueue.add('send-push', {
          userId: unit.property.owner.userId,
          workspaceId: unit.workspaceId,
          type: 'VACANCY_ALERT',
          title: 'Unit Vacant',
          body: `Unit ${unit.unitNumber} has been vacant for ${daysVacant} days. Contact your PM for listing options.`,
          data: { unitId: unit.id, daysVacant },
          appVariant: 'owner',
        });
      }
    }
  }
}
