/**
 * Danbaek layered body renderer contract.
 *
 * VISUAL CANON (2026-08-26): the approved Danbaek reference sheet supersedes the
 * earlier plain mannequin identity.  Learning/growth semantics stay unchanged;
 * this file only owns render geometry.  The identity is now: soft white body,
 * rounded head with the small rice-cake tuft, large friendly eyes, blush, an
 * expressive mouth and black D training shorts.  Body-region growth remains
 * driven exclusively by the existing BodyParameters pipeline.
 */
export const CharacterBodyConfig = {
  viewBox: { width: 200, height: 280 },
  stroke: { color: '#171717', width: 3, fill: '#FFFFFF' },
  stageCount: 10,
  stage0BodyProportion: { anchorY: 76, scaleY: 0.8 },
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
  fixedIdentity: {
    // Wider/softer than the old mannequin head, with the reference's three-lobe tuft.
    headPath: 'M100 34 C104 28 108 30 108 35 C113 31 118 34 116 39 C127 44 132 54 130 65 C128 78 116 86 100 87 C84 86 72 78 70 65 C68 53 74 43 85 39 C83 34 89 31 93 36 C94 30 99 29 100 34 Z',
    eyes: { leftX: 89, rightX: 111, y: 58, radius: 3.2 },
    blush: { leftX: 80, rightX: 120, y: 68, radiusX: 6.5, radiusY: 3.2, color: '#F6B8AE', opacity: 0.55 },
    mouth: 'M94 69 Q100 77 106 69 Q100 82 94 69 Z',
    shorts: {
      path: 'M80 151 Q100 155 120 151 L124 183 Q113 186 102 181 L100 170 L98 181 Q87 186 76 183 Z',
      fill: '#252525',
      waist: 'M80 155 Q100 159 120 155',
      mark: 'D',
    },
  },
  basePaths: {
    torso: 'M99 76 C90 74 82 77 79 83 C76 95 78 111 80 126 C82 139 81 151 83 160 C84 165 86 168 90 170 C95 172 105 172 111 169 C115 166 116 163 117 159 C119 150 118 139 120 126 C122 111 124 95 121 83 C118 77 110 74 101 76 Z',
    armLeft: 'M80 86 C74 90 71 102 70 115 C69 128 71 139 69 151 C68 158 70 164 74 168 C77 170 80 168 81 165 C83 157 82 146 84 136 C86 119 86 102 80 86 Z',
    armRight: 'M120 86 C126 90 129 102 130 116 C131 128 129 140 131 151 C132 158 130 164 126 168 C123 170 120 168 119 165 C117 157 118 146 116 136 C114 119 114 102 120 86 Z',
    legLeft: 'M87 168 C84 181 83 196 85 211 C86 220 84 232 85 244 C85 251 84 254 87 255 C91 256 96 255 98 252 C99 244 97 232 98 220 C100 199 100 181 99 169 Z',
    legRight: 'M113 168 C116 181 117 196 115 211 C114 220 116 232 115 244 C115 251 116 254 113 255 C109 256 104 255 102 252 C101 244 103 232 102 220 C100 199 100 181 101 169 Z',
  },
  maxDelta: { shoulder: 13.5, chest: 10, back: 8, waist: 9, glute: 11, arm: 21, thigh: 16.5, calf: 13.5 },
} as const;

export type DanbaekApprovedRegion = keyof typeof CharacterBodyConfig.regions;
