// Derives the NEUTRAL production render as a standalone SVG, straight from the
// production sources. Nothing here is hand-drawn: every number is extracted from
// src/config/character-body-config.ts and the neutral branch of
// src/utils/character-body-geometry.ts (all BodyParameters = 0).
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const OUT = process.argv[3];

const cfg = fs.readFileSync(path.join(ROOT, 'src/config/character-body-config.ts'), 'utf8');
const geo = fs.readFileSync(path.join(ROOT, 'src/utils/character-body-geometry.ts'), 'utf8');
const sil = fs.readFileSync(path.join(ROOT, 'src/components/character/character-silhouette.tsx'), 'utf8');

const grab = (re, label) => {
  const m = cfg.match(re);
  if (!m) throw new Error('could not extract ' + label);
  return m[1];
};

const vbW = Number(grab(/viewBox: \{ width: (\d+)/, 'viewBox.width'));
const vbH = Number(grab(/viewBox: \{ width: \d+, height: (\d+)/, 'viewBox.height'));
const strokeColor = grab(/stroke: \{ color: '([^']+)'/, 'stroke.color');
const strokeWidth = Number(grab(/stroke: \{ color: '[^']+', width: ([\d.]+)/, 'stroke.width'));
const strokeFill = grab(/stroke: \{ color: '[^']+', width: [\d.]+, fill: '([^']+)'/, 'stroke.fill');
const scaleY = Number(grab(/stage0BodyProportion: \{ anchorY: \d+, scaleY: ([\d.]+)/, 'scaleY'));
const neckY = Number(grab(/neckLeft: \[\d+, (\d+)\]/, 'seams.neckLeft.y'));
const headPath = grab(/headPath: '([^']+)'/, 'headPath');
const eyeL = Number(grab(/eyes: \{ leftX: ([\d.]+)/, 'eyes.leftX'));
const eyeR = Number(grab(/eyes: \{ leftX: [\d.]+, rightX: ([\d.]+)/, 'eyes.rightX'));
const eyeY = Number(grab(/eyes: \{[^}]*y: ([\d.]+)/, 'eyes.y'));
const eyeR2 = Number(grab(/eyes: \{[^}]*radius: ([\d.]+)/, 'eyes.radius'));
const mouth = grab(/mouth: '([^']+)'/, 'mouth');
const mouthW = Number(grab(/mouthStrokeWidth: ([\d.]+)/, 'mouthStrokeWidth'));

const basePaths = {};
for (const key of ['torso', 'armLeft', 'armRight', 'legLeft', 'legRight']) {
  basePaths[key] = grab(new RegExp(key + ": '([^']+)'"), 'basePaths.' + key);
}

// Neutral invariants, asserted rather than assumed.
const neutralAllZero = /NeutralDanbaekBodyParameters[^=]*= \{([^}]*)\}/.exec(geo)[1];
const values = neutralAllZero.match(/:\s*(-?[\d.]+)/g).map((s) => Number(s.slice(1)));
if (!values.every((v) => v === 0)) throw new Error('neutral parameters are no longer all zero');
if (!/massScale: 1 \+ body\.overallMass/.test(geo)) throw new Error('massScale formula changed');
// overallMass = 0 -> massScale = 1 -> the mass transform is identity.
const massScale = 1;

// Transform order copied from character-silhouette.tsx (asserted, not guessed).
const proportionSrc = 'const bodyProportionTransform = `translate(0 ${seams.neckLeft[1]}) scale(1 ${stage0BodyProportion.scaleY}) translate(0 -${seams.neckLeft[1]})`';
const massSrc = 'const bodyTransform = `translate(100 ${seams.neckLeft[1]}) scale(${geometry.massScale}) translate(-100 -${seams.neckLeft[1]})`';
if (!sil.includes(proportionSrc)) throw new Error('bodyProportionTransform changed');
if (!sil.includes(massSrc)) throw new Error('bodyTransform changed');

const bodyProportionTransform = `translate(0 ${neckY}) scale(1 ${scaleY}) translate(0 -${neckY})`;
const bodyTransform = `translate(100 ${neckY}) scale(${massScale}) translate(-100 -${neckY})`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="0 0 ${vbW} ${vbH}">
<g transform="${bodyProportionTransform} ${bodyTransform}" fill="${strokeFill}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
  <path d="${basePaths.torso}"/>
  <path d="${basePaths.armLeft}"/>
  <path d="${basePaths.armRight}"/>
  <path d="${basePaths.legLeft}"/>
  <path d="${basePaths.legRight}"/>
</g>
<g fill="${strokeFill}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
  <path d="${headPath}"/>
</g>
<g fill="${strokeColor}">
  <circle cx="${eyeL}" cy="${eyeY}" r="${eyeR2}"/>
  <circle cx="${eyeR}" cy="${eyeY}" r="${eyeR2}"/>
</g>
<path d="${mouth}" fill="none" stroke="${strokeColor}" stroke-width="${mouthW}" stroke-linecap="round"/>
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log('OK', OUT, svg.length, 'bytes; neckY=' + neckY, 'scaleY=' + scaleY, 'massScale=' + massScale);
