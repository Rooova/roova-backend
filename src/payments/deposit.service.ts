import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deposit, DepositDocument } from './deposit.schema';
import { Investor, InvestorDocument } from '../auth/investor/investor.schema';
import { PaystackGateway } from './gateways/paystack.gateway';
import { WalletService } from './wallet.service';
import { nairaToKobo, koboToNaira } from './money.util';

function toPublicDeposit(deposit: DepositDocument) {
  return {
    reference: deposit.reference,
    amount: koboToNaira(deposit.amountKobo),
    status: deposit.status,
    verifiedAt: deposit.verifiedAt ?? null,
    createdAt: deposit.createdAt,
  };
}

@Injectable()
export class DepositService {
  constructor(
    @InjectModel(Deposit.name)
    private readonly depositModel: Model<DepositDocument>,
    @InjectModel(Investor.name)
    private readonly investorModel: Model<InvestorDocument>,
    private readonly gateway: PaystackGateway,
    private readonly walletService: WalletService,
  ) {}

  async initiate(investorId: string, amountNaira: number) {
    const investor = await this.investorModel.findById(investorId);
    if (!investor) {
      throw new NotFoundException('Investor not found');
    }

    const depositId = new Types.ObjectId();
    const reference = `dep_${depositId.toString()}`;
    const amountKobo = nairaToKobo(amountNaira);

    const deposit = await this.depositModel.create({
      _id: depositId,
      investorId: investor._id,
      amountKobo,
      reference,
      status: 'PENDING',
    });

    const { authorizationUrl, accessCode } =
      await this.gateway.initializeTransaction({
        email: investor.email,
        amountKobo,
        reference,
        callbackUrl: process.env.INVESTOR_WALLET_CALLBACK_URL,
      });

    deposit.paystackAccessCode = accessCode;
    await deposit.save();

    return { reference, authorizationUrl };
  }

  async confirmByReference(reference: string, expectedInvestorId?: string) {
    const deposit = await this.depositModel.findOne({ reference });
    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }
    if (
      expectedInvestorId &&
      deposit.investorId.toString() !== expectedInvestorId
    ) {
      throw new ForbiddenException('Not your deposit');
    }

    const verification = await this.gateway.verifyTransaction(reference);

    if (verification.status === 'success') {
      if (verification.amountKobo !== deposit.amountKobo) {
        const flipped = await this.depositModel.findOneAndUpdate(
          { reference, status: { $ne: 'SUCCESS' } },
          {
            status: 'MISMATCHED',
            verifiedAt: new Date(),
            providerMetadata: verification.raw,
          },
          { new: true },
        );
        return toPublicDeposit(flipped ?? deposit);
      }

      const flipped = await this.depositModel.findOneAndUpdate(
        { reference, status: { $ne: 'SUCCESS' } },
        {
          status: 'SUCCESS',
          verifiedAt: new Date(),
          providerMetadata: verification.raw,
        },
        { new: true },
      );
      if (flipped) {
        await this.walletService.credit(
          deposit.investorId.toString(),
          deposit.amountKobo,
          deposit._id,
        );
        return toPublicDeposit(flipped);
      }
      const current = await this.depositModel.findOne({ reference });
      return toPublicDeposit(current ?? deposit);
    }

    if (verification.status === 'failed') {
      const flipped = await this.depositModel.findOneAndUpdate(
        { reference, status: { $ne: 'SUCCESS' } },
        {
          status: 'FAILED',
          verifiedAt: new Date(),
          providerMetadata: verification.raw,
        },
        { new: true },
      );
      return toPublicDeposit(flipped ?? deposit);
    }

    // 'abandoned' — not yet completed; leave PENDING for a later retry/verify.
    return toPublicDeposit(deposit);
  }
}
