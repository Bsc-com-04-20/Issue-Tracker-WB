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
    ...closingSteps(ctx),
  ];
}

function billingFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    subcategoryStep('billing_account', 'Which billing issue applies to your account?'),
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
      prompt: 'Briefly describe the error or platform issue you encountered.',
      type: 'text',
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
