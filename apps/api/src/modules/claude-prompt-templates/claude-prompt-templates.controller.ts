import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClaudePromptTemplatesService } from './claude-prompt-templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/claude-prompt-template.dto';

@ApiTags('claude-prompt-templates')
@ApiBearerAuth()
@Controller('claude-prompt-templates')
export class ClaudePromptTemplatesController {
  constructor(private readonly service: ClaudePromptTemplatesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateTemplateDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
