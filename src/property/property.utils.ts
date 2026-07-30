import { Model, Types } from 'mongoose';
import { PropertyDocument } from './property.schema';
import { InvestmentDocument } from '../investment/investment.schema';

export function isFundingExpired(property: {
  status: string;
  fundingDeadline?: Date | null;
}): boolean {
  return (
    property.status === 'LIVE' &&
    !!property.fundingDeadline &&
    property.fundingDeadline.getTime() <= Date.now()
  );
}

export async function closePropertyIfExpired(
  propertyModel: Model<PropertyDocument>,
  investmentModel: Model<InvestmentDocument>,
  propertyId: Types.ObjectId | string,
): Promise<PropertyDocument | null> {
  const closed = await propertyModel.findOneAndUpdate(
    { _id: propertyId, status: 'LIVE', fundingDeadline: { $lte: new Date() } },
    { status: 'CLOSED_UNFUNDED' },
    { new: true },
  );

  if (closed) {
    await investmentModel.updateMany(
      { propertyId: closed._id, status: 'CONFIRMED' },
      { status: 'REFUNDED', refundedAt: new Date() },
    );
  }

  return closed;
}
