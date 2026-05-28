import { BadRequestException } from '@nestjs/common';
import type { Issue } from './issue.entity';
import type {
  BillingLedgerAction,
  BillingReconnectionStep,
} from './billing-resolution';
import {
  labelBillingLedgerAction,
  labelBillingReconnectionStep,
} from './billing-resolution';
import type { PremiseLookupResult } from '../meter/premise-lookup.types';

export type BillingResolutionContextDto = {
  accountNumber: string | null;
  ledgerAction: BillingLedgerAction;
  ledgerActionLabel: string;
  ledgerActionReason: string;
  balanceBeforeMwk: number | null;
  balanceAfterMwk: number | null;
  balanceSource: 'billing_registry' | 'unavailable';
  balanceExplanation: string;
  reconnectionStep: BillingReconnectionStep;
  reconnectionStepLabel: string;
  reconnectionReason: string;
  suggestedLedgerReference: string | null;
  registryFound: boolean;
  customerName: string | null;
  accountStatus: string | null;
  connectionStatus: string | null;
};

const LEDGER_BY_SUBCATEGORY: Record<string, BillingLedgerAction> = {
  payment_not_reflected: 'payment_posted',
  duplicate_charges: 'credit_applied',
  estimated_billing_complaint: 'credit_applied',
  incorrect_meter_reading: 'credit_applied',
  account_balance_dispute: 'credit_applied',
  delayed_reconnection: 'payment_posted',
  wrong_customer_account_mapping: 'reversal_posted',
};

const DIGITAL_SUB_LEDGER: Record<string, BillingLedgerAction> = {
  mobile_money_sync_failure: 'pending_ict_sync',
  failed_online_payment: 'pending_ict_sync',
  customer_portal_login_failure: 'pending_ict_sync',
  sms_notification_failure: 'no_ledger_change',
  token_generation_failure: 'pending_ict_sync',
  system_downtime: 'pending_ict_sync',
};

export function suggestLedgerActionForIssue(issue: Issue): {
  action: BillingLedgerAction;
  reason: string;
} {
  const sub = issue.issueSubcategory?.trim() ?? '';
  const cat = issue.issueCategory;

  if (cat === 'digital_payment' && sub && DIGITAL_SUB_LEDGER[sub]) {
    return {
      action: DIGITAL_SUB_LEDGER[sub],
      reason: `Digital / payment channel issue (“${sub.replace(/_/g, ' ')}”) — ledger follows ICT or channel fix, not a manual field visit.`,
    };
  }

  if (cat === 'billing_account' && sub && LEDGER_BY_SUBCATEGORY[sub]) {
    const action = LEDGER_BY_SUBCATEGORY[sub];
    const reasons: Record<string, string> = {
      payment_not_reflected:
        'Customer reports a payment that is not on the account — system will post the payment to the ledger when confirmed.',
      duplicate_charges:
        'Duplicate billing lines — system applies a credit or adjustment to the account.',
      estimated_billing_complaint:
        'Estimated bill dispute — system applies a read or billing adjustment credit.',
      incorrect_meter_reading:
        'Meter read affects the bill — system applies a billing correction.',
      account_balance_dispute:
        'Balance dispute — system applies a correction or confirms no change after review.',
      delayed_reconnection:
        'Reconnection after payment — system posts the payment before reconnecting supply.',
      wrong_customer_account_mapping:
        'Wrong account — system reverses or moves the charge to the correct account.',
    };
    return {
      action,
      reason: reasons[sub] ?? `Billing subcategory “${sub}” maps to this ledger step.`,
    };
  }

  return {
    action: 'no_ledger_change',
    reason: 'No automatic ledger rule for this category — supervisor may adjust in CIS.',
  };
}

export function suggestReconnectionForIssue(
  issue: Issue,
  ledgerAction: BillingLedgerAction,
  premise: PremiseLookupResult | null,
): { step: BillingReconnectionStep; reason: string } {
  const sub = issue.issueSubcategory ?? '';
  const accountStatus = premise?.accountStatus ?? '';
  const connection = premise?.connectionStatus ?? '';

  if (sub === 'delayed_reconnection') {
    return {
      step: ledgerAction === 'payment_posted' ? 'completed' : 'pending_payment_clearance',
      reason:
        'Reconnection ticket — complete when payment is on the ledger and supply is restored (or scheduled).',
    };
  }

  if (connection === 'disconnected' || connection === 'restricted') {
    if (ledgerAction === 'payment_posted') {
      return {
        step: 'completed',
        reason: 'Supply was disconnected; posting payment triggers reconnection workflow.',
      };
    }
    return {
      step: 'pending_payment_clearance',
      reason: 'Supply is off — reconnection waits until the account is corrected.',
    };
  }

  if (accountStatus === 'arrears_hold' && ledgerAction === 'payment_posted') {
    return {
      step: 'completed',
      reason: 'Account was on arrears hold; payment posting clears the hold and allows reconnection.',
    };
  }

  return {
    step: 'not_required',
    reason: 'Active account with no disconnection on file — no reconnection step needed.',
  };
}

