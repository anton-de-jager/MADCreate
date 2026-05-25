import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import type { JwtPayload, OnboardingAnswers } from '@madcreate/shared';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  get(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.onboarding.getAnswers(u.sub, tenantId);
  }

  @Post()
  save(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Body() answers: OnboardingAnswers) {
    return this.onboarding.saveAnswers(u.sub, tenantId, answers);
  }

  @Post('generate')
  generate(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.onboarding.generateFromAnswers(u.sub, tenantId);
  }
}
