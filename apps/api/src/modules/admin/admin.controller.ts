import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { SetFlagDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('tenants')
  tenants(@Query('search') search?: string, @Query('status') status?: string) {
    return this.admin.listTenants(search, status);
  }

  @Get('flags')
  flags() {
    return this.admin.listFeatureFlags();
  }

  @Post('flags')
  setFlag(@Body() body: SetFlagDto) {
    return this.admin.setFlag(body.key, body.enabled, body.workspaceId);
  }

  @Patch('tenants/:id/suspend')
  suspendTenant(@Param('id') id: string) {
    return this.admin.suspendTenant(id);
  }

  @Patch('tenants/:id/unsuspend')
  unsuspendTenant(@Param('id') id: string) {
    return this.admin.unsuspendTenant(id);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.admin.softDeleteTenant(id);
  }
}
