import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BILLING_LEDGER_ACTIONS,
  BILLING_PAYMENT_CHANNELS,
  BILLING_RECONNECTION_STEPS,
} from '../billing-resolution';
import { BILLING_CUSTOMER_CONTACT_CHANNELS } from '../billing-customer-notification';

export class BillingResolutionDto {
  @ApiProperty({ example: '1234567' })
  transactionIdConfirmed: string;

  @ApiProperty({ enum: BILLING_PAYMENT_CHANNELS })
  paymentChannel: string;

  @ApiProperty({ enum: BILLING_LEDGER_ACTIONS })
  ledgerAction: string;

  @ApiPropertyOptional({ example: 'CR-2026-0042' })
  ledgerReference?: string;

  @ApiProperty({ example: '12500.00', description: 'Balance after resolution in MWK' })
  balanceAfterMwk: string;

  @ApiProperty({ enum: BILLING_RECONNECTION_STEPS })
  reconnectionStep: string;

  @ApiPropertyOptional()
  reconnectionNotes?: string;

  @ApiProperty({ enum: BILLING_CUSTOMER_CONTACT_CHANNELS })
  customerContactChannel: string;

  @ApiProperty({
    description: 'What the customer was told (balance, reconnection, next steps)',
  })
  customerSummary: string;

  @ApiPropertyOptional()
  additionalNotes?: string;
}
