import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, raw, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  const config = app.get(ConfigService);
  const port = config.get<number>('api.port', 3000);
  const host = config.get<string>('api.host', '0.0.0.0');
  const prefix = config.get<string>('api.globalPrefix', 'v1');
  const corsOrigins = config.get<string[]>('api.corsOrigins', []);
  const isProd = config.get<string>('nodeEnv') === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
          connectSrc: ["'self'", 'https://madcreateapi.madprospects.com', 'https://madcreate.madprospects.com'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );
  app.use(cookieParser());

  // Stripe webhook needs the raw body for signature verification. Mount it
  // for the webhook route BEFORE Nest installs its JSON parser, and stash
  // the buffer on the request so the controller can access it.
  app.use(`/${prefix}/billing/webhooks/stripe`, raw({ type: 'application/json' }), (req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) => {
    if (Buffer.isBuffer(req.body)) req.rawBody = req.body;
    next();
  });
  app.use(json({ limit: '10mb' }));

  // CORS: pinned to env-driven origins. Fail closed when API_CORS_ORIGINS is
  // empty - the previous `origin: true` fallback reflected whatever Origin
  // header arrived (lets evil.com talk to the API). In production an empty
  // list is misconfiguration; in dev the operator should add localhost:3013
  // explicitly. We allow no-Origin requests (curl, server-to-server) through
  // by passing undefined to the cors lib in that case.
  if (!corsOrigins.length && isProd) {
    // eslint-disable-next-line no-console -- bootstrap runs before the NestJS logger is initialised
    console.error('[startup] API_CORS_ORIGINS is empty in production - refusing all cross-origin browser requests.');
  }
  app.enableCors({
    origin: (origin, cb) => {
      // No origin header → not a browser CORS request (curl, server fetch).
      if (!origin) return cb(null, true);
      // Empty whitelist + prod = deny everything.
      if (!corsOrigins.length) return cb(null, false);
      // Exact match.
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix only - no URI versioning. Versioning would prepend an extra
  // `/v1/` segment on top of the global prefix, yielding `/v1/v1/...`.
  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(config.get<string>('nodeEnv')));
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (!isProd) {
    const docConfig = new DocumentBuilder()
      .setTitle('MADCreate API')
      .setDescription('AI-native website & app generation platform - REST API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${port}/${prefix}`)
      .build();
    const doc = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('docs', app, doc, { swaggerOptions: { persistAuthorization: true } });
  }

  await app.listen(port, host);
  Logger.log(`🚀 MADCreate API listening on http://${host}:${port}/${prefix}`, 'Bootstrap');
  if (!isProd) Logger.log(`📚 Swagger docs at http://${host}:${port}/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error(err, 'Bootstrap');
  process.exit(1);
});
