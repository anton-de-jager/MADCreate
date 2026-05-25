import { BadRequestException, Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { BillingService } from './billing.service';
import { CheckoutDto, PortalDto } from './dto/billing.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Public()
  @Get('plans')
  plans() {
    return this.billing.publicPlans();
  }

  @ApiBearerAuth()
  @Get('subscription')
  subscription(@Query('workspaceId') workspaceId: string) {
    return this.billing.subscription(workspaceId);
  }

  @ApiBearerAuth()
  @Post('checkout')
  checkout(@Body() body: CheckoutDto) {
    return this.billing.startCheckout(body.workspaceId, body.planCode, body.interval ?? 'MONTHLY');
  }

  @ApiBearerAuth()
  @Post('portal')
  portal(@Body() body: PortalDto) {
    return this.billing.createPortalSession(body.workspaceId);
  }

  /**
   * Stripe webhook. MUST receive the raw body for signature verification.
   * main.ts mounts `express.raw({ type: 'application/json' })` for this route.
   */
  @Public()
  @Post('webhooks/stripe')
  async stripeWebhook(@Req() req: Request, @Headers('stripe-signature') sig: string) {
    if (!sig) throw new BadRequestException('Missing stripe-signature header');
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw) throw new BadRequestException('No raw body - check express.raw() middleware for the stripe webhook route');
    return this.billing.handleWebhook(raw, sig);
  }
}
