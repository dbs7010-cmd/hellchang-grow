/** LOCKED constants from the approved layered Danbaek CANON contract. */
export const CharacterBodyConfig = {
  viewBox: { width: 200, height: 280 },
  stroke: { color: '#111111', width: 3, fill: '#FFFFFF' },
  stageCount: 10,
  massScaleMax: 0.18,
  regions: {
    chest: { x: 72, y: 86, width: 56, height: 30 },
    shoulder: { x: 56, y: 78, width: 88, height: 34 },
    arm: { x: 50, y: 86, width: 100, height: 82 },
    back: { x: 62, y: 96, width: 76, height: 54 },
    waist: { x: 76, y: 128, width: 48, height: 46 },
    abs: { x: 86, y: 108, width: 28, height: 52 },
    glute: { x: 74, y: 154, width: 52, height: 30 },
    thigh: { x: 68, y: 168, width: 64, height: 52 },
    calf: { x: 76, y: 214, width: 48, height: 44 },
  },
  seams: {
    neckLeft: [78, 78], neckRight: [122, 78],
    armLeft: [80, 86], armRight: [120, 86],
    pelvisLeft: [85, 168], pelvisRight: [115, 168],
    legLeft: [87, 168], legRight: [113, 168], centerX: 100,
  },
  basePaths: {
    torso: 'M78 78 Q81.5 96 87 136 Q85 154 85 172 L115 172 Q115 154 113 136 Q118.5 96 122 78 Z',
    armLeft: 'M80 86 Q71 110 73.1 145 Q74.8 168 81 167 Q86 145 85 113 Q85 96 80 86 Z',
    armRight: 'M120 86 Q129 110 126.9 145 Q125.2 168 119 167 Q114 145 115 113 Q115 96 120 86 Z',
    legLeft: 'M87 168 Q84.5 192 89.5 234 L90.5 258 Q92 264 101.5 258 L97.5 234 Q100 192 98 170 Z',
    legRight: 'M113 168 Q115.5 192 110.5 234 L109.5 258 Q108 264 98.5 258 L102.5 234 Q100 192 102 170 Z',
  },
  maxDelta: { shoulder: 13.5, chest: 10, back: 8, waist: 9, glute: 11, arm: 21, thigh: 16.5, calf: 13.5 },
} as const;

export type DanbaekApprovedRegion = keyof typeof CharacterBodyConfig.regions;
