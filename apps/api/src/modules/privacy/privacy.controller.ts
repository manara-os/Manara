import { Controller, Get, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrivacyService } from './privacy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Privacy (GDPR / UAE PDPL)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly service: PrivacyService) {}

  @Get('export')
  exportData(@Request() req: any) {
    return this.service.exportPersonalData(req.user.id);
  }

  @Post('delete-account')
  deleteAccount(@Request() req: any) {
    return this.service.requestAccountDeletion(req.user.id);
  }

  @Patch('rectify')
  rectify(@Request() req: any, @Body() body: { field: 'fullName' | 'email' | 'avatarUrl'; value: string }) {
    return this.service.rectify(req.user.id, body.field, body.value);
  }
}
