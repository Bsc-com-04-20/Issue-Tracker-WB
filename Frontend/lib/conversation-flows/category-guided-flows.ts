import type { ConversationStep } from './types';
import type { PublicFlowContext } from './public-flow';
import { landmarkPrompt } from './flow-prompts';
import { ISSUE_CLASSIFICATION } from './issue-classification-frontend';

function subcategoryStep(category: string, prompt: string): ConversationStep {
  const subs = ISSUE_CLASSIFICATION[category]?.subcategories ?? [];
  const labels = subs.map((s, i) => `${i + 1}. ${s.replace(/_/g, ' ')}`).join('\n');
  return {
    id: 'issueSubcategory',
    prompt: `${prompt}\n\n${labels}`,
    type: 'select',
    helperText: 'Choose the option that best matches your situation.',
  };
}

function closingSteps(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'catPhotoEvidence',
      prompt:
        'Would you like to attach a photo or document?\n\n' +
        '1. Attach file\n' +
        '2. Skip',
      type: 'select',
      optional: true,
    },
    {
      id: 'wsLandmark',
      prompt: landmarkPrompt(ctx.meterLookup),
      type: 'text',
    },
    {
      id: 'reporterEmail',
      prompt: 'Email for status updates (optional)',
      type: 'text',
      optional: true,
    },
  ];
}

function infrastructureFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    subcategoryStep(
      'infrastructure_maintenance',
      'What type of infrastructure problem did you observe?',
    ),
    {
      id: 'infDamageLevel',
      prompt:
        'How severe is the damage?\n\n' +
        '1. Minor / cosmetic\n' +
        '2. Moderate — water escaping\n' +
        '3. Major — road or property at risk\n' +
        '4. Emergency — uncontained flow',
      type: 'select',
    },
    {
      id: 'infVisible',
      prompt: 'Briefly describe what you can see (pipe, valve, hydrant, etc.).',
      type: 'text',
    },
    {
      id: 'infSafety',
      prompt:
        'Is anyone or traffic at immediate risk?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not sure',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

function billingFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    subcategoryStep('billing_account', 'Which billing issue applies to your account?'),
    {
      id: 'billAccountConfirm',
      prompt:
        `Confirm billing account number:\n${ctx.meterLookup?.accountNumber ?? '(from meter lookup)'}\n\n` +
        'Type the account number if different, or repeat it to confirm.',
      type: 'text',
    },
    {
      id: 'billPaymentMethod',
      prompt:
        'How did you pay (if applicable)?\n\n' +
        '1. Mobile money\n' +
        '2. Bank transfer\n' +
        '3. Cash office\n' +
        '4. Not applicable',
      type: 'select',
    },
    {
      id: 'billTransactionId',
      prompt: 'Transaction or receipt reference (optional).',
      type: 'text',
      optional: true,
    },
    {
      id: 'billDetail',
      prompt: 'Describe the billing problem and when you noticed it.',
      type: 'text',
    },
    ...closingSteps(ctx),
  ];
}

function meteringFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    subcategoryStep('metering', 'Which meter problem are you reporting?'),
    {
      id: 'metErrorCode',
      prompt: 'Meter display or error code (if shown).',
      type: 'text',
      optional: true,
    },
    {
      id: 'metTokenId',
      prompt: 'Prepaid token ID (if applicable).',
      type: 'text',
      optional: true,
    },
    {
      id: 'metWhenStarted',
      prompt:
        'When did the meter problem start?\n\n' +
        '1. Today\n' +
        '2. This week\n' +
        '3. More than a week ago',
      type: 'select',
    },
    {
      id: 'metDetail',
      prompt: 'Describe what the meter is doing wrong.',
      type: 'text',
    },
    ...closingSteps(ctx),
  ];
}

function waterQualityFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    subcategoryStep('water_quality', 'Which water quality symptom best matches?'),
    {
      id: 'wqAppearance',
      prompt:
        'How does the water look?\n\n' +
        '1. Brown or dirty\n' +
        '2. Cloudy / milky\n' +
        '3. Clear but smells bad\n' +
        '4. Other',
      type: 'select',
    },
    {
      id: 'wqDuration',
      prompt:
        'How long has this been happening?\n\n' +
        '1. Less than 1 hour\n' +
        '2. 1–24 hours\n' +
        '3. More than 24 hours\n' +
        '4. Several days',
      type: 'select',
    },
    {
      id: 'wqPremise',
      prompt:
        'Premise type:\n\n' +
        '1. Home\n' +
        '2. Business\n' +
        '3. School / clinic\n' +
        '4. Public facility',
      type: 'select',
    },
    {
      id: 'wqHealth',
      prompt:
        'Has anyone felt unwell after using the water?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not sure',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

function digitalFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    subcategoryStep('digital_payment', 'Which digital or payment issue occurred?'),
    {
      id: 'digPlatform',
      prompt:
        'Which channel?\n\n' +
        '1. Mobile money\n' +
        '2. Customer portal / app\n' +
        '3. SMS / token\n' +
        '4. Other',
      type: 'select',
    },
    {
      id: 'digErrorMessage',
      prompt: 'What error message did you see (copy exactly if possible)?',
      type: 'text',
    },
    {
      id: 'digTransactionId',
      prompt: 'Transaction ID (if you have one).',
      type: 'text',
      optional: true,
    },
    {
      id: 'digWhen',
      prompt:
        'When did this happen?\n\n' +
        '1. In the last hour\n' +
        '2. Today\n' +
        '3. Earlier this week',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

function fraudFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    subcategoryStep(
      'illegal_connection_fraud',
      'What type of suspicious activity are you reporting?',
    ),
    {
      id: 'fraudObserved',
      prompt: 'Describe what you observed and when.',
      type: 'text',
    },
    {
      id: 'fraudLocationType',
      prompt:
        'Location type:\n\n' +
        '1. Residential area\n' +
        '2. Commercial area\n' +
        '3. Open land / roadside\n' +
        '4. Unknown',
      type: 'select',
    },
    {
      id: 'fraudOngoing',
      prompt:
        'Is the activity still happening?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not sure',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

export function stepsForNonWaterCategory(ctx: PublicFlowContext): ConversationStep[] {
  switch (ctx.issueCategory) {
    case 'infrastructure_maintenance':
      return infrastructureFlow(ctx);
    case 'billing_account':
      return billingFlow(ctx);
    case 'metering':
      return meteringFlow(ctx);
    case 'water_quality':
      return waterQualityFlow(ctx);
    case 'digital_payment':
      return digitalFlow(ctx);
    case 'illegal_connection_fraud':
      return fraudFlow(ctx);
    default:
      return infrastructureFlow(ctx);
  }
}

export function subcategoryOptionsForCategory(
  category: string,
): { value: string; label: string }[] {
  const subs = ISSUE_CLASSIFICATION[category]?.subcategories ?? [];
  return subs.map((s, i) => ({
    value: s,
    label: `${i + 1}. ${s.replace(/_/g, ' ')}`,
  }));
}
