import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { FormsController } from './forms.controller';
import { LeadsController } from './leads.controller';
import { FormsService } from './forms.service';
import { LeadsService } from './leads.service';

@Module({
  imports: [TenantsModule],
  controllers: [FormsController, LeadsController],
  providers: [FormsService, LeadsService],
  exports: [FormsService, LeadsService],
})
export class FormsModule {}
