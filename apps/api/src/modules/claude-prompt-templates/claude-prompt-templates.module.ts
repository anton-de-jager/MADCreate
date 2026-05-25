import { Module } from '@nestjs/common';
import { ClaudePromptTemplatesController } from './claude-prompt-templates.controller';
import { ClaudePromptTemplatesService } from './claude-prompt-templates.service';

@Module({
  controllers: [ClaudePromptTemplatesController],
  providers: [ClaudePromptTemplatesService],
})
export class ClaudePromptTemplatesModule {}
