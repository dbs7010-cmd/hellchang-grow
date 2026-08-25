// Static regression guard for the LOCKED Danbaek player identity and cross-screen body continuity.
import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
function expect(name: string, condition: boolean, detail?: unknown) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) {
    failures++;
    if (detail !== undefined) console.log('  detail:', detail);
  }
}

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const walk = (dir: string): string[] =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(relative) : [relative];
  });

const player = read('src/components/character/player-character.tsx');
const viewer = read('src/components/character/character-viewer.tsx');
const registry = read('src/config/character-assets.ts');
const onboarding = read('src/app/(onboarding)/index.tsx');
const home = read('src/app/(tabs)/index.tsx');
const history = read('src/app/(tabs)/history.tsx');
const session = read('src/app/session.tsx');

expect('PlayerCharacter always uses CharacterSilhouette', player.includes('<CharacterSilhouette'));
expect('PlayerCharacter has no image runtime', !player.includes("from 'expo-image'") && !player.includes('<Image'));
expect('PlayerCharacter resolves missing body props from current AppData body', player.includes('currentBodyParameters') && player.includes('bodyOverride ?? currentBodyParameters'));
expect('player registry cannot resolve a runtime image', /resolveCharacterAsset[\s\S]*return undefined;/.test(registry));
expect('legacy player image is not registered', !/require\([^)]*assets\/characters\/player/.test(registry));
expect('CANON reference image is not registered', !/require\([^)]*danbaek\/canon\/reference_v3/.test(registry));

expect('onboarding renders through PlayerCharacter', onboarding.includes('<PlayerCharacter'));
expect('HOME renders through PlayerCharacter', home.includes('<PlayerCharacter'));
expect('HISTORY renders through PlayerCharacter', history.includes('<PlayerCharacter'));
expect('SESSION routes live body through CharacterMotionStage', session.includes('bodyParameters={bodyParameters}'));
expect('RESULT keeps explicit reveal body snapshot', session.includes('bodyParameters={displayedBody}'));
expect('BEFORE/AFTER comparison keeps explicit snapshot', session.includes('bodyParameters={bodyParameters}'));
expect('360 fallback receives current persistent body', viewer.includes('const { bodyParameters } = useAppData()') && viewer.includes('bodyParameters={bodyParameters}'));

const runtimeFiles = [
  ...walk('src/app'),
  ...walk('src/components'),
  ...walk('src/config'),
].filter((file) => /\.(ts|tsx)$/.test(file));

const forbiddenAssetRefs = runtimeFiles.filter((file) => {
  const source = read(file);
  const importOrRequire = /(?:from\s*['\"]|require\(\s*['\"])([^'\"]+)['\"]/g;
  for (const match of source.matchAll(importOrRequire)) {
    const target = match[1] ?? '';
    if (/assets\/characters\/(?:player|danbaek\/canon\/reference_v3)/.test(target)) return true;
  }
  return false;
});
expect('no runtime import/require uses legacy or CANON reference player images', forbiddenAssetRefs.length === 0, forbiddenAssetRefs);

const directSilhouetteUsers = runtimeFiles.filter((file) => {
  if (file.endsWith('player-character.tsx') || file.endsWith('character-viewer.tsx')) return false;
  return read(file).includes("character-silhouette");
});
expect('screens cannot bypass PlayerCharacter with CharacterSilhouette', directSilhouetteUsers.length === 0, directSilhouetteUsers);

console.log(failures === 0 ? '\nAll DANBAEK RUNTIME ROUTING checks passed.' : `\n${failures} DANBAEK RUNTIME ROUTING check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
