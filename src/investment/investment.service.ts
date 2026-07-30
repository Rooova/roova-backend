import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Investment, InvestmentDocument } from './investment.schema';
import { Property, PropertyDocument } from '../property/property.schema';
import { PropertyExpiryService } from '../property/property-expiry.service';
import { WalletService } from '../payments/wallet.service';
import { nairaToKobo } from '../payments/money.util';
import { isDuplicateKeyError } from '../common/utils/mongo.util';
import { CreateInvestmentDto } from './dto/create-investment.dto';

function toInvestmentSummary(investment: InvestmentDocument) {
  return {
    id: investment._id.toString(),
    propertyId: investment.propertyId.toString(),
    shares: investment.shares,
    pricePerShare: investment.pricePerShare,
    totalAmount: investment.totalAmount,
    status: investment.status,
    createdAt: investment.createdAt,
  };
}

@Injectable()
export class InvestmentService {
  constructor(
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<InvestmentDocument>,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    private readonly propertyExpiry: PropertyExpiryService,
    private readonly walletService: WalletService,
  ) {}

  async create(investorId: string, dto: CreateInvestmentDto) {
    const property = await this.propertyExpiry.getCurrent(dto.propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status !== 'LIVE') {
      throw new ConflictException(
        'This property is not currently accepting investments',
      );
    }

    const totalAmount = dto.shares * property.sharePrice;
    const totalAmountKobo = nairaToKobo(totalAmount);
    const investorObjectId = new Types.ObjectId(investorId);

    let investment: InvestmentDocument;
    try {
      investment = await this.investmentModel.create({
        investorId: investorObjectId,
        propertyId: property._id,
        shares: dto.shares,
        pricePerShare: property.sharePrice,
        totalAmount,
        status: 'PENDING',
        clientReference: dto.clientReference,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Duplicate investment request');
      }
      throw error;
    }

    try {
      await this.walletService.escrow(
        investorId,
        totalAmountKobo,
        investment._id,
      );
    } catch (error) {
      investment.status = 'CANCELLED';
      await investment.save();
      throw error;
    }

    const updatedProperty = await this.propertyModel.findOneAndUpdate(
      {
        _id: property._id,
        status: 'LIVE',
        $expr: {
          $lte: [{ $add: ['$sharesSold', dto.shares] }, '$totalShares'],
        },
      },
      [
        {
          $set: {
            sharesSold: { $add: ['$sharesSold', dto.shares] },
            raised: { $add: ['$raised', totalAmount] },
            investorIds: { $setUnion: ['$investorIds', [investorObjectId]] },
          },
        },
        { $set: { investors: { $size: '$investorIds' } } },
      ],
      { new: true },
    );

    if (!updatedProperty) {
      await this.walletService.refundEscrow(
        investorId,
        totalAmountKobo,
        investment._id,
      );
      investment.status = 'CANCELLED';
      await investment.save();
      throw new ConflictException('Not enough shares remaining');
    }

    if (
      updatedProperty.totalShares !== null &&
      updatedProperty.totalShares !== undefined &&
      updatedProperty.sharesSold >= updatedProperty.totalShares
    ) {
      await this.propertyModel.updateOne(
        { _id: updatedProperty._id, status: 'LIVE' },
        { status: 'FUNDED' },
      );
    }

    investment.status = 'CONFIRMED';
    await investment.save();

    return toInvestmentSummary(investment);
  }

  async findMine(investorId: string) {
    const investments = await this.investmentModel
      .find({ investorId })
      .sort({ createdAt: -1 });

    const propertyIds = [
      ...new Set(
        investments.map((investment) => investment.propertyId.toString()),
      ),
    ];
    const properties = await this.propertyModel.find(
      { _id: { $in: propertyIds } },
      { title: 1, location: 1, status: 1, tier: 1 },
    );
    const propertyById = new Map(
      properties.map((property) => [property._id.toString(), property]),
    );

    return investments.map((investment) => {
      const property = propertyById.get(investment.propertyId.toString());
      return {
        investment: toInvestmentSummary(investment),
        property: property
          ? {
              id: property._id.toString(),
              title: property.title,
              location: property.location,
              status: property.status,
              tier: property.tier,
            }
          : null,
      };
    });
  }
}
