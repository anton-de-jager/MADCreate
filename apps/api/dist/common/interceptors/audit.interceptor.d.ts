import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AuditInterceptor implements NestInterceptor {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown>;
    private write;
}
