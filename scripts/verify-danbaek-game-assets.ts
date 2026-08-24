Object.defineProperty(globalThis, 'require', {
  configurable: true,
  value: (path: string) => ({ uri: `verified-static:${path}` }),
});

const {
  DanbaekGameAssetManifest,
  DanbaekGameAssetSlots,
  HomeGameAssetSlots,
  ResultGameAssetSlots,
  resolveDanbaekGameAsset,
  SessionGameAssetSlots,
} = await import('@/config/danbaek-game-assets');

let failures = 0;
function expect(name: string, condition: boolean, detail?: unknown) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
  if (!condition) { failures++; if (detail !== undefined) console.log('  detail:', detail); }
}

const entries = DanbaekGameAssetManifest.assets;
const slots = entries.map((entry) => entry.slot);

expect('manifest is bound to CANON v3', DanbaekGameAssetManifest.canonVersion === 3);
expect('every required slot exists exactly once',
  JSON.stringify([...slots].sort()) === JSON.stringify([...DanbaekGameAssetSlots].sort()), slots);
expect('asset ids and filenames are deterministic', entries.every((entry) =>
  entry.id === `danbaek.game.${entry.slot}.v1` &&
  entry.filename === `danbaek-game-${entry.slot.replace('_', '-')}-v1.png`
));
expect('dimensions are positive and match the fixed coordinate space', entries.every((entry) =>
  entry.dimensions.width === DanbaekGameAssetManifest.coordinateSpace.width &&
  entry.dimensions.height === DanbaekGameAssetManifest.coordinateSpace.height
));
expect('anchors and pivots are normalized', entries.every((entry) =>
  [entry.anchor.x, entry.anchor.y, entry.pivot.x, entry.pivot.y].every((value) => value >= 0 && value <= 1)
));
expect('bounding boxes stay inside the declared canvas', entries.every((entry) =>
  entry.boundingBox.x >= 0 && entry.boundingBox.y >= 0 &&
  entry.boundingBox.x + entry.boundingBox.width <= entry.dimensions.width &&
  entry.boundingBox.y + entry.boundingBox.height <= entry.dimensions.height
));
expect('every slot has explicit CANON renderer fallback', entries.every((entry) => entry.fallback === 'canon_parametric_v3'));
expect('all approved assets resolve from the static source registry', entries.every((entry) =>
  entry.approval === 'approved' && resolveDanbaekGameAsset(entry.slot, { hasBodyParameters: false })?.descriptor.id === entry.id
));
expect('BodyParameters always preserve the parametric renderer', entries.every((entry) =>
  resolveDanbaekGameAsset(entry.slot, { hasBodyParameters: true }) === undefined
));
expect('SESSION presentation policy may use approved assets without changing BodyParameters', entries.every((entry) =>
  resolveDanbaekGameAsset(entry.slot, { hasBodyParameters: true, allowBodyParametersAsset: true })?.descriptor.id === entry.id
));
expect('session states map only to declared slots', Object.values(SessionGameAssetSlots)
  .every((slot) => DanbaekGameAssetSlots.includes(slot)));
expect('HOME owns only idle and happy', JSON.stringify(HomeGameAssetSlots) === JSON.stringify(['idle', 'happy']));
expect('RESULT owns before, pump, after, and celebration',
  JSON.stringify(ResultGameAssetSlots) === JSON.stringify(['before', 'pump', 'after', 'celebration']));

console.log(failures === 0 ? '\nAll DANBAEK GAME ASSET checks passed.' : `\n${failures} DANBAEK GAME ASSET check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
