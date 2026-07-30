import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { Investment, InvestmentSchema } from './investment.schema';
import { Property, PropertySchema } from '../property/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Investment.name, schema: InvestmentSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  controllers: [InvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}
