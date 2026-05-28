import type { ConversationStep } from './types';
import type { PublicFlowContext } from './public-flow';
import { landmarkPrompt } from './flow-prompts';

function closingSteps(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'wsPhotoEvidence',
      prompt:
        'Would you like to attach a photo of the issue area?\n\n' +
        '1. Attach photo\n' +
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

export function noWaterSupplyFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'wsTapBehavior',
      prompt:
        'When you open the tap, what happens?\n\n' +
        '1. No water at all\n' +
        '2. Air comes out\n' +
        '3. Small dripping\n' +
        '4. Irregular flow',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

export function lowWaterPressureFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'wsPressureLevel',
      prompt:
        'How would you describe the pressure?\n\n' +
        '1. Very weak trickle\n' +
        '2. Weak but usable\n' +
        '3. Normal on some taps, weak on others\n' +
        '4. Worse at peak hours only',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

export function intermittentSupplyFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'wsIntermittentPattern',
      prompt:
        'How does the supply behave?\n\n' +
        '1. Cuts off at the same time each day\n' +
        '2. Random on/off throughout the day\n' +
        '3. Only low pressure in the morning\n' +
        '4. Short bursts then nothing',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

export function airInPipesFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'wsAirWhen',
      prompt:
        'When do you notice air from the taps?\n\n' +
        '1. Every time I open a tap\n' +
        '2. After recent maintenance or repairs\n' +
        '3. Only the first draw in the morning\n' +
        '4. After water returns following an outage',
      type: 'select',
    },
    {
      id: 'wsAirTapBehavior',
      prompt:
        'What comes out when you open the tap?\n\n' +
        '1. Mostly air, little or no water\n' +
        '2. Spluttering then clears\n' +
        '3. Brown/discoloured water with air\n' +
        '4. Irregular flow',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

export function delayedRestorationFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    {
      id: 'wsRestorationContext',
      prompt:
        'What were you told about restoration?\n\n' +
        '1. Maintenance completed but no water yet\n' +
        '2. Emergency repair — waiting for supply\n' +
        '3. No notice — supply stopped unexpectedly\n' +
        '4. Partial restoration only',
      type: 'select',
    },
    {
      id: 'wsStillAffected',
      prompt:
        'Is your supply fully restored now?\n\n' +
        '1. No water at all\n' +
        '2. Low pressure only\n' +
        '3. Partially restored\n' +
        '4. Fully restored (reporting delay)',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

export function stepsForWaterSupplySubcategory(ctx: PublicFlowContext): ConversationStep[] {
  switch (ctx.issueSubcategory) {
    case 'no_water_supply':
      return noWaterSupplyFlow(ctx);
    case 'low_water_pressure':
      return lowWaterPressureFlow(ctx);
    case 'intermittent_supply':
      return intermittentSupplyFlow(ctx);
    case 'air_in_pipes':
      return airInPipesFlow(ctx);
    case 'delayed_water_restoration':
      return delayedRestorationFlow(ctx);
    default:
      return noWaterSupplyFlow(ctx);
  }
}
