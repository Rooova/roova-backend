import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MailModule } from './mail/mail.module';
import { AgencyAuthModule } from './auth/agency/agency-auth.module';
import { AdminAuthModule } from './auth/admin/admin-auth.module';
import { InvestorAuthModule } from './auth/investor/investor-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MailModule,
    AgencyAuthModule,
    AdminAuthModule,
    InvestorAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
