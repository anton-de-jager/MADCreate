import { ClaudePromptTemplatesService } from './claude-prompt-templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/claude-prompt-template.dto';
export declare class ClaudePromptTemplatesController {
    private readonly service;
    constructor(service: ClaudePromptTemplatesService);
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
    }[]>;
    findOne(id: number): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
    }>;
    create(dto: CreateTemplateDto): import("@prisma/client").Prisma.Prisma__ClaudePromptTemplateClient<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: number, dto: UpdateTemplateDto): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        content: string;
    }>;
    remove(id: number): Promise<void>;
}
