// Centralised, typed config. Read via ConfigService.get('section.key').

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

export const configuration = (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  appName: process.env.APP_NAME ?? 'MADCreate',
  appVersion: process.env.APP_VERSION ?? '0.1.0',

  api: {
    host: process.env.API_HOST ?? '0.0.0.0',
    port: Number(process.env.API_PORT ?? 4213),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'v1',
    corsOrigins: (process.env.API_CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    publicDomain: process.env.API_PUBLIC_DOMAIN ?? 'madcreateapi.madprospects.com',
  },

  web: {
    publicDomain: process.env.APP_PUBLIC_DOMAIN ?? 'madcreate.madprospects.com',
    url: process.env.APP_URL ?? 'http://localhost:3013',
    apexIp: process.env.APEX_IP ?? '208.113.128.35',
  },

  db: {
    url: process.env.DATABASE_URL ?? 'mysql://madcreate:madcreate@localhost:3306/madcreate',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-jwt-secret-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-only-refresh-secret-change-me',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    passwordResetTtl: process.env.PASSWORD_RESET_TTL ?? '1h',
    emailVerificationTtl: process.env.EMAIL_VERIFICATION_TTL ?? '24h',
    magicLinkTtl: process.env.MAGIC_LINK_TTL ?? '15m',
  },

  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM ?? 'MADCreate <no-reply@madcreate.madprospects.com>',
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
    localForced: process.env.STORAGE_LOCAL_FORCED === '1',
    localPath: process.env.STORAGE_LOCAL_PATH ?? './storage/uploads',
    publicUrl: process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:4213/media',
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      publicUrl: process.env.S3_PUBLIC_URL,
      forceSignedUrls: process.env.S3_FORCE_SIGNED_URLS === '1',
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  claude: {
    workerToken: process.env.CLAUDE_WORKER_TOKEN,
  },

  cloudflare: {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
  },

  deployments: {
    digitalOcean: {
      token: process.env.DIGITALOCEAN_TOKEN,
      appId: process.env.DIGITALOCEAN_APP_ID,
    },
    vercel: {
      token: process.env.VERCEL_TOKEN,
      projectId: process.env.VERCEL_PROJECT_ID,
      teamId: process.env.VERCEL_TEAM_ID,
    },
    docker: {
      image: process.env.DOCKER_IMAGE,
      registryUser: process.env.DOCKER_REGISTRY_USER,
      registryPass: process.env.DOCKER_REGISTRY_PASS,
      baseImage: process.env.DOCKER_BASE_IMAGE,
    },
    cloudflarePages: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      projectName: process.env.CLOUDFLARE_PROJECT_NAME,
    },
    ftp: {
      host: process.env.FTP_HOST,
      port: Number(process.env.FTP_PORT ?? 21),
      user: process.env.FTP_USER,
      pass: process.env.FTP_PASS,
      remotePath: process.env.FTP_REMOTE_PATH,
    },
    sftp: {
      host: process.env.SFTP_HOST,
      port: Number(process.env.SFTP_PORT ?? 22),
      user: process.env.SFTP_USER,
      pass: process.env.SFTP_PASS,
      keyPath: process.env.SFTP_KEY_PATH,
      remotePath: process.env.SFTP_REMOTE_PATH,
    },
  },

  log: {
    level: process.env.LOG_LEVEL ?? 'info',
    pretty: process.env.LOG_PRETTY !== 'false',
  },

  features: {
    aiGeneration: process.env.FEATURE_AI_GENERATION !== 'false',
    visualBuilder: process.env.FEATURE_VISUAL_BUILDER !== 'false',
    customDomains: process.env.FEATURE_CUSTOM_DOMAINS !== 'false',
    billing: process.env.FEATURE_BILLING === 'true',
  },
});

export function validateConfig(env: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!env[key]) {
      // Soft warn in dev, hard fail in prod.
      const msg = `Missing required env: ${key}`;
      if (env.NODE_ENV === 'production') throw new Error(msg);
      // eslint-disable-next-line no-console -- startup validation runs before the logger is available
      console.warn(`[config] ${msg} — using insecure default for development`);
    }
  }
  return env;
}
