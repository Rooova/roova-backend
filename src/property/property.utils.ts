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

/** Returns true if the property was closed (and its investments refunded) as a result of this call. */
export async function closePropertyIfExpired(
  propertyModel: Model<PropertyDocument>,
  investmentModel: Model<InvestmentDocument>,
  propertyId: Types.ObjectId | string,
): Promise<boolean> {
  const closed = await propertyModel.findOneAndUpdate(
    { _id: propertyId, status: 'LIVE', fundingDeadline: { $lte: new Date() } },
    { status: 'CLOSED_UNFUNDED' },
  );

  if (!closed) return false;

  await investmentModel.updateMany(
    { propertyId: closed._id, status: 'CONFIRMED' },
    { status: 'REFUNDED', refundedAt: new Date() },
  );
  return true;
}
