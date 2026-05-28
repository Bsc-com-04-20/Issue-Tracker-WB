import type { ConversationStep } from './types';
import type { PublicFlowContext } from './public-flow';
import { landmarkPrompt } from './flow-prompts';
import { ISSUE_CLASSIFICATION } from './issue-classification-frontend';
import { formatFlowLabel } from './labels';

function subcategoryStep(category: string, prompt: string): ConversationStep {
  return {
    id: 'issueSubcategory',
    prompt,
    type: 'select',
    helperText: 'Tap one of the options below.',
  };
}

function closingSteps(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'catPhotoEvidence',
      prompt: 'Would you like to attach a photo or document?',
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
      prompt: 'How severe is the damage?',
      type: 'select',
    },
    {
      id: 'infVisible',
      prompt: 'Briefly describe what you can see (pipe, valve, hydrant, etc.).',
      type: 'text',
    },
    {
      id: 'infSafety',
      prompt: 'Is anyone or traffic at immediate risk?',
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
      prompt: 'How did you pay (if applicable)?',
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
      prompt: 'When did the meter problem start?',
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
      prompt: 'How does the water look?',
      type: 'select',
    },
    {
      id: 'wqDuration',
      prompt: 'How long has this been happening?',
      type: 'select',
    },
    {
      id: 'wqPremise',
      prompt: 'What type of premises is affected?',
      type: 'select',
    },
    {
      id: 'wqHealth',
      prompt: 'Has anyone felt unwell after using the water?',
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
      prompt: 'Which channel were you using?',
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
      prompt: 'When did this happen?',
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
      prompt: 'What kind of location is this?',
      type: 'select',
    },
    {
      id: 'fraudOngoing',
      prompt: 'Is the activity still happening?',
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
  return subs.map((s) => ({
    value: s,
    label: formatFlowLabel(s),
  }));
}
