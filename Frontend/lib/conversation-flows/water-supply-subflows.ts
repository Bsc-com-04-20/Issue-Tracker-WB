import type { ConversationStep } from './types';
import type { PublicFlowContext } from './public-flow';
import { landmarkPrompt } from './flow-prompts';

function maintenanceStillReportPrompt(restorationTime: string): string {
  return (
    `There is currently a scheduled maintenance activity affecting your area.\n\n` +
    `Estimated restoration time: ${restorationTime}\n\n` +
    `Would you still like to report this issue?\n` +
    `1. Yes\n` +
    `2. No`
  );
}

function neighboursStep(prompt: string): ConversationStep {
  return {
    id: 'wsNeighboursAffected',
    prompt,
    type: 'select',
  };
}

function maintenanceStep(ctx: PublicFlowContext): ConversationStep[] {
  if (!ctx.maintenanceActive || ctx.maintenanceDeclined) return [];
  return [
    {
      id: 'wsMaintenanceStillReport',
      prompt: maintenanceStillReportPrompt(
        ctx.maintenanceRestorationTime ?? '6:30 PM today',
      ),
      type: 'select',
      helperText: 'Your report can be linked to the active maintenance operation.',
    },
  ];
}

function closingSteps(ctx: PublicFlowContext, opts?: { skipStoredWater?: boolean }): ConversationStep[] {
  const steps: ConversationStep[] = [];
  if (!opts?.skipStoredWater) {
    steps.push({
      id: 'wsStoredWater',
      prompt:
        'Do you currently have stored water available?\n\n' +
        '1. Yes\n' +
        '2. No',
      type: 'select',
    });
  }
  steps.push(
    {
      id: 'wsPremiseType',
      prompt:
        'Is this affecting:\n\n' +
        '1. Home\n' +
        '2. Business\n' +
        '3. School\n' +
        '4. Clinic / Hospital\n' +
        '5. Public Facility',
      type: 'select',
    },
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
  );
  return steps;
}

/** Flow A — no water supply (full diagnostic path). */
export function noWaterSupplyFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep(
      'Are nearby households also experiencing no water supply?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not Sure',
    ),
    ...maintenanceStep(ctx),
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
    {
      id: 'wsDuration',
      prompt:
        'How long have you experienced this problem?\n\n' +
        '1. Less than 1 hour\n' +
        '2. 1–6 hours\n' +
        '3. More than 6 hours\n' +
        '4. More than 24 hours\n' +
        '5. Several days',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

/** Flow B — low water pressure. */
export function lowWaterPressureFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep(
      'Are neighbours also reporting low water pressure?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not Sure',
    ),
    ...maintenanceStep(ctx),
    {
      id: 'wsSupplyScope',
      prompt:
        'Which part of your property is affected?\n\n' +
        '1. All taps / whole property\n' +
        '2. Upstairs only\n' +
        '3. Downstairs / ground floor only\n' +
        '4. One tap only\n' +
        '5. Not sure',
      type: 'select',
    },
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
    {
      id: 'wsDuration',
      prompt:
        'How long has pressure been low?\n\n' +
        '1. Less than 1 hour\n' +
        '2. 1–6 hours\n' +
        '3. More than 6 hours\n' +
        '4. More than 24 hours\n' +
        '5. Several days',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

/** Flow C — intermittent supply. */
export function intermittentSupplyFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep(
      'Are neighbours experiencing intermittent supply as well?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not Sure',
    ),
    ...maintenanceStep(ctx),
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
    {
      id: 'wsDuration',
      prompt:
        'How long has this pattern been happening?\n\n' +
        '1. Less than 1 hour\n' +
        '2. 1–6 hours\n' +
        '3. More than 6 hours\n' +
        '4. More than 24 hours\n' +
        '5. Several days',
      type: 'select',
    },
    ...closingSteps(ctx, { skipStoredWater: true }),
  ];
}

/** Flow D — air in pipes. */
export function airInPipesFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep(
      'Are neighbours also getting air from their taps?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not Sure',
    ),
    ...maintenanceStep(ctx),
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
    {
      id: 'wsDuration',
      prompt:
        'How long has this been happening?\n\n' +
        '1. Less than 1 hour\n' +
        '2. 1–6 hours\n' +
        '3. More than 6 hours\n' +
        '4. More than 24 hours\n' +
        '5. Several days',
      type: 'select',
    },
    ...closingSteps(ctx, { skipStoredWater: true }),
  ];
}

/** Flow E — delayed water restoration. */
export function delayedRestorationFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep(
      'Were neighbours also affected by the same outage?\n\n' +
        '1. Yes\n' +
        '2. No\n' +
        '3. Not Sure',
    ),
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
      id: 'wsDuration',
      prompt:
        'How long has supply been missing or inadequate since the event?\n\n' +
        '1. Less than 1 hour\n' +
        '2. 1–6 hours\n' +
        '3. More than 6 hours\n' +
        '4. More than 24 hours\n' +
        '5. Several days',
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
