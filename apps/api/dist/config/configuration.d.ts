export interface AppConfig {
    nodeEnv: 'development' | 'production' | 'test';
    appName: string;
    appVersion: string;
    api: {
        host: string;
        port: number;
        globalPrefix: string;
        corsOrigins: string[];
        publicDomain: string;
    };
    web: {
        publicDomain: string;
        url: string;
        apexIp: string;
    };
    db: {
        url: string;
    };
    redis: {
        url: string;
        host: string;
        port: number;
        password?: string;
    };
    jwt: {
        secret: string;
        accessTtl: string;
        refreshSecret: string;
        refreshTtl: string;
        passwordResetTtl: string;
        emailVerificationTtl: string;
        magicLinkTtl: string;
    };
    smtp: {
        host?: string;
        port: number;
        user?: string;
        pass?: string;
        from: string;
    };
    storage: {
        driver: 'local' | 's3';
        localForced: boolean;
        localPath: string;
        publicUrl: string;
        s3?: {
            endpoint?: string;
            region?: string;
            bucket?: string;
            accessKey?: string;
            secretKey?: string;
            publicUrl?: string;
            forceSignedUrls: boolean;
        };
    };
    stripe?: {
        secretKey?: string;
        webhookSecret?: string;
    };
    claude?: {
        workerToken?: string;
    };
    cloudflare?: {
        apiToken?: string;
        accountId?: string;
        zoneId?: string;
    };
    deployments: {
        digitalOcean?: {
            token?: string;
            appId?: string;
        };
        vercel?: {
            token?: string;
            projectId?: string;
            teamId?: string;
        };
        docker?: {
            image?: string;
            registryUser?: string;
            registryPass?: string;
            baseImage?: string;
        };
        cloudflarePages?: {
            apiToken?: string;
            accountId?: string;
            projectName?: string;
        };
        ftp?: {
            host?: string;
            port?: number;
            user?: string;
            pass?: string;
            remotePath?: string;
        };
        sftp?: {
            host?: string;
            port?: number;
            user?: string;
            pass?: string;
            keyPath?: string;
            remotePath?: string;
        };
    };
    log: {
        level: string;
        pretty: boolean;
    };
    features: {
        aiGeneration: boolean;
        visualBuilder: boolean;
        customDomains: boolean;
        billing: boolean;
    };
}
export declare const configuration: () => AppConfig;
export declare function validateConfig(env: Record<string, unknown>): Record<string, unknown>;
