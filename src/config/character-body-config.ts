/**
 * Danbaek layered body renderer contract.
 *
 * VISUAL CANON (2026-08-26): soft white rice-cake mascot, oversized round head,
 * friendly face/blush, compact athletic body and black D training shorts.
 * This is the one visual identity used across onboarding/HOME/session/result/history/world.
 * Body-region growth remains driven exclusively by the existing BodyParameters pipeline.
 */
export const CharacterBodyConfig = {
  viewBox: { width: 200, height: 280 },
  stroke: { color: '#171717', width: 3, fill: '#FFFFFF' },
  stageCount: 10,
  // Compact mascot silhouette: never stretch the body into the old mannequin proportions.
  stage0BodyProportion: { anchorY: 82, scaleY: 0.92 },
  massScaleMax: 0.18,
  regions: {
    chest: { x: 64, y: 86, width: 72, height: 34 },
    shoulder: { x: 48, y: 78, width: 104, height: 38 },
    arm: { x: 42, y: 86, width: 116, height: 82 },
    back: { x: 58, y: 96, width: 84, height: 58 },
    waist: { x: 72, y: 128, width: 56, height: 46 },
    abs: { x: 82, y: 108, width: 36, height: 52 },
    glute: { x: 68, y: 154, width: 64, height: 34 },
    thigh: { x: 62, y: 168, width: 76, height: 52 },
    calf: { x: 68, y: 214, width: 64, height: 46 },
  },
  seams: {
    neckLeft: [76, 80], neckRight: [124, 80],
    armLeft: [74, 88], armRight: [126, 88],
    pelvisLeft: [82, 168], pelvisRight: [118, 168],
    legLeft: [85, 168], legRight: [115, 168], centerX: 100,
  },
  fixedIdentity: {
    // Large round rice-cake head + small three-lobe tuft from the approved reference.
    headPath: 'M100 25 C105 18 112 22 111 29 C118 24 125 29 121 36 C134 42 141 54 139 68 C137 84 121 94 100 95 C79 94 63 84 61 68 C59 53 67 41 80 36 C76 29 84 24 91 30 C91 22 98 19 100 25 Z',
    eyes: { leftX: 86, rightX: 114, y: 61, radius: 4.2 },
    blush: { leftX: 74, rightX: 126, y: 72, radiusX: 8, radiusY: 4, color: '#F6B8AE', opacity: 0.58 },
    mouth: 'M92 72 Q100 82 108 72 Q100 88 92 72 Z',
    shorts: {
      path: 'M72 151 Q100 156 128 151 L132 187 Q116 191 102 184 L100 171 L98 184 Q84 191 68 187 Z',
      fill: '#252525',
      waist: 'M72 155 Q100 160 128 155',
      mark: 'D',
    },
  },
  basePaths: {
    // Athletic from Stage 0 without anatomical striation: broad shoulders/chest, narrow waist.
    torso: 'M99 80 C86 77 74 80 68 90 C64 102 69 116 73 128 C77 139 74 151 78 162 C82 171 91 174 100 174 C109 174 118 171 122 162 C126 151 123 139 127 128 C131 116 136 102 132 90 C126 80 114 77 101 80 Z',
    armLeft: 'M70 89 C60 92 53 103 51 116 C49 128 53 139 49 151 C46 160 49 169 56 173 C62 176 68 172 70 166 C74 156 72 145 77 135 C82 120 82 101 70 89 Z',
    armRight: 'M130 89 C140 92 147 103 149 116 C151 128 147 139 151 151 C154 160 151 169 144 173 C138 176 132 172 130 166 C126 156 128 145 123 135 C118 120 118 101 130 89 Z',
    legLeft: 'M82 169 C76 183 75 198 79 213 C81 222 76 235 78 248 C79 257 84 261 92 259 C98 257 100 252 99 245 C97 233 100 222 101 211 C103 192 101 179 98 170 Z',
    legRight: 'M118 169 C124 183 125 198 121 213 C119 222 124 235 122 248 C121 257 116 261 108 259 C102 257 100 252 101 245 C103 233 100 222 99 211 C97 192 99 179 102 170 Z',
  },
  maxDelta: { shoulder: 13.5, chest: 10, back: 8, waist: 9, glute: 11, arm: 21, thigh: 16.5, calf: 13.5 },
} as const;

export type DanbaekApprovedRegion = keyof typeof CharacterBodyConfig.regions;
