import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { DanbaekGainVoiceLines, DanbaekSetVoiceLine, DanbaekStageVoiceLines, MovementFamilyShortLabels } from '@/config/danbaek-voice-lines';
import type { DanbaekLearningProfile, LearnedCapability, LearningStage, MovementFamily } from '@/types/danbaek-contract';

export function formatLearningStatus(family: MovementFamily, stage: LearningStage): string {
  return `${MovementFamilyShortLabels[family]} · ${LearningStageLabels[stage]}`;
}

export function mostRecentlyObserved(profile: DanbaekLearningProfile): LearnedCapability | null {
  let best: LearnedCapability | null = null;
  for (const capability of profile.capabilities) {
    if (capability.evidenceCount <= 0 || !capability.lastObservedAt) continue;
    if (!best) { best = capability; continue; }
    const later = capability.lastObservedAt > (best.lastObservedAt ?? '');
    const sameButMore = capability.lastObservedAt === best.lastObservedAt && capability.evidenceCount > best.evidenceCount;
    if (later || sameButMore) best = capability;
  }
  return best;
}

export function buildDanbaekVoice(profile: DanbaekLearningProfile) {
  const capability = mostRecentlyObserved(profile);
  if (!capability) return { line: DanbaekStageVoiceLines.unseen, status: '아직 본 동작 없음', movementFamily: null, learningStage: 'unseen' as const, waiting: true };
  return { line: DanbaekStageVoiceLines[capability.learningStage], status: formatLearningStatus(capability.movementFamily, capability.learningStage), movementFamily: capability.movementFamily, learningStage: capability.learningStage, waiting: false };
}

export function buildDanbaekSetVoice(family: MovementFamily) {
  return { line: DanbaekSetVoiceLine, status: MovementFamilyShortLabels[family] };
}

export function buildDanbaekGainVoice(input: { family: MovementFamily; from: LearningStage; to: LearningStage; evidenceDelta: number }) {
  const changed = input.from !== input.to;
  return { line: changed ? DanbaekGainVoiceLines.stageUp : DanbaekGainVoiceLines.moreEvidence, status: changed ? `${MovementFamilyShortLabels[input.family]} · ${LearningStageLabels[input.from]} → ${LearningStageLabels[input.to]}` : `${MovementFamilyShortLabels[input.family]} · 오늘 ${input.evidenceDelta}번 더 봤어요` };
}

export function buildLearningBoard(profile: DanbaekLearningProfile, limit = 3) {
  return profile.capabilities.filter((capability) => capability.evidenceCount > 0).sort((a, b) => b.evidenceCount !== a.evidenceCount ? b.evidenceCount - a.evidenceCount : a.movementFamily.localeCompare(b.movementFamily)).slice(0, limit).map((capability) => ({ family: capability.movementFamily, label: MovementFamilyShortLabels[capability.movementFamily], stageLabel: LearningStageLabels[capability.learningStage], learningStage: capability.learningStage, evidenceCount: capability.evidenceCount }));
}

export function seenFamilyCount(profile: DanbaekLearningProfile): number {
  return profile.capabilities.filter((capability) => capability.evidenceCount > 0).length;
}

export function learnedFamilyCount(profile: DanbaekLearningProfile): number {
  return profile.capabilities.filter((capability) => capability.learningStage === 'learned' || capability.learningStage === 'familiar' || capability.learningStage === 'proficient').length;
}
