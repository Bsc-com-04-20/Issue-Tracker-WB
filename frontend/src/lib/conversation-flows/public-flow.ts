import type { PremiseMeterLookupResponse } from '@/lib/types';
import type { ConversationStep } from './types';
import { WATER_SUPPLY_SUBCATEGORY_OPTIONS, PUBLIC_CATEGORY_OPTIONS } from './water-supply-flow';
import { accountConfirmPrompt, landmarkPrompt } from './flow-prompts';
import { stepsForWaterSupplySubcategory } from './water-supply-subflows';
import { stepsForNonWaterCategory } from './category-guided-flows';

export { accountConfirmPrompt, landmarkPrompt };

export type PublicFlowContext = {
  issueCategory: string;
  issueSubcategory: string;
  meterLookup: PremiseMeterLookupResponse | null;
  phoneHintLast4?: string;
  /** Active maintenance detected for this premise. */
  maintenanceActive: boolean;
  /** User chose not to report during maintenance window. */
  maintenanceDeclined: boolean;
  maintenanceRestorationTime?: string;
};

function phoneLast4Digits(hint: string | undefined): string {
  return hint?.replace(/^…+/, '').trim() ?? '';
}

export function buildPublicConversationSteps(ctx: PublicFlowContext): ConversationStep[] {
  const last4 = phoneLast4Digits(ctx.phoneHintLast4);

  const phoneSuffixStep: ConversationStep[] = last4
    ? [
        {
          id: 'registryPhoneSuffix',
          prompt:
            'Confirm your registered mobile number.\n\n' +
            `The number on file for this meter ends in: ${last4}\n\n` +
            'Is this your current mobile number?\n' +
            '1. Yes\n' +
            '2. No',
          type: 'select',
        },
      ]
    : [];

  const registryPhonePrompt = last4
    ? 'Enter your full mobile number (with country code, e.g. +265991000001).'
    : 'Enter the mobile number registered to this meter account.';

  const identity: ConversationStep[] = [
    {
      id: 'registryMeter',
      prompt:
        'Welcome to the Water Board Smart Support System.\n\n' +
        'Please enter your meter number.',
      type: 'text',
      helperText:
        'Enter the number on your meter, bill, or customer card. Demo meters: 37224210001–37224210005.',
    },
    {
      id: 'accountConfirm',
      prompt: ctx.meterLookup?.found
        ? accountConfirmPrompt(ctx.meterLookup)
        : 'Confirm your account details.',
      type: 'select',
    },
    ...phoneSuffixStep,
    {
      id: 'registryPhone',
      prompt: registryPhonePrompt,
      type: 'text',
      helperText: last4
        ? `Must match the number ending in ${last4} on your account.`
        : 'This must match the number linked to your meter in the registry.',
    },
    {
      id: 'registryOtp',
      prompt: 'Enter the verification code sent to your phone.',
      type: 'text',
      helperText:
        'In this demo, use the verification code shown below after you enter your phone number.',
    },
    {
      id: 'issueCategory',
      prompt: 'What issue are you experiencing today?',
      type: 'select',
    },
  ];

  if (ctx.issueCategory !== 'water_supply') {
    return [...identity, ...stepsForNonWaterCategory(ctx)];
  }

  const waterPath: ConversationStep[] = [
    {
      id: 'issueSubcategory',
      prompt:
        'Please select the water supply problem you are experiencing:',
      type: 'select',
      helperText: WATER_SUPPLY_SUBCATEGORY_OPTIONS.map((o) => o.label).join(' · '),
    },
  ];

  waterPath.push(...stepsForWaterSupplySubcategory(ctx));

  waterPath.push({
    id: 'reporterEmail',
    prompt: 'What is your email address for status updates? (optional)',
    type: 'text',
    optional: true,
  });

  return [...identity, ...waterPath];
}

export function publicCategoryStepOptions(): { value: string; label: string }[] {
  return PUBLIC_CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label }));
}

export function publicWaterSubcategoryOptions(): { value: string; label: string }[] {
  return WATER_SUPPLY_SUBCATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
}
