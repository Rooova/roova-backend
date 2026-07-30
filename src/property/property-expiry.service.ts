import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Property, PropertyDocument } from './property.schema';
import { Investment, InvestmentDocument } from '../investment/investment.schema';
import { WalletService } from '../payments/wallet.service';
import { nairaToKobo } from '../payments/money.util';

function isExpired(property: {
  status: string;
  fundingDeadline?: Date | null;
}): boolean {
  return (
    property.status === 'LIVE' &&
    !!property.fundingDeadline &&
    property.fundingDeadline.getTime() <= Date.now()
  );
}

@Injectable()
export class PropertyExpiryService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<InvestmentDocument>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Returns the property in its current, up-to-date status — closing an
   * expired-but-unfunded round and refunding its investments as a side
   * effect if needed. Always re-sweeps any still-CONFIRMED investments on
   * an already-closed property too, regardless of whether this call is the
   * one that performed the closing flip, so a crash mid-refund (or a second
   * caller landing on an already-closed property) can never leave escrowed
   * funds permanently stranded.
   */
  async getCurrent(propertyId: Types.ObjectId | string) {
    let property = await this.propertyModel.findById(propertyId);
    if (!property) return null;

    if (isExpired(property)) {
      await this.propertyModel.updateOne(
        { _id: property._id, status: 'LIVE', fundingDeadline: { $lte: new Date() } },
        { status: 'CLOSED_UNFUNDED' },
      );
      property = await this.propertyModel.findById(propertyId);
    }

    if (property?.status === 'CLOSED_UNFUNDED') {
      await this.refundConfirmedInvestments(property._id);
    }

    return property;
  }

  private async refundConfirmedInvestments(propertyId: Types.ObjectId) {
    const confirmed = await this.investmentModel.find({
      propertyId,
      status: 'CONFIRMED',
    });

    for (const investment of confirmed) {
      await this.walletService.refundEscrow(
        investment.investorId.toString(),
        nairaToKobo(investment.totalAmount),
        investment._id,
      );
      await this.investmentModel.updateOne(
        { _id: investment._id, status: 'CONFIRMED' },
        { status: 'REFUNDED', refundedAt: new Date() },
      );
    }
  }
}
