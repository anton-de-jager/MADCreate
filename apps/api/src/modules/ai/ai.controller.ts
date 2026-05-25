import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { SubmitGenerationDto } from './dto/submit-generation.dto';
import type { AIGenerateRequest, JwtPayload } from '@madcreate/shared';

class GenerateDto implements AIGenerateRequest {
  @IsEnum(['SITE', 'PAGE', 'SECTION', 'COPY', 'THEME', 'PALETTE', 'TYPOGRAPHY', 'IMAGE_PROMPT', 'SEO', 'SCHEMA', 'WORKFLOW'])
  kind!: AIGenerateRequest['kind'];
  @IsOptional() @IsString() promptKey?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() variables?: Record<string, unknown>;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsString() userPrompt?: string;
  @IsOptional() temperature?: number;
  @IsOptional() maxTokens?: number;
  @IsOptional() jsonMode?: boolean;
  @IsOptional() provider?: AIGenerateRequest['provider'];
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** SSE stream that emits a ping on every generation mutation. */
  @Sse('events')
  events(): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const send = () => subscriber.next({ data: { ts: Date.now() } } as MessageEvent);
      const unsub = this.ai.onChange(send);
      const hb = setInterval(() => subscriber.next({ data: { heartbeat: true } } as MessageEvent), 30_000);
      return () => { unsub(); clearInterval(hb); };
    });
  }

  @Post('generate')
  enqueue(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Body() dto: GenerateDto) {
    return this.ai.enqueue(u.sub, tenantId, dto);
  }

  @Get('generations')
  list(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.ai.listGenerations(u.sub, tenantId);
  }

  @Get('generations/:id')
  get(@CurrentUser() u: JwtPayload, @Param('id') id: string, @Req() req: Request & { worker?: boolean }) {
    return this.ai.getGeneration(req.worker ? undefined : u.sub, id);
  }

  /**
   * Manual-provider paste-back. Body accepts either:
   *   { raw: "...string from Claude Code..." }
   *   { json: { ...parsed object... } }
   * Validates, applies the site, transitions to SUCCESS.
   */
  @Post('generations/:id/submit')
  submit(@CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() body: SubmitGenerationDto, @Req() req: Request & { worker?: boolean }) {
    const payload = body?.raw ?? body?.json;
    if (payload == null) {
      throw new BadRequestException('Body must include either raw (string) or json (object).');
    }
    return this.ai.submitManualOutput(req.worker ? undefined : u.sub, id, payload);
  }
}
