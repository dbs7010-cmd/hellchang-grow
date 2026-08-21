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
  return `M78 78 Q${n(81.5 - shoulder * d.shoulder)} 96 ${n(87 - chest * d.chest - back * d.back)} 136 ` +
    `Q${n(85 - waist * d.waist)} 154 ${n(85 - glute * d.glute)} 172 ` +
    `L${n(115 + glute * d.glute)} 172 Q${n(115 + waist * d.waist)} 154 ${n(113 + chest * d.chest + back * d.back)} 136 ` +
    `Q${n(118.5 + shoulder * d.shoulder)} 96 122 78 Z`;
}

function torsoOutline(input: { shoulder?: number; chest?: number; back?: number; waist?: number; glute?: number }): string {
  const d = CharacterBodyConfig.maxDelta;
  const shoulder = input.shoulder ?? 0, chest = input.chest ?? 0, back = input.back ?? 0;
  const waist = input.waist ?? 0, glute = input.glute ?? 0;
  return `M78 78 Q${n(81.5 - shoulder * d.shoulder)} 96 ${n(87 - chest * d.chest - back * d.back)} 136 Q${n(85 - waist * d.waist)} 154 ${n(85 - glute * d.glute)} 172 ` +
    `M115 172 Q${n(115 + waist * d.waist)} 154 ${n(113 + chest * d.chest + back * d.back)} 136 Q${n(118.5 + shoulder * d.shoulder)} 96 122 78`;
}

function armPath(side: 'left' | 'right', value: number): string {
  const delta = value * CharacterBodyConfig.maxDelta.arm;
  return side === 'left'
    ? `M80 86 Q${n(71 - delta)} 110 ${n(73.1 - delta)} 145 Q${n(74.8 - delta * 0.7)} 168 81 167 Q86 145 85 113 Q85 96 80 86 Z`
    : `M120 86 Q${n(129 + delta)} 110 ${n(126.9 + delta)} 145 Q${n(125.2 + delta * 0.7)} 168 119 167 Q114 145 115 113 Q115 96 120 86 Z`;
}

function armOutline(side: 'left' | 'right', value: number): string {
  const delta = value * CharacterBodyConfig.maxDelta.arm;
  return side === 'left'
    ? `M80 86 Q${n(71 - delta)} 110 ${n(73.1 - delta)} 145 Q${n(74.8 - delta * 0.7)} 168 81 167`
    : `M120 86 Q${n(129 + delta)} 110 ${n(126.9 + delta)} 145 Q${n(125.2 + delta * 0.7)} 168 119 167`;
}

function legPath(side: 'left' | 'right', thigh: number, calf: number): string {
  const td = thigh * CharacterBodyConfig.maxDelta.thigh, cd = calf * CharacterBodyConfig.maxDelta.calf;
  return side === 'left'
    ? `M87 168 Q${n(84.5 - td)} 192 ${n(89.5 - cd)} 234 L${n(90.5 - cd)} 258 Q92 264 101.5 258 L97.5 234 Q100 192 98 170 Z`
    : `M113 168 Q${n(115.5 + td)} 192 ${n(110.5 + cd)} 234 L${n(109.5 + cd)} 258 Q108 264 98.5 258 L102.5 234 Q100 192 102 170 Z`;
}

function legOutline(side: 'left' | 'right', thigh: number, calf: number): string {
  const td = thigh * CharacterBodyConfig.maxDelta.thigh, cd = calf * CharacterBodyConfig.maxDelta.calf;
  return side === 'left'
    ? `M87 168 Q${n(84.5 - td)} 192 ${n(89.5 - cd)} 234 L${n(90.5 - cd)} 258 Q92 264 101.5 258`
    : `M113 168 Q${n(115.5 + td)} 192 ${n(110.5 + cd)} 234 L${n(109.5 + cd)} 258 Q108 264 98.5 258`;
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
