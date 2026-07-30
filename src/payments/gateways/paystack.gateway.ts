import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export type PaystackVerificationStatus = 'success' | 'failed' | 'abandoned';

interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
}

interface VerifyTransactionResult {
  status: PaystackVerificationStatus;
  amountKobo: number;
  raw: unknown;
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
  }
  return key;
}

@Injectable()
export class PaystackGateway {
  async initializeTransaction(
    params: InitializeTransactionParams,
  ): Promise<InitializeTransactionResult> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
      }),
    });

    const body = (await response.json()) as {
      status: boolean;
      message: string;
      data?: { authorization_url: string; access_code: string };
    };

    if (!response.ok || !body.status || !body.data) {
      throw new InternalServerErrorException(
        `Paystack initialize failed: ${body.message ?? response.statusText}`,
      );
    }

    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
    };
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${secretKey()}` },
      },
    );

    const body = (await response.json()) as {
      status: boolean;
      message: string;
      data?: { status: PaystackVerificationStatus; amount: number };
    };

    if (!response.ok || !body.status || !body.data) {
      throw new InternalServerErrorException(
        `Paystack verify failed: ${body.message ?? response.statusText}`,
      );
    }

    return {
      status: body.data.status,
      amountKobo: body.data.amount,
      raw: body.data,
    };
  }

  verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    const computed = crypto
      .createHmac('sha512', secretKey())
      .update(rawBody)
      .digest('hex');
    return computed === signatureHeader;
  }
}
