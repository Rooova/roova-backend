import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    this.logger.log(`Password reset link for ${to}: ${resetUrl}`);
    return Promise.resolve();
  }
}
