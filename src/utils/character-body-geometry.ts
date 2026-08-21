import { CharacterBodyConfig, type DanbaekApprovedRegion } from '@/config/character-body-config';
import type { DanbaekBodyParameters } from '@/types/body-state';

export type DanbaekCanonStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export interface DanbaekRegionOverlay { region: DanbaekApprovedRegion; path: string; outline: string; opacity: number }
export interface CharacterBodyGeometry {
  stages: Record<keyof DanbaekBodyParameters, DanbaekCanonStage>;
  overlays: DanbaekRegionOverlay[];
  detailOpacity: number;
  chestLineOpacity: number;
  backLineOpacity: number;
  abdomenLineOpacity: number;
  armLineOpacity: number;
  legLineOpacity: number;
  massScale: number;
}

export const NeutralDanbaekBodyParameters: DanbaekBodyParameters = {
  chestScale: 0, shoulderScale: 0, armScale: 0, backWidth: 0, backThickness: 0,
  waistScale: 0, abdomenDefinition: 0, gluteScale: 0, thighScale: 0, calfScale: 0,
  overallMass: 0, fatSoftness: 0, definition: 0,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const n = (value: number) => String(Math.round(value * 100) / 100);

export function toDanbaekCanonStage(value: number): DanbaekCanonStage {
  return (Math.round(clamp01(value) * 9) + 1) as DanbaekCanonStage;
}

function torsoPath(input: { shoulder?: number; chest?: number; back?: number; waist?: number; glute?: number }): string {
  const d = CharacterBodyConfig.maxDelta;
  const shoulder = input.shoulder ?? 0, chest = input.chest ?? 0, back = input.back ?? 0;
  const waist = input.waist ?? 0, glute = input.glute ?? 0;
  return `M99 76 C${n(90 - shoulder * d.shoulder)} 74 ${n(82 - shoulder * d.shoulder)} 77 ${n(79 - shoulder * d.shoulder)} 83 ` +
    `C${n(76 - chest * d.chest - back * d.back)} 95 ${n(78 - chest * d.chest - back * d.back)} 111 ${n(80 - chest * d.chest - back * d.back)} 126 ` +
    `C${n(82 - waist * d.waist)} 139 ${n(81 - waist * d.waist)} 151 83 160 C84 165 ${n(86 - glute * d.glute)} 168 ${n(90 - glute * d.glute)} 170 ` +
    `C95 172 105 172 ${n(111 + glute * d.glute)} 169 C${n(115 + glute * d.glute)} 166 116 163 ${n(117 + waist * d.waist)} 159 ` +
    `C${n(119 + waist * d.waist)} 150 ${n(118 + chest * d.chest + back * d.back)} 139 ${n(120 + chest * d.chest + back * d.back)} 126 ` +
    `C${n(122 + chest * d.chest + back * d.back)} 111 ${n(124 + shoulder * d.shoulder)} 95 ${n(121 + shoulder * d.shoulder)} 83 C${n(118 + shoulder * d.shoulder)} 77 ${n(110 + shoulder * d.shoulder)} 74 101 76 Z`;
}

function torsoOutline(input: { shoulder?: number; chest?: number; back?: number; waist?: number; glute?: number }): string {
  const d = CharacterBodyConfig.maxDelta;
  const shoulder = input.shoulder ?? 0, chest = input.chest ?? 0, back = input.back ?? 0;
  const waist = input.waist ?? 0, glute = input.glute ?? 0;
  return `M99 76 C${n(90 - shoulder * d.shoulder)} 74 ${n(82 - shoulder * d.shoulder)} 77 ${n(79 - shoulder * d.shoulder)} 83 C${n(76 - chest * d.chest - back * d.back)} 95 ${n(78 - chest * d.chest - back * d.back)} 111 ${n(80 - chest * d.chest - back * d.back)} 126 ` +
    `C${n(82 - waist * d.waist)} 139 ${n(81 - waist * d.waist)} 151 83 160 C84 165 ${n(86 - glute * d.glute)} 168 ${n(90 - glute * d.glute)} 170 ` +
    `M${n(111 + glute * d.glute)} 169 C${n(115 + glute * d.glute)} 166 116 163 ${n(117 + waist * d.waist)} 159 C${n(119 + waist * d.waist)} 150 ${n(118 + chest * d.chest + back * d.back)} 139 ${n(120 + chest * d.chest + back * d.back)} 126 ` +
    `C${n(122 + chest * d.chest + back * d.back)} 111 ${n(124 + shoulder * d.shoulder)} 95 ${n(121 + shoulder * d.shoulder)} 83`;
}

function armPath(side: 'left' | 'right', value: number): string {
  const delta = value * CharacterBodyConfig.maxDelta.arm;
  return side === 'left'
    ? `M80 86 C${n(74 - delta * 0.3)} 90 ${n(71 - delta)} 102 ${n(70 - delta)} 115 C${n(69 - delta)} 128 ${n(71 - delta * 0.65)} 139 ${n(69 - delta * 0.7)} 151 C68 158 70 164 74 168 C77 170 80 168 81 165 C83 157 82 146 84 136 C86 119 86 102 80 86 Z`
    : `M120 86 C${n(126 + delta * 0.3)} 90 ${n(129 + delta)} 102 ${n(130 + delta)} 116 C${n(131 + delta)} 128 ${n(129 + delta * 0.65)} 140 ${n(131 + delta * 0.7)} 151 C132 158 130 164 126 168 C123 170 120 168 119 165 C117 157 118 146 116 136 C114 119 114 102 120 86 Z`;
}

function armOutline(side: 'left' | 'right', value: number): string {
  const delta = value * CharacterBodyConfig.maxDelta.arm;
  return side === 'left'
    ? `M80 86 C${n(74 - delta * 0.3)} 90 ${n(71 - delta)} 102 ${n(70 - delta)} 115 C${n(69 - delta)} 128 ${n(71 - delta * 0.65)} 139 ${n(69 - delta * 0.7)} 151 C68 158 70 164 74 168 C77 170 80 168 81 165`
    : `M120 86 C${n(126 + delta * 0.3)} 90 ${n(129 + delta)} 102 ${n(130 + delta)} 116 C${n(131 + delta)} 128 ${n(129 + delta * 0.65)} 140 ${n(131 + delta * 0.7)} 151 C132 158 130 164 126 168 C123 170 120 168 119 165`;
}

function legPath(side: 'left' | 'right', thigh: number, calf: number): string {
  const td = thigh * CharacterBodyConfig.maxDelta.thigh, cd = calf * CharacterBodyConfig.maxDelta.calf;
  return side === 'left'
    ? `M87 168 C${n(84 - td)} 181 ${n(83 - td)} 196 ${n(85 - td * 0.4)} 211 C${n(86 - cd * 0.3)} 220 ${n(84 - cd)} 232 ${n(85 - cd)} 244 C85 251 84 254 87 255 C91 256 96 255 98 252 C99 244 97 232 98 220 C100 199 100 181 99 169 Z`
    : `M113 168 C${n(116 + td)} 181 ${n(117 + td)} 196 ${n(115 + td * 0.4)} 211 C${n(114 + cd * 0.3)} 220 ${n(116 + cd)} 232 ${n(115 + cd)} 244 C115 251 116 254 113 255 C109 256 104 255 102 252 C101 244 103 232 102 220 C100 199 100 181 101 169 Z`;
}

function legOutline(side: 'left' | 'right', thigh: number, calf: number): string {
  const td = thigh * CharacterBodyConfig.maxDelta.thigh, cd = calf * CharacterBodyConfig.maxDelta.calf;
  return side === 'left'
    ? `M87 168 C${n(84 - td)} 181 ${n(83 - td)} 196 ${n(85 - td * 0.4)} 211 C${n(86 - cd * 0.3)} 220 ${n(84 - cd)} 232 ${n(85 - cd)} 244 C85 251 84 254 87 255 C91 256 96 255 98 252`
    : `M113 168 C${n(116 + td)} 181 ${n(117 + td)} 196 ${n(115 + td * 0.4)} 211 C${n(114 + cd * 0.3)} 220 ${n(116 + cd)} 232 ${n(115 + cd)} 244 C115 251 116 254 113 255 C109 256 104 255 102 252`;
}

/** Pure adapter: normalized BodyParameters -> approved, clipped CANON overlays. */
export function buildCharacterBodyGeometry(input: { size?: number; tone?: number; bodyParameters?: DanbaekBodyParameters | null }): CharacterBodyGeometry {
  const raw = input.bodyParameters ?? NeutralDanbaekBodyParameters;
  // Stage metadata selects the CANON reference band. Local path interpolation remains continuous
  // inside that band so a small, temporary pump is still visible without changing Growth stages.
  const body = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, clamp01(value)])) as unknown as DanbaekBodyParameters;
  const stages = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, toDanbaekCanonStage(value)])) as CharacterBodyGeometry['stages'];
  const overlays: DanbaekRegionOverlay[] = [];
  if (body.shoulderScale > 0) overlays.push({ region: 'shoulder', path: torsoPath({ shoulder: body.shoulderScale }), outline: torsoOutline({ shoulder: body.shoulderScale }), opacity: 1 });
  if (body.chestScale > 0) overlays.push({ region: 'chest', path: torsoPath({ chest: body.chestScale }), outline: torsoOutline({ chest: body.chestScale }), opacity: 1 });
  if (body.backWidth > 0) overlays.push({ region: 'back', path: torsoPath({ back: body.backWidth }), outline: torsoOutline({ back: body.backWidth }), opacity: 1 });
  if (body.waistScale > 0) overlays.push({ region: 'waist', path: torsoPath({ waist: body.waistScale }), outline: torsoOutline({ waist: body.waistScale }), opacity: 1 });
  if (body.gluteScale > 0) overlays.push({ region: 'glute', path: torsoPath({ glute: body.gluteScale }), outline: torsoOutline({ glute: body.gluteScale }), opacity: 1 });
  if (body.armScale > 0) {
    overlays.push({ region: 'arm', path: armPath('left', body.armScale), outline: armOutline('left', body.armScale), opacity: 1 }, { region: 'arm', path: armPath('right', body.armScale), outline: armOutline('right', body.armScale), opacity: 1 });
  }
  if (body.thighScale > 0) {
    overlays.push({ region: 'thigh', path: legPath('left', body.thighScale, 0), outline: legOutline('left', body.thighScale, 0), opacity: 1 }, { region: 'thigh', path: legPath('right', body.thighScale, 0), outline: legOutline('right', body.thighScale, 0), opacity: 1 });
  }
  if (body.calfScale > 0) {
    overlays.push({ region: 'calf', path: legPath('left', 0, body.calfScale), outline: legOutline('left', 0, body.calfScale), opacity: 1 }, { region: 'calf', path: legPath('right', 0, body.calfScale), outline: legOutline('right', 0, body.calfScale), opacity: 1 });
  }
  const detailOpacity = clamp01(body.definition * (1 - body.fatSoftness));
  return {
    stages, overlays, detailOpacity,
    chestLineOpacity: clamp01(body.chestScale * detailOpacity),
    backLineOpacity: clamp01(body.backThickness * detailOpacity),
    abdomenLineOpacity: clamp01(body.abdomenDefinition * (1 - body.fatSoftness)),
    armLineOpacity: clamp01(body.armScale * detailOpacity),
    legLineOpacity: clamp01(Math.max(body.thighScale, body.calfScale) * detailOpacity),
    massScale: 1 + body.overallMass * CharacterBodyConfig.massScaleMax,
  };
}
