import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyController } from './property.controller';
import { AdminPropertyController } from './admin-property.controller';
import { PropertyService } from './property.service';
import { Property, PropertySchema } from './property.schema';
import { Investment, InvestmentSchema } from '../investment/investment.schema';
import { Investor, InvestorSchema } from '../auth/investor/investor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Investment.name, schema: InvestmentSchema },
      { name: Investor.name, schema: InvestorSchema },
    ]),
  ],
  controllers: [PropertyController, AdminPropertyController],
  providers: [PropertyService],
})
export class PropertyModule {}
