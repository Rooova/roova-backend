import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Property, PropertyDocument, PropertyStatus } from './property.schema';
import {
  Investment,
  InvestmentDocument,
} from '../investment/investment.schema';
import { Investor, InvestorDocument } from '../auth/investor/investor.schema';
import { closePropertyIfExpired, isFundingExpired } from './property.utils';
import { SessionRole } from '../common/guards/session-role.guard';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { RejectPropertyDto } from './dto/reject-property.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const EDITABLE_STATUSES: PropertyStatus[] = ['DRAFT', 'REJECTED'];

function toPropertySummary(property: PropertyDocument) {
  const daysRemaining = property.fundingDeadline
    ? Math.max(
        0,
        Math.ceil((property.fundingDeadline.getTime() - Date.now()) / DAY_MS),
      )
    : property.fundingWindowDays;

  return {
    id: property._id.toString(),
    agencyId: property.agencyId.toString(),
    location: property.location,
    title: property.title,
    tier: property.tier,
    status: property.status,
    yieldPct: property.yieldPct,
    raised: property.raised,
    target: property.target,
    investors: property.investors,
    daysRemaining,
    sharePrice: property.sharePrice,
    sharesSold: property.sharesSold,
    totalShares: property.totalShares ?? null,
    description: property.description ?? null,
    images: property.images,
    rejectionReason: property.rejectionReason ?? null,
    reviewedAt: property.reviewedAt ?? null,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  };
}

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<InvestmentDocument>,
    @InjectModel(Investor.name)
    private readonly investorModel: Model<InvestorDocument>,
  ) {}

  async create(agencyId: string, dto: CreatePropertyDto) {
    const property = await this.propertyModel.create({
      agencyId: new Types.ObjectId(agencyId),
      title: dto.title,
      location: dto.location,
      tier: dto.tier,
      target: dto.target,
      sharePrice: dto.sharePrice,
      yieldPct: dto.yieldPct,
      fundingWindowDays: dto.daysRemaining,
    });
    return toPropertySummary(property);
  }

  async findMine(agencyId: string) {
    const properties = await this.propertyModel
      .find({ agencyId })
      .sort({ createdAt: -1 });
    return properties.map(toPropertySummary);
  }

  async updateMine(agencyId: string, id: string, dto: UpdatePropertyDto) {
    const property = await this.getOwned(agencyId, id);
    if (!EDITABLE_STATUSES.includes(property.status)) {
      throw new ConflictException(
        'Only draft or rejected properties can be edited',
      );
    }

    if (dto.title !== undefined) property.title = dto.title;
    if (dto.location !== undefined) property.location = dto.location;
    if (dto.tier !== undefined) property.tier = dto.tier;
    if (dto.target !== undefined) property.target = dto.target;
    if (dto.sharePrice !== undefined) property.sharePrice = dto.sharePrice;
    if (dto.yieldPct !== undefined) property.yieldPct = dto.yieldPct;
    if (dto.daysRemaining !== undefined)
      property.fundingWindowDays = dto.daysRemaining;
    if (dto.description !== undefined) property.description = dto.description;

    await property.save();
    return toPropertySummary(property);
  }

  async submitMine(agencyId: string, id: string) {
    const property = await this.getOwned(agencyId, id);
    if (!EDITABLE_STATUSES.includes(property.status)) {
      throw new ConflictException(
        'Only draft or rejected properties can be submitted for review',
      );
    }
    property.status = 'PENDING_REVIEW';
    property.rejectionReason = null;
    await property.save();
    return toPropertySummary(property);
  }

  async findPublicList() {
    await this.closeExpiredProperties();
    const properties = await this.propertyModel
      .find({ status: { $in: ['LIVE', 'FUNDED'] } })
      .sort({ createdAt: -1 });
    return properties.map(toPropertySummary);
  }

  async findPublicById(id: string) {
    let property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (isFundingExpired(property)) {
      await closePropertyIfExpired(
        this.propertyModel,
        this.investmentModel,
        property._id,
      );
      property = await this.propertyModel.findById(id);
    }

    if (!property || !['LIVE', 'FUNDED'].includes(property.status)) {
      throw new NotFoundException('Property not found');
    }
    return toPropertySummary(property);
  }

  async findFull(session: { id: string; role: SessionRole }, id: string) {
    let property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (
      session.role === 'AGENCY' &&
      property.agencyId.toString() !== session.id
    ) {
      throw new ForbiddenException('Not your property');
    }

    if (isFundingExpired(property)) {
      await closePropertyIfExpired(
        this.propertyModel,
        this.investmentModel,
        property._id,
      );
      property = await this.propertyModel.findById(id);
      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const investments = await this.investmentModel
      .find({ propertyId: property._id })
      .sort({ createdAt: -1 });
    const investorIds = [
      ...new Set(
        investments.map((investment) => investment.investorId.toString()),
      ),
    ];
    const investorDocs = await this.investorModel.find(
      { _id: { $in: investorIds } },
      { name: 1 },
    );
    const nameById = new Map(
      investorDocs.map((investor) => [investor._id.toString(), investor.name]),
    );

    const investors = investments.map((investment) => ({
      id: investment._id.toString(),
      name:
        nameById.get(investment.investorId.toString()) ?? 'Unknown investor',
      shares: investment.shares,
      amount: investment.totalAmount,
      date: investment.createdAt,
      status: investment.status,
    }));

    return { property: toPropertySummary(property), investors };
  }

  async findAllForAdmin(status?: PropertyStatus) {
    await this.closeExpiredProperties();
    const filter = status ? { status } : {};
    const properties = await this.propertyModel
      .find(filter)
      .sort({ createdAt: -1 });
    return properties.map(toPropertySummary);
  }

  async approve(adminId: string, id: string) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status !== 'PENDING_REVIEW') {
      throw new ConflictException(
        'Only properties pending review can be approved',
      );
    }

    property.status = 'LIVE';
    property.totalShares = Math.floor(property.target / property.sharePrice);
    property.fundingDeadline = new Date(
      Date.now() + property.fundingWindowDays * DAY_MS,
    );
    property.reviewedAt = new Date();
    property.reviewedBy = new Types.ObjectId(adminId);
    property.rejectionReason = null;
    await property.save();
    return toPropertySummary(property);
  }

  async reject(adminId: string, id: string, dto: RejectPropertyDto) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status !== 'PENDING_REVIEW') {
      throw new ConflictException(
        'Only properties pending review can be rejected',
      );
    }

    property.status = 'REJECTED';
    property.rejectionReason = dto.reason;
    property.reviewedAt = new Date();
    property.reviewedBy = new Types.ObjectId(adminId);
    await property.save();
    return toPropertySummary(property);
  }

  private async getOwned(agencyId: string, id: string) {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.agencyId.toString() !== agencyId) {
      throw new ForbiddenException('Not your property');
    }
    return property;
  }

  private async closeExpiredProperties() {
    const expired = await this.propertyModel.find(
      { status: 'LIVE', fundingDeadline: { $lte: new Date() } },
      { _id: 1 },
    );
    for (const { _id } of expired) {
      await closePropertyIfExpired(
        this.propertyModel,
        this.investmentModel,
        _id,
      );
    }
  }
}
