import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private notificationsService: NotificationsService) {}

  @Process('send-push')
  async handleSendPush(job: Job) {
    const { userId, tenantId, ownerId, workspaceId, type, title, body, data, appVariant, sound } = job.data;
    await this.notificationsService.sendPushToUser({
      userId,
      tenantId,
      ownerId,
      workspaceId,
      type,
      title,
      body,
      data,
      appVariant,
      sound,
    });
  }

  @Process('workspace-broadcast')
  async handleWorkspaceBroadcast(job: Job) {
    const { workspaceId, roles, type, title, body, data } = job.data;
    await this.notificationsService.sendPushToWorkspace(workspaceId, roles, {
      type,
      title,
      body,
      data,
    });
  }

  @Process('send-email')
  async handleSendEmail(job: Job) {
    const { to, subject, html } = job.data;
    await this.notificationsService.sendEmail(to, subject, html);
  }
}
