"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const nestjs_pino_1 = require("nestjs-pino");
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = require("express");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    const config = app.get(config_1.ConfigService);
    const port = config.get('api.port', 3000);
    const host = config.get('api.host', '0.0.0.0');
    const prefix = config.get('api.globalPrefix', 'v1');
    const corsOrigins = config.get('api.corsOrigins', []);
    const isProd = config.get('nodeEnv') === 'production';
    app.use((0, helmet_1.default)({
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
    }));
    app.use((0, cookie_parser_1.default)());
    app.use(`/${prefix}/billing/webhooks/stripe`, (0, express_1.raw)({ type: 'application/json' }), (req, _res, next) => {
        if (Buffer.isBuffer(req.body))
            req.rawBody = req.body;
        next();
    });
    app.use((0, express_1.json)({ limit: '10mb' }));
    if (!corsOrigins.length && isProd) {
        console.error('[startup] API_CORS_ORIGINS is empty in production - refusing all cross-origin browser requests.');
    }
    app.enableCors({
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (!corsOrigins.length)
                return cb(null, false);
            if (corsOrigins.includes(origin))
                return cb(null, true);
            return cb(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    app.setGlobalPrefix(prefix);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter(config.get('nodeEnv')));
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    if (!isProd) {
        const docConfig = new swagger_1.DocumentBuilder()
            .setTitle('MADCreate API')
            .setDescription('AI-native website & app generation platform - REST API')
            .setVersion('0.1.0')
            .addBearerAuth()
            .addServer(`http://localhost:${port}/${prefix}`)
            .build();
        const doc = swagger_1.SwaggerModule.createDocument(app, docConfig);
        swagger_1.SwaggerModule.setup('docs', app, doc, { swaggerOptions: { persistAuthorization: true } });
    }
    await app.listen(port, host);
    common_1.Logger.log(`🚀 MADCreate API listening on http://${host}:${port}/${prefix}`, 'Bootstrap');
    if (!isProd)
        common_1.Logger.log(`📚 Swagger docs at http://${host}:${port}/docs`, 'Bootstrap');
}
bootstrap().catch((err) => {
    common_1.Logger.error(err, 'Bootstrap');
    process.exit(1);
});
//# sourceMappingURL=main.js.map