export function computeBalancesForResolution(
  ledgerAction: BillingLedgerAction,
  issue: Issue,
  premise: PremiseLookupResult | null,
): {
  balanceBeforeMwk: number | null;
  balanceAfterMwk: number | null;
  explanation: string;
  source: 'billing_registry' | 'unavailable';
} {
  const before =
    premise?.accountBalanceMwk != null
      ? Number(premise.accountBalanceMwk)
      : null;

  if (before == null || Number.isNaN(before)) {
    return {
      balanceBeforeMwk: null,
      balanceAfterMwk: null,
      explanation:
        'Balance is not available from the billing registry for this account. Post in CIS, then refresh this ticket.',
      source: 'unavailable',
    };
  }

  const sub = issue.issueSubcategory ?? '';
  let after: number | null = null;
  let explanation = '';

  if (ledgerAction === 'payment_posted' && sub === 'payment_not_reflected') {
    const payment =
      premise?.pendingPaymentMwk != null
        ? Number(premise.pendingPaymentMwk)
        : before;
    after = Math.max(0, before - payment);
    explanation =
      payment >= before
        ? `Registry balance MWK ${before.toLocaleString()} minus pending payment MWK ${payment.toLocaleString()} → MWK ${after.toLocaleString()}.`
        : `Partial payment MWK ${payment.toLocaleString()} applied to balance MWK ${before.toLocaleString()} → MWK ${after.toLocaleString()}.`;
  } else if (ledgerAction === 'no_ledger_change') {
    after = before;
    explanation = `No ledger movement — balance stays MWK ${before.toLocaleString()} per billing registry.`;
  } else if (ledgerAction === 'pending_ict_sync') {
    after = before;
    explanation = `Balance unchanged until ICT/channel sync completes (currently MWK ${before.toLocaleString()} on registry).`;
  } else if (
    ledgerAction === 'credit_applied' ||
    ledgerAction === 'reversal_posted'
  ) {
    after = before;
    explanation = `Current registry balance MWK ${before.toLocaleString()}. Final balance after credit/reversal is set in CIS when the adjustment is posted.`;
  } else {
    after = before;
    explanation = `Projected balance MWK ${after.toLocaleString()} from billing registry after “${labelBillingLedgerAction(ledgerAction)}”.`;
  }

  return {
    balanceBeforeMwk: before,
    balanceAfterMwk: after,
    explanation,
    source: 'billing_registry',
  };
}

export function suggestLedgerReference(
  issue: Issue,
  ledgerAction: BillingLedgerAction,
): string | null {
  const tx =
    issue.issueAttributes?.transactionId != null
      ? String(issue.issueAttributes.transactionId).trim()
      : '';
  if (!tx) return null;
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix =
    ledgerAction === 'payment_posted'
      ? 'PAY'
      : ledgerAction === 'credit_applied'
        ? 'CR'
        : ledgerAction === 'reversal_posted'
          ? 'REV'
          : 'REF';
  return `${prefix}-${d}-${tx.slice(0, 12)}`;
}

export function buildBillingResolutionContext(
  issue: Issue,
  premise: PremiseLookupResult | null,
): BillingResolutionContextDto {
  const { action, reason: ledgerReason } = suggestLedgerActionForIssue(issue);
  const { step, reason: reconReason } = suggestReconnectionForIssue(
    issue,
    action,
    premise,
  );
  const balances = computeBalancesForResolution(action, issue, premise);

  return {
    accountNumber: issue.accountNumber ?? premise?.accountNumber ?? null,
    ledgerAction: action,
    ledgerActionLabel: labelBillingLedgerAction(action),
    ledgerActionReason: ledgerReason,
    balanceBeforeMwk: balances.balanceBeforeMwk,
    balanceAfterMwk: balances.balanceAfterMwk,
    balanceSource: balances.source,
    balanceExplanation: balances.explanation,
    reconnectionStep: step,
    reconnectionStepLabel: labelBillingReconnectionStep(step),
    reconnectionReason: reconReason,
    suggestedLedgerReference: suggestLedgerReference(issue, action),
    registryFound: premise?.found === true,
    customerName: premise?.customerName ?? issue.reporterName ?? null,
    accountStatus: premise?.accountStatus ?? null,
    connectionStatus: premise?.connectionStatus ?? null,
  };
}

/** Server-side: billingResolution from client must match auto rules unless balances unavailable. */
export function assertBillingResolutionMatchesContext(
  issue: Issue,
  premise: PremiseLookupResult | null,
  input: {
    ledgerAction: string;
    balanceAfterMwk: string;
    reconnectionStep: string;
    ledgerReference?: string;
  },
): void {
  const ctx = buildBillingResolutionContext(issue, premise);
  if (input.ledgerAction !== ctx.ledgerAction) {
    throw new BadRequestException(
      `Ledger action must be ${ctx.ledgerAction} for this issue type`,
    );
  }
  if (input.reconnectionStep !== ctx.reconnectionStep) {
    throw new BadRequestException(
      `Reconnection step must be ${ctx.reconnectionStep} for this account state`,
    );
  }
  if (ctx.balanceSource === 'billing_registry' && ctx.balanceAfterMwk != null) {
    const expected = String(ctx.balanceAfterMwk);
    const got = input.balanceAfterMwk.trim();
    if (got !== expected && got !== expected.replace(/\.0+$/, '')) {
      throw new BadRequestException(
        `Balance after resolution must match billing registry (MWK ${expected})`,
      );
    }
  }
  if (ctx.balanceSource === 'unavailable') {
    throw new BadRequestException(ctx.balanceExplanation);
  }
}
