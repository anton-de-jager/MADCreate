import { ThemesService } from './themes.service';
import type { JwtPayload } from '@madcreate/shared';
declare class CreateThemeDto {
    name: string;
    tokens: unknown;
}
declare class UpdateThemeDto {
    name?: string;
    tokens?: unknown;
    isActive?: boolean;
}
export declare class ThemesController {
    private readonly themes;
    constructor(themes: ThemesService);
    list(user: JwtPayload, tenantId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
    }[]>;
    get(user: JwtPayload, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
    }>;
    create(user: JwtPayload, tenantId: string, dto: CreateThemeDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
    }>;
    update(user: JwtPayload, id: string, dto: UpdateThemeDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
    }>;
    remove(user: JwtPayload, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
    }>;
}
export {};
