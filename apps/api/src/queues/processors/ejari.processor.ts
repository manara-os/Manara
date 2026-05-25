import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EjariService } from '../../integrations/ejari/ejari.service';

@Processor('ejari')
export class EjariProcessor {
  private readonly logger = new Logger(EjariProcessor.name);

  constructor(private ejariService: EjariService) {}

  @Process('register')
  async handleEjariRegistration(job: Job<{ leaseId: string; workspaceId: string }>) {
    const { leaseId, workspaceId } = job.data;
    this.logger.log(`Processing Ejari registration for lease ${leaseId} (attempt ${job.attemptsMade + 1})`);

    try {
      await this.ejariService.registerLease(leaseId, workspaceId);
      this.logger.log(`Ejari registration complete for lease ${leaseId}`);
    } catch (error) {
      this.logger.error(`Ejari registration failed for lease ${leaseId}`, error);
      if (job.attemptsMade >= 2) {
        this.logger.error(`Max retries reached for Ejari registration of lease ${leaseId}. Manual intervention required.`);
      }
      throw error;
    }
  }
}
