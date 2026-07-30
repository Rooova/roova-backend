import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './wallet.schema';
import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletTransactionType,
} from './wallet-transaction.schema';
import { koboToNaira } from './money.util';

const DUPLICATE_KEY_ERROR = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === DUPLICATE_KEY_ERROR
  );
}

function toPublicWallet(wallet: WalletDocument) {
  return {
    availableBalance: koboToNaira(wallet.availableBalanceKobo),
    escrowedBalance: koboToNaira(wallet.escrowedBalanceKobo),
    currency: wallet.currency,
  };
}

function toPublicTransaction(transaction: WalletTransactionDocument) {
  return {
    id: transaction._id.toString(),
    type: transaction.type,
    amount: koboToNaira(transaction.amountKobo),
    depositId: transaction.depositId?.toString() ?? null,
    investmentId: transaction.investmentId?.toString() ?? null,
    availableBalanceAfter:
      transaction.availableBalanceKoboAfter !== null &&
      transaction.availableBalanceKoboAfter !== undefined
        ? koboToNaira(transaction.availableBalanceKoboAfter)
        : null,
    escrowedBalanceAfter:
      transaction.escrowedBalanceKoboAfter !== null &&
      transaction.escrowedBalanceKoboAfter !== undefined
        ? koboToNaira(transaction.escrowedBalanceKoboAfter)
        : null,
    createdAt: transaction.createdAt,
  };
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransactionDocument>,
  ) {}

  async getOrCreateWallet(investorId: string): Promise<WalletDocument> {
    try {
      return await this.walletModel.findOneAndUpdate(
        { investorId },
        { $setOnInsert: { investorId, availableBalanceKobo: 0, escrowedBalanceKobo: 0 } },
        { upsert: true, new: true },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existing = await this.walletModel.findOne({ investorId });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async findMine(investorId: string) {
    const wallet = await this.getOrCreateWallet(investorId);
    return toPublicWallet(wallet);
  }

  async findTransactions(investorId: string) {
    const transactions = await this.walletTransactionModel
      .find({ investorId })
      .sort({ createdAt: -1 });
    return transactions.map(toPublicTransaction);
  }

  async credit(
    investorId: string,
    amountKobo: number,
    depositId: Types.ObjectId,
  ): Promise<void> {
    this.assertPositiveAmount(amountKobo);
    const wallet = await this.getOrCreateWallet(investorId);

    const ledgerRow = await this.claimLedgerRow({
      walletId: wallet._id,
      investorId: new Types.ObjectId(investorId),
      type: 'DEPOSIT',
      amountKobo,
      depositId,
    });
    if (!ledgerRow) return; // already applied

    const updated = await this.walletModel.findOneAndUpdate(
      { investorId },
      { $inc: { availableBalanceKobo: amountKobo } },
      { new: true },
    );
    await this.patchLedgerRowBalances(ledgerRow._id, updated!);
  }

  async escrow(
    investorId: string,
    amountKobo: number,
    investmentId: Types.ObjectId,
  ): Promise<void> {
    this.assertPositiveAmount(amountKobo);
    const wallet = await this.getOrCreateWallet(investorId);

    const ledgerRow = await this.claimLedgerRow({
      walletId: wallet._id,
      investorId: new Types.ObjectId(investorId),
      type: 'INVEST',
      amountKobo,
      investmentId,
    });
    if (!ledgerRow) return; // already applied

    const updated = await this.walletModel.findOneAndUpdate(
      { investorId, availableBalanceKobo: { $gte: amountKobo } },
      {
        $inc: {
          availableBalanceKobo: -amountKobo,
          escrowedBalanceKobo: amountKobo,
        },
      },
      { new: true },
    );

    if (!updated) {
      await this.walletTransactionModel.deleteOne({ _id: ledgerRow._id });
      throw new ConflictException('Insufficient wallet balance');
    }

    await this.patchLedgerRowBalances(ledgerRow._id, updated);
  }

  async refundEscrow(
    investorId: string,
    amountKobo: number,
    investmentId: Types.ObjectId,
  ): Promise<void> {
    this.assertPositiveAmount(amountKobo);
    const wallet = await this.getOrCreateWallet(investorId);

    const ledgerRow = await this.claimLedgerRow({
      walletId: wallet._id,
      investorId: new Types.ObjectId(investorId),
      type: 'REFUND',
      amountKobo,
      investmentId,
    });
    if (!ledgerRow) return; // already applied

    const updated = await this.walletModel.findOneAndUpdate(
      { investorId, escrowedBalanceKobo: { $gte: amountKobo } },
      {
        $inc: {
          escrowedBalanceKobo: -amountKobo,
          availableBalanceKobo: amountKobo,
        },
      },
      { new: true },
    );

    if (!updated) {
      this.logger.error(
        `Invariant violation: escrowed balance underflow refunding investment ${investmentId.toString()}`,
      );
      throw new InternalServerErrorException('Escrow refund invariant violation');
    }

    await this.patchLedgerRowBalances(ledgerRow._id, updated);
  }

  private assertPositiveAmount(amountKobo: number) {
    if (amountKobo <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
  }

  private async claimLedgerRow(fields: {
    walletId: Types.ObjectId;
    investorId: Types.ObjectId;
    type: WalletTransactionType;
    amountKobo: number;
    depositId?: Types.ObjectId;
    investmentId?: Types.ObjectId;
  }): Promise<WalletTransactionDocument | null> {
    try {
      return await this.walletTransactionModel.create(fields);
    } catch (error) {
      if (isDuplicateKeyError(error)) return null;
      throw error;
    }
  }

  private async patchLedgerRowBalances(
    ledgerRowId: Types.ObjectId,
    wallet: WalletDocument,
  ) {
    await this.walletTransactionModel.updateOne(
      { _id: ledgerRowId },
      {
        availableBalanceKoboAfter: wallet.availableBalanceKobo,
        escrowedBalanceKoboAfter: wallet.escrowedBalanceKobo,
      },
    );
  }
}
