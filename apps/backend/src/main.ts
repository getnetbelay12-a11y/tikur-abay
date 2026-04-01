import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getRuntimeConfig } from './database/config';
import { connectToDatabase } from './database/mongo';
import { GlobalExceptionFilter } from './modules/observability/global-exception.filter';

async function bootstrap() {
  const runtime = getRuntimeConfig();
  await connectToDatabase();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE || 'Tikur Abay Transport API')
    .setDescription(process.env.SWAGGER_DESCRIPTION || 'Phase 1 MVP API documentation')
    .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(runtime.port, '::');
  Logger.log(`Backend listening on http://localhost:${runtime.port}`, 'Bootstrap');
}

process.on('unhandledRejection', (reason) => {
  Logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`, '', 'Bootstrap');
});

process.on('uncaughtException', (error) => {
  Logger.error(`Uncaught exception: ${error.message}`, error.stack, 'Bootstrap');
});

void bootstrap();
