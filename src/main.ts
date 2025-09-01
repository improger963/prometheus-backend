import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, LoggingInterceptor } from './common';
// import { API_VERSION_CONFIG } from './common/constants/api-versioning';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend integration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });
  
  // Global exception filter for standardized error responses
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Global logging interceptor for request/response logging
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Enhanced global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );
  
  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Prometheus Backend API')
    .setDescription('Comprehensive API documentation for the Prometheus AI Agent Management Platform. This API enables frontend applications to manage projects, AI agents, tasks, and orchestrate AI-powered workflows.')
    .setVersion(`1.0`)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Projects', 'Project management operations')
    .addTag('Agents', 'AI agent management and configuration')
    .addTag('Tasks', 'Task management and assignment')
    .addTag('Orchestration', 'Task execution and orchestration')
    .addTag('Knowledge', 'Knowledge base management')
    .addTag('Health', 'System health and monitoring endpoints')
    .addServer(`http://localhost:${process.env.PORT || 3000}`, 'Development server')
    .addServer(`https://api.prometheus.example.com`, 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      operationsSorter: 'method',
    },
    customSiteTitle: 'Prometheus API Documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: '',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Prometheus Backend is running on port ${port}`);
  console.log(`📚 API v1 available at http://localhost:${port}/v1`);
  console.log(`📖 Swagger API documentation available at http://localhost:${port}/api-docs`);
  console.log(`🔍 Health check available at http://localhost:${port}/health`);
}
bootstrap();
