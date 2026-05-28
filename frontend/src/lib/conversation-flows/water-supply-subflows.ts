import type { ConversationStep } from './types';
import type { PublicFlowContext } from './public-flow';
import { landmarkPrompt } from './flow-prompts';

function maintenanceStillReportPrompt(restorationTime: string): string {
  return (
    `There is currently a scheduled maintenance activity affecting your area.\n\n` +
    `Estimated restoration time: ${restorationTime}\n\n` +
    `Would you still like to report this issue?`
  );
}

function neighboursStep(prompt: string): ConversationStep {
  return {
    id: 'wsNeighboursAffected',
    prompt,
    type: 'select',
    helperText: 'Tap one of the options below.',
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
      prompt: 'Do you currently have stored water available?',
      type: 'select',
    });
  }
  steps.push(
    {
      id: 'wsPremiseType',
      prompt: 'Is this affecting:',
      type: 'select',
    },
    {
      id: 'wsPhotoEvidence',
      prompt: 'Would you like to attach a photo of the issue area?',
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
    neighboursStep('Are nearby households also experiencing no water supply?'),
    ...maintenanceStep(ctx),
    {
      id: 'wsTapBehavior',
      prompt: 'When you open the tap, what happens?',
      type: 'select',
    },
    {
      id: 'wsDuration',
      prompt: 'How long have you experienced this problem?',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

/** Flow B — low water pressure. */
export function lowWaterPressureFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep('Are neighbours also reporting low water pressure?'),
    ...maintenanceStep(ctx),
    {
      id: 'wsSupplyScope',
      prompt: 'Which part of your property is affected?',
      type: 'select',
    },
    {
      id: 'wsPressureLevel',
      prompt: 'How would you describe the pressure?',
      type: 'select',
    },
    {
      id: 'wsDuration',
      prompt: 'How long has pressure been low?',
      type: 'select',
    },
    ...closingSteps(ctx),
  ];
}

/** Flow C — intermittent supply. */
export function intermittentSupplyFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep('Are neighbours experiencing intermittent supply as well?'),
    ...maintenanceStep(ctx),
    {
      id: 'wsIntermittentPattern',
      prompt: 'How does the supply behave?',
      type: 'select',
    },
    {
      id: 'wsDuration',
      prompt: 'How long has this pattern been happening?',
      type: 'select',
    },
    ...closingSteps(ctx, { skipStoredWater: true }),
  ];
}

/** Flow D — air in pipes. */
export function airInPipesFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep('Are neighbours also getting air from their taps?'),
    ...maintenanceStep(ctx),
    {
      id: 'wsAirWhen',
      prompt: 'When do you notice air from the taps?',
      type: 'select',
    },
    {
      id: 'wsAirTapBehavior',
      prompt: 'What comes out when you open the tap?',
      type: 'select',
    },
    {
      id: 'wsDuration',
      prompt: 'How long has this been happening?',
      type: 'select',
    },
    ...closingSteps(ctx, { skipStoredWater: true }),
  ];
}

/** Flow E — delayed water restoration. */
export function delayedRestorationFlow(ctx: PublicFlowContext): ConversationStep[] {
  return [
    neighboursStep('Were neighbours also affected by the same outage?'),
    {
      id: 'wsRestorationContext',
      prompt: 'What were you told about restoration?',
      type: 'select',
    },
    {
      id: 'wsDuration',
      prompt: 'How long has supply been missing or inadequate since the event?',
      type: 'select',
    },
    {
      id: 'wsStillAffected',
      prompt: 'Is your supply fully restored now?',
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
