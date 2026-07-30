import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { Investment, InvestmentSchema } from './investment.schema';
import { Property, PropertySchema } from '../property/property.schema';
import { PropertyModule } from '../property/property.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Investment.name, schema: InvestmentSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
    PropertyModule,
    PaymentsModule,
  ],
  controllers: [InvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}
