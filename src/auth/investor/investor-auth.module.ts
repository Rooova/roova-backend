import { Module } from '@nestjs/common';
import { InvestorAuthController } from './investor-auth.controller';
import { InvestorAuthService } from './investor-auth.service';

@Module({
  controllers: [InvestorAuthController],
  providers: [InvestorAuthService],
})
export class InvestorAuthModule {}
