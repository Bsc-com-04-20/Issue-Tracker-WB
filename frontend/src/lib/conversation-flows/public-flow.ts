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

export function buildPublicConversationSteps(ctx: PublicFlowContext): ConversationStep[] {
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
    {
      id: 'reporterPhone',
      prompt: 'What is your mobile number for status updates?',
      type: 'text',
      helperText: 'Include country code if possible, e.g. +265991000001.',
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
      helperText: 'Tap one of the options below.',
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
