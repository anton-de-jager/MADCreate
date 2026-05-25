import { Controller, Delete, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import type { JwtPayload } from '@madcreate/shared';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.media.list(u.sub, tenantId);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  upload(
    @CurrentUser() u: JwtPayload,
    @Query('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.uploadLocal(u.sub, tenantId, file);
  }

  @Delete(':id')
  remove(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.media.remove(u.sub, tenantId, id);
  }
}
