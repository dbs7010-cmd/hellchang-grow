import { LearningStageLabels } from '@/config/danbaek-learning-policy';
import { DanbaekGainVoiceLines, DanbaekSetVoiceLine, DanbaekStageVoiceLines, MovementFamilyShortLabels } from '@/config/danbaek-voice-lines';
import type { DanbaekLearningProfile, LearningStage, MovementFamily } from '@/types/danbaek-contract';

export function formatLearningStatus(family: MovementFamily, stage: LearningStage): string { return `${MovementFamilyShortLabels[family]} · ${LearningStageLabels[stage]}`; }
export function buildDanbaekVoice(family: MovementFamily, stage: LearningStage) { return { line: DanbaekStageVoiceLines[stage], status: formatLearningStatus(family, stage) }; }
export function buildDanbaekSetVoice(family: MovementFamily) { return { line: DanbaekSetVoiceLine, status: MovementFamilyShortLabels[family] }; }
export function buildDanbaekGainVoice(input:{family:MovementFamily;from:LearningStage;to:LearningStage;evidenceDelta:number}) { const changed=input.from!==input.to; return { line: changed?DanbaekGainVoiceLines.stageUp:DanbaekGainVoiceLines.moreEvidence, status: changed?`${MovementFamilyShortLabels[input.family]} · ${LearningStageLabels[input.from]} → ${LearningStageLabels[input.to]}`:`${MovementFamilyShortLabels[input.family]} · 오늘 ${input.evidenceDelta}번 더 봤어요` }; }
export function mostRecentlyObserved(profile:DanbaekLearningProfile){ return profile.movements.filter(m=>m.evidenceCount>0).sort((a,b)=>{const at=a.lastObservedAt??'';const bt=b.lastObservedAt??'';if(at!==bt)return bt.localeCompare(at);if(a.evidenceCount!==b.evidenceCount)return b.evidenceCount-a.evidenceCount;return profile.movements.indexOf(a)-profile.movements.indexOf(b);})[0]??null; }
export function buildLearningBoard(profile:DanbaekLearningProfile){ return profile.movements.filter(m=>m.evidenceCount>0).map(m=>({family:m.movementFamily,label:MovementFamilyShortLabels[m.movementFamily],stageLabel:LearningStageLabels[m.learningStage],evidenceCount:m.evidenceCount})); }
