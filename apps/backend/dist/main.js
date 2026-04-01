"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const config_1 = require("./database/config");
const mongo_1 = require("./database/mongo");
const global_exception_filter_1 = require("./modules/observability/global-exception.filter");
async function bootstrap() {
    const runtime = (0, config_1.getRuntimeConfig)();
    await (0, mongo_1.connectToDatabase)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.enableVersioning({ type: common_1.VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.enableShutdownHooks();
    const allowedOrigins = (process.env.CORS_ORIGINS || `${runtime.frontendUrl},http://localhost:6011`)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle(process.env.SWAGGER_TITLE || 'Tikur Abay Transport API')
        .setDescription(process.env.SWAGGER_DESCRIPTION || 'Phase 1 MVP API documentation')
        .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
    await app.listen(runtime.port, '::');
    common_1.Logger.log(`Backend listening on http://localhost:${runtime.port}`, 'Bootstrap');
}
process.on('unhandledRejection', (reason) => {
    common_1.Logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`, '', 'Bootstrap');
});
process.on('uncaughtException', (error) => {
    common_1.Logger.error(`Uncaught exception: ${error.message}`, error.stack, 'Bootstrap');
});
void bootstrap();
//# sourceMappingURL=main.js.map