import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyController } from './property.controller';
import { AdminPropertyController } from './admin-property.controller';
import { PropertyService } from './property.service';
import { PropertyExpiryService } from './property-expiry.service';
import { Property, PropertySchema } from './property.schema';
import { Investment, InvestmentSchema } from '../investment/investment.schema';
import { Investor, InvestorSchema } from '../auth/investor/investor.schema';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Investment.name, schema: InvestmentSchema },
      { name: Investor.name, schema: InvestorSchema },
    ]),
    PaymentsModule,
  ],
  controllers: [PropertyController, AdminPropertyController],
  providers: [PropertyService, PropertyExpiryService],
  exports: [PropertyExpiryService],
})
export class PropertyModule {}
