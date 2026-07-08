import { Module } from '@nestjs/common';
import { AgencyAuthController } from './agency-auth.controller';
import { AgencyAuthService } from './agency-auth.service';

@Module({
  controllers: [AgencyAuthController],
  providers: [AgencyAuthService],
})
export class AgencyAuthModule {}
