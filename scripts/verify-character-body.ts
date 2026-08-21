// Verifies the LOCKED layered CANON adapter without changing Growth/Body State.
import { CharacterBodyConfig, type DanbaekApprovedRegion } from '@/config/character-body-config';
import { BodyStateConfig } from '@/config/body-state-config';
import type { DanbaekBodyParameters } from '@/types/body-state';
import { applyPumpToBodyParameters } from '@/utils/body-parameters';
import { buildCharacterBodyGeometry, NeutralDanbaekBodyParameters, toDanbaekCanonStage } from '@/utils/character-body-geometry';

let failures = 0;
function expect(name: string, condition: boolean, detail?: unknown) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) { failures++; if (detail !== undefined) console.log('  detail:', detail); }
}
function geometry(overrides: Partial<DanbaekBodyParameters> = {}) {
  return buildCharacterBodyGeometry({ bodyParameters: { ...NeutralDanbaekBodyParameters, ...overrides } });
}
function regions(overrides: Partial<DanbaekBodyParameters>): DanbaekApprovedRegion[] {
  return [...new Set(geometry(overrides).overlays.map((item) => item.region))];
}
function same(name: string, actual: unknown, expected: unknown) {
  expect(name, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected });
}

// Contract coordinates and Stage 0 identity.
same('approved regions match the LOCKED layer contract', CharacterBodyConfig.regions, {
  chest: { x: 72, y: 86, width: 56, height: 30 }, shoulder: { x: 56, y: 78, width: 88, height: 34 },
  arm: { x: 50, y: 86, width: 100, height: 82 }, back: { x: 62, y: 96, width: 76, height: 54 },
  waist: { x: 76, y: 128, width: 48, height: 46 }, abs: { x: 86, y: 108, width: 28, height: 52 },
  glute: { x: 74, y: 154, width: 52, height: 30 }, thigh: { x: 68, y: 168, width: 64, height: 52 },
  calf: { x: 76, y: 214, width: 48, height: 44 },
});
expect('Stage 0 uses the restored layered master torso path verbatim', CharacterBodyConfig.basePaths.torso.startsWith('M99 76 C90 74'));
expect('neutral body adds no local overlay', geometry().overlays.length === 0);
expect('neutral body has no invented detail lines', geometry().detailOpacity === 0 && geometry().abdomenLineOpacity === 0);

same('0/25/50/75/100 percent map to CANON stages', [0, .25, .5, .75, 1].map(toDanbaekCanonStage), [1, 3, 6, 8, 10]);
for (const value of [0, .25, .5, .75, 1]) {
  const all = Object.fromEntries(Object.keys(NeutralDanbaekBodyParameters).map((key) => [key, value])) as unknown as DanbaekBodyParameters;
  const result = buildCharacterBodyGeometry({ bodyParameters: all });
  expect(`all parameters at ${value * 100}% use one CANON stage`, Object.values(result.stages).every((stage) => stage === toDanbaekCanonStage(value)));
  expect(`overall mass at ${value * 100}% stays within 18%`, result.massScale >= 1 && result.massScale <= 1.18);
}

// A single parameter may only create overlays in its approved region.
same('chest only changes chest clip', regions({ chestScale: 1 }), ['chest']);
same('shoulder only changes shoulder clip', regions({ shoulderScale: 1 }), ['shoulder']);
same('arm only changes paired arm clip', regions({ armScale: 1 }), ['arm']);
same('back width only changes back clip', regions({ backWidth: 1 }), ['back']);
same('waist only changes waist clip', regions({ waistScale: 1 }), ['waist']);
same('glute only changes glute clip', regions({ gluteScale: 1 }), ['glute']);
same('thigh only changes thigh clip', regions({ thighScale: 1 }), ['thigh']);
same('calf only changes calf clip', regions({ calfScale: 1 }), ['calf']);

expect('left/right arm roots remain fixed seam anchors', geometry({ armScale: 1 }).overlays.every((o) => o.path.startsWith(o.path.includes('M80 86') ? 'M80 86' : 'M120 86')));
expect('left/right leg roots remain fixed seam anchors', geometry({ thighScale: 1 }).overlays.every((o) => o.path.startsWith(o.path.includes('M87 168') ? 'M87 168' : 'M113 168')));

expect('back thickness changes lines, never silhouette', regions({ backThickness: 1 }).length === 0 && geometry({ backThickness: 1, definition: 1 }).backLineOpacity > 0);
expect('abs changes lines, never silhouette', regions({ abdomenDefinition: 1 }).length === 0 && geometry({ abdomenDefinition: 1 }).abdomenLineOpacity > 0);
expect('definition changes detail only', regions({ definition: 1 }).length === 0 && geometry({ definition: 1 }).detailOpacity === 1);
expect('fat softness changes detail only', regions({ definition: 1, fatSoftness: 1 }).length === 0 && geometry({ definition: 1, fatSoftness: 1 }).detailOpacity === 0);
expect('overall mass is bounded and creates no part overlay', regions({ overallMass: 1 }).length === 0 && geometry({ overallMass: 1 }).massScale === 1.18);

const permanent = { ...NeutralDanbaekBodyParameters, chestScale: .4 };
const pumped = applyPumpToBodyParameters(permanent, { chest: BodyStateConfig.pump.referenceSp });
expect('session pump changes the chest path even inside one CANON stage', geometry(pumped).overlays[0]?.path !== geometry(permanent).overlays[0]?.path);
expect('session pump does not advance unrelated arm stage', geometry(pumped).stages.armScale === geometry(permanent).stages.armScale);

console.log(failures === 0 ? '\nAll DANBAEK CANON RENDERER checks passed.' : `\n${failures} DANBAEK CANON RENDERER check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
