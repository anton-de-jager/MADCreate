import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({ imports: [TenantsModule], controllers: [MediaController], providers: [MediaService] })
export class MediaModule {}
