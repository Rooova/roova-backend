import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './wallet.schema';
import { Deposit, DepositSchema } from './deposit.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from './wallet-transaction.schema';
import { Investor, InvestorSchema } from '../auth/investor/investor.schema';
import { WalletService } from './wallet.service';
import { DepositService } from './deposit.service';
import { PaystackGateway } from './gateways/paystack.gateway';
import { WalletController } from './wallet.controller';
import { PaystackWebhookController } from './paystack-webhook.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Deposit.name, schema: DepositSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Investor.name, schema: InvestorSchema },
    ]),
  ],
  controllers: [WalletController, PaystackWebhookController],
  providers: [WalletService, DepositService, PaystackGateway],
  exports: [WalletService],
})
export class PaymentsModule {}
