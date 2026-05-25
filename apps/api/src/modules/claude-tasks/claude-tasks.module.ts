import { Module } from '@nestjs/common';
import { ClaudeTasksService } from './claude-tasks.service';
import { ClaudeTasksController } from './claude-tasks.controller';

// StorageService is registered globally via StorageModule (@Global),
// so we don't need to import StorageModule here.
@Module({
  controllers: [ClaudeTasksController],
  providers: [ClaudeTasksService],
  exports: [ClaudeTasksService],
})
export class ClaudeTasksModule {}
