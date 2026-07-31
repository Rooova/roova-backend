import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { CustomOrigin } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { AppModule } from './app.module';

const DEV_SESSION_SECRET = 'dev-secret-change-me';

async function bootstrap() {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEV_SESSION_SECRET)
  ) {
    throw new Error(
      'SESSION_SECRET must be set to a real random value in production — refusing to start with the dev default.',
    );
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowedOrigins = (
    process.env.FRONTEND_ORIGINS ?? 'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim());

  const corsOrigin: CustomOrigin = (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.use(
    session({
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/roova',
      }),
      secret: process.env.SESSION_SECRET ?? DEV_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        domain: process.env.COOKIE_DOMAIN || undefined,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
