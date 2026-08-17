// Dev-only module resolution hook so verification scripts under scripts/ can
// import from src/ using the same "@/..." alias the app uses (see tsconfig.json).
// Metro/TypeScript resolve this alias for the actual app; this hook only exists
// so plain `node` can run standalone verification scripts against src/ code.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let target = path.join(root, specifier.slice(2));
    if (!path.extname(target)) target += '.ts';
    return nextResolve(pathToFileURL(target).href, context);
  }
  return nextResolve(specifier, context);
}
