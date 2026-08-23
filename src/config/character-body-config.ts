/** LOCKED constants from the approved layered Danbaek CANON contract. */
export const CharacterBodyConfig = {
  viewBox: { width: 200, height: 280 },
  stroke: { color: '#111111', width: 3, fill: '#FFFFFF' },
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
    // FINAL FACE CANON v3: rounded crown/cheeks taper into a small rounded jaw.
    // This identity is fixed across every body stage; only the body grows.
    headPath: 'M100 38 C111.5 38 120 46.5 120 57 C120 67 114 74 106 77 C103 78.5 101 79 100 79 C99 79 97 78.5 94 77 C86 74 80 67 80 57 C80 46.5 88.5 38 100 38 Z',
    eyes: { leftX: 92, rightX: 108, y: 54, radius: 1.6 },
    mouth: 'M91 63 Q100 70 109 63',
    mouthStrokeWidth: 2.2,
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
