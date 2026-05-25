import { LayoutsService } from './layouts.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import type { JwtPayload } from '@madcreate/shared';
export declare class LayoutsController {
    private readonly layouts;
    constructor(layouts: LayoutsService);
    list(u: JwtPayload, tenantId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        schema: import("@prisma/client/runtime/library").JsonValue;
        isDefault: boolean;
    }[]>;
    get(u: JwtPayload, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        schema: import("@prisma/client/runtime/library").JsonValue;
        isDefault: boolean;
    }>;
    create(u: JwtPayload, tenantId: string, dto: CreateLayoutDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        schema: import("@prisma/client/runtime/library").JsonValue;
        isDefault: boolean;
    }>;
    update(u: JwtPayload, id: string, dto: UpdateLayoutDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        schema: import("@prisma/client/runtime/library").JsonValue;
        isDefault: boolean;
    }>;
}
