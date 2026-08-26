import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createCorsOriginDelegate } from './infrastructure/config/cors-origin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: createCorsOriginDelegate(process.env.CORS_ORIGIN),
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}

bootstrap();
