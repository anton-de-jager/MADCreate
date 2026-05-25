import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import type { JwtPayload } from '@madcreate/shared';

class UpdateWorkspaceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEmail() billingEmail?: string;
}

class AcceptInviteDto {
  @IsString() @IsNotEmpty() token!: string;
}

class InviteDto {
  @IsEmail() email!: string;
  @IsEnum(Role) role!: Role;
}

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post('invites/accept')
  acceptInvite(@CurrentUser() user: JwtPayload, @Body() dto: AcceptInviteDto) {
    return this.workspaces.acceptInvite(user.sub, dto.token);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.workspaces.listMine(user.sub);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.workspaces.get(user.sub, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspaces.update(user.sub, id, dto);
  }

  @Post(':id/invites')
  invite(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: InviteDto) {
    return this.workspaces.invite(user.sub, id, dto);
  }

  @Get(':id/members')
  members(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.workspaces.members(user.sub, id);
  }

  @Get(':id/stats')
  stats(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.workspaces.stats(user.sub, id);
  }

  /** Leave a workspace I'm a member of. Use DELETE on .../members/me for REST symmetry. */
  @Post(':id/members/leave')
  leave(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.workspaces.leave(user.sub, id);
  }
}
