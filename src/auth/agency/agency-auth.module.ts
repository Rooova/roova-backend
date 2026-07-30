import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgencyAuthController } from './agency-auth.controller';
import { AgencyAuthService } from './agency-auth.service';
import { Agency, AgencySchema } from './agency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Agency.name, schema: AgencySchema }]),
  ],
  controllers: [AgencyAuthController],
  providers: [AgencyAuthService],
})
export class AgencyAuthModule {}
