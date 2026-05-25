import { Module } from '@nestjs/common';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { DomainsModule } from '../domains/domains.module';

@Module({ imports: [DomainsModule], controllers: [RenderController], providers: [RenderService] })
export class RenderModule {}
