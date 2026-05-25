import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly nodeEnv?;
    private readonly logger;
    constructor(nodeEnv?: string | undefined);
    catch(exception: unknown, host: ArgumentsHost): void;
}
