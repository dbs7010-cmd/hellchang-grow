// Static regression guard for the LOCKED Danbaek player identity.
// This deliberately checks source boundaries as well as geometry: a correct renderer is useless
// if a screen can bypass it with a legacy PNG.
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
const registry = read('src/config/character-assets.ts');

expect('PlayerCharacter always uses CharacterSilhouette', player.includes('<CharacterSilhouette'));
expect('PlayerCharacter has no image runtime', !player.includes("from 'expo-image'") && !player.includes('<Image'));
expect('player registry cannot resolve a runtime image', /resolveCharacterAsset[\s\S]*return undefined;/.test(registry));
expect('legacy player_main.png is not registered', !registry.includes('player_main.png'));
expect('CANON reference PNGs are not registered', !registry.includes('reference_v3'));

const runtimeFiles = [
  ...walk('src/app'),
  ...walk('src/components'),
  ...walk('src/config'),
].filter((file) => /\.(ts|tsx)$/.test(file));

const forbiddenAssetRefs = runtimeFiles.filter((file) => {
  const source = read(file);
  return /assets\/characters\/(?:player|danbaek\/canon\/reference_v3)/.test(source);
});
expect('no app/component/config runtime imports legacy or CANON reference player images', forbiddenAssetRefs.length === 0, forbiddenAssetRefs);

const directSilhouetteUsers = runtimeFiles.filter((file) => {
  if (file.endsWith('player-character.tsx') || file.endsWith('character-viewer.tsx')) return false;
  return read(file).includes("character-silhouette");
});
expect('screens cannot bypass PlayerCharacter with CharacterSilhouette', directSilhouetteUsers.length === 0, directSilhouetteUsers);

console.log(failures === 0 ? '\nAll DANBAEK RUNTIME ROUTING checks passed.' : `\n${failures} DANBAEK RUNTIME ROUTING check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
