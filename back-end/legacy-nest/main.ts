import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import express, { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

/**
 * Main entry point of the BillBhai Backend.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || `bb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    res.setHeader('x-request-id', Array.isArray(requestId) ? requestId[0] : requestId);
    next();
  };

  const appLogger = (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${durationMs}ms)`,
      );
    });
    next();
  };

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many login attempts. Please try again later.',
    },
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 250,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this client.',
    },
  });

  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }));
  app.use(
    cors({
      origin: [
        'https://billbhai.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:3000',
        'http://localhost:3000',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-role'],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(appLogger);
  app.use('/api/auth', loginLimiter);
  app.use('/api', apiLimiter);

  app.setGlobalPrefix('api', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('BillBhai API')
    .setDescription(
      'The BillBhai Retail Order Processing System API Documentation',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-role', in: 'header' }, 'x-role')
    .addSecurityRequirements('x-role')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log('----------------------------------------------------');
  console.log(`BillBhai Backend is running on: http://localhost:${port}`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api`);
  console.log(`API prefix: http://localhost:${port}/api`);
  console.log(
    'Example endpoints: /api/auth/login, /api/products, /api/orders',
  );
  console.log('----------------------------------------------------');
}
void bootstrap();
