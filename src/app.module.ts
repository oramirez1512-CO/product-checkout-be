import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import {
  CreateDeliveryUseCase,
  UpsertCustomerUseCase,
} from './application/use-cases/checkout.use-cases';
import {
  GetProductUseCase,
  ListProductsUseCase,
} from './application/use-cases/products.use-cases';
import {
  CreatePendingTransactionUseCase,
  GetTransactionUseCase,
} from './application/use-cases/transactions.use-cases';
import { feesConfigProvider } from './infrastructure/config/fees';
import { persistenceProviders } from './infrastructure/persistence/postgres';
import { ApiKeyValidator } from './presentation/auth/api-key-validator';
import { CheckoutController } from './presentation/controllers/checkout.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { ProductsController } from './presentation/controllers/products.controller';
import { TransactionsController } from './presentation/controllers/transactions.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    HealthController,
    ProductsController,
    CheckoutController,
    TransactionsController,
  ],
  providers: [
    ...persistenceProviders,
    feesConfigProvider(),
    { provide: APP_GUARD, useClass: ApiKeyValidator },
    ListProductsUseCase,
    GetProductUseCase,
    UpsertCustomerUseCase,
    CreateDeliveryUseCase,
    CreatePendingTransactionUseCase,
    GetTransactionUseCase,
  ],
})
export class AppModule {}
