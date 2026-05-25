import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const QUEUE_AI = 'ai-generation';
export const QUEUE_DEPLOY = 'deployments';
export const QUEUE_DOMAIN = 'domain-verification';
export const QUEUE_EMAIL = 'email';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host') ?? 'localhost',
          port: config.get<number>('redis.port') ?? 6379,
          password: config.get<string>('redis.password') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86_400 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_AI },
      { name: QUEUE_DEPLOY },
      { name: QUEUE_DOMAIN },
      { name: QUEUE_EMAIL },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
