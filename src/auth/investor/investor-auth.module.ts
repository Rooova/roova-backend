import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestorAuthController } from './investor-auth.controller';
import { InvestorAuthService } from './investor-auth.service';
import { Investor, InvestorSchema } from './investor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Investor.name, schema: InvestorSchema },
    ]),
  ],
  controllers: [InvestorAuthController],
  providers: [InvestorAuthService],
})
export class InvestorAuthModule {}
