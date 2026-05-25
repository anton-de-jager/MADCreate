import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { TemplatesService } from './templates.service';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Public()
  @Get()
  list(
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('search') search?: string,
  ) {
    return this.templates.listPublic({ category, industry, search });
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.templates.get(slug);
  }

  @Post(':slug/instantiate')
  instantiate(@Param('slug') slug: string, @Query('tenantId') tenantId: string) {
    return this.templates.instantiate(tenantId, slug);
  }
}
