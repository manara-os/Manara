import { Controller, Get, Post, Body, Headers, RawBodyRequest, Req, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../auth/guards/workspace.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  @ApiOperation({ summary: 'Get current subscription details' })
  getSubscription(@Request() req: any) {
    return this.billingService.getSubscription(req.workspaceId);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
  @Roles(UserRole.PM_ADMIN)
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  createCheckout(@Request() req: any, @Body() body: { plan: 'PRO' | 'ENTERPRISE'; successUrl: string; cancelUrl: string }) {
    return this.billingService.createCheckoutSession(req.workspaceId, body.plan, body.successUrl, body.cancelUrl);
  }

  @Post('portal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
  @Roles(UserRole.PM_ADMIN)
  @ApiOperation({ summary: 'Create Stripe billing portal session' })
  createPortal(@Request() req: any, @Body('returnUrl') returnUrl: string) {
    return this.billingService.createPortalSession(req.workspaceId, returnUrl);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook handler' })
  handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    return this.billingService.handleWebhook(req.rawBody!, signature);
  }
}
