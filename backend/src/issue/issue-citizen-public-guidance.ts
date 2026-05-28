/**
 * Citizen-facing guidance on public tracking, aligned with common water-utility
 * practice: clear expectations, self-help steps, and pointers to official channels
 * (cf. customer portals, outage communication, GIS-backed service maps in the industry).
 * Copy is informational only — not a contractual SLA.
 */

export type CitizenPublicGuidance = {
  headline: string;
  bullets: string[];
  disclaimer: string;
};

const DISCLAIMER =
  'Response times are typical goals for triage and updates, not guarantees. For fire, serious injury, or immediate danger, contact emergency services first.';

function uniqKeepOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

export function buildCitizenPublicGuidance(params: {
  issueCategory: string;
  issueSubcategory: string | null;
  urgencyLevel: string;
}): CitizenPublicGuidance {
  const sub = (params.issueSubcategory ?? '').trim();
  const u = (params.urgencyLevel ?? 'normal').trim().toLowerCase();
  const bullets: string[] = [];
  let headline: string;

  if (u === 'critical' || sub === 'suspected_contamination') {
    headline =
      'This report is treated as highest priority (health or safety related). Where staffing allows, teams aim to review and reach out within a few hours.';
    bullets.push(
      'If you have been told to boil water or stop using water, follow that advice until an official all-clear.',
    );
    bullets.push(
      'If several households see the same problem, each home should report so the pattern is visible to dispatch.',
    );
  } else if (u === 'urgent') {
    headline =
      'This complaint type is marked urgent (for example major loss of supply or serious asset damage). Teams aim for same-day triage on working days when resources allow.';
    bullets.push(
      'Stay clear of major leaks, hydrant damage, or excavations; do not try to repair street mains yourself.',
    );
  } else if (u === 'high') {
    headline =
      'Your complaint is marked high priority relative to routine cases. Staff typically aim to progress it within about one to two working days where possible.';
  } else {
    headline =
      'Your complaint is logged and routed to the correct department. For standard cases, an initial update or assignment often occurs within a few working days.';
  }

  switch (params.issueCategory) {
    case 'water_supply': {
      bullets.push(
        'Check whether neighbours have the same symptom — that helps tell a zone outage from a problem on your connection.',
      );
      if (sub === 'no_water_supply' || sub === 'delayed_water_restoration') {
        bullets.push(
          'If the utility published a shutdown or restoration time, keep that reference handy; crews may still be clearing air or recharging mains after work.',
        );
      }
      if (sub === 'low_water_pressure') {
        bullets.push(
          'Note whether all taps are weak or only one; peak-hour weakness across a neighbourhood often differs from a single faulty fitting.',
        );
      }
      if (sub === 'air_in_pipes') {
        bullets.push(
          'After nearby mains work, short bursts of milky water can be air; flush cold water into a bucket until it clears unless you are told otherwise.',
        );
      }
      break;
    }
    case 'water_quality':
      bullets.push(
        'If staff ask you to sample appearance, run the cold tap for several minutes into a bucket before judging colour (unless they tell you otherwise).',
      );
      break;
    case 'metering':
      bullets.push(
        'Have your meter number and any token or receipt references ready if someone calls you back.',
      );
      break;
    case 'digital_payment':
      bullets.push(
        'Keep screenshots, SMS receipts, or bank references — they speed up reconciliation with billing and ICT.',
      );
      break;
    case 'billing_account':
      bullets.push(
        'Have your account number, latest bill or statement reference, and (if relevant) bill period, payment proof, and whether your reads were estimated or actual — this speeds up account and dispute handling.',
      );
      break;
    case 'infrastructure_maintenance':
      bullets.push(
        'If the situation changes (more water on the road, loss of pressure), you can submit a new note by reporting again or wait for staff contact with this reference.',
      );
      break;
    case 'illegal_connection_fraud':
      bullets.push(
        'Do not confront suspects yourself; note safe observations (time, vehicle, description) for investigators.',
      );
      break;
    default:
      break;
  }

  bullets.push(
    'Many water utilities publish planned shutdowns or area outages on official websites or social media — check those for large-scale work affecting your area.',
  );
  bullets.push(
    'Use this same reference and phone number whenever you follow up so your history stays on one ticket.',
  );

  return {
    headline,
    bullets: uniqKeepOrder(bullets),
    disclaimer: DISCLAIMER,
  };
}
