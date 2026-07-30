import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaystackGateway } from './gateways/paystack.gateway';
import { DepositService } from './deposit.service';

@Controller('payments/webhooks/paystack')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly gateway: PaystackGateway,
    private readonly deposits: DepositService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ) {
    if (
      !request.rawBody ||
      !this.gateway.verifySignature(request.rawBody, signature)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    try {
      const event = JSON.parse(request.rawBody.toString('utf8')) as {
        event: string;
        data?: { reference?: string };
      };

      if (event.event === 'charge.success' && event.data?.reference) {
        await this.deposits.confirmByReference(event.data.reference);
      }
    } catch (error) {
      this.logger.error(`Failed processing Paystack webhook: ${String(error)}`);
    }

    return { received: true };
  }
}
