import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/claude-prompt-template.dto';

@Injectable()
export class ClaudePromptTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.claudePromptTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const t = await this.prisma.claudePromptTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Template #${id} not found`);
    return t;
  }

  create(dto: CreateTemplateDto) {
    return this.prisma.claudePromptTemplate.create({
      data: { name: dto.name, description: dto.description ?? null, content: dto.content },
    });
  }

  async update(id: number, dto: UpdateTemplateDto) {
    await this.findOne(id);
    const data: Prisma.ClaudePromptTemplateUpdateInput = {};
    if (dto.name        !== undefined) data.name        = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.content     !== undefined) data.content     = dto.content;
    return this.prisma.claudePromptTemplate.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.claudePromptTemplate.delete({ where: { id } });
  }
}
