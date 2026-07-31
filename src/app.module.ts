import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MailModule } from './mail/mail.module';
import { AgencyAuthModule } from './auth/agency/agency-auth.module';
import { AdminAuthModule } from './auth/admin/admin-auth.module';
import { InvestorAuthModule } from './auth/investor/investor-auth.module';
import { PropertyModule } from './property/property.module';
import { InvestmentModule } from './investment/investment.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 20 }]),
    DatabaseModule,
    MailModule,
    AgencyAuthModule,
    AdminAuthModule,
    InvestorAuthModule,
    PropertyModule,
    InvestmentModule,
    MarketplaceModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
