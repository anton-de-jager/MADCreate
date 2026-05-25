import { ConfigService } from '@nestjs/config';
export interface StoredFile {
    url: string;
    key: string;
}
export interface StorageDriver {
    readonly name: 'local' | 's3';
    put(prefix: string, file: {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    }): Promise<StoredFile>;
    delete(key: string): Promise<boolean>;
    signedUrl?(key: string, ttlSeconds?: number): Promise<string>;
}
export declare class StorageService implements StorageDriver {
    private readonly config;
    private readonly logger;
    private readonly driver;
    readonly name: 'local' | 's3';
    constructor(config: ConfigService);
    put(prefix: string, file: {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    }): Promise<StoredFile>;
    delete(key: string): Promise<boolean>;
    signedUrl(key: string, ttlSeconds?: number): Promise<string>;
}
