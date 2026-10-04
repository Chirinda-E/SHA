import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(here, '../..');
export const repoRoot = path.resolve(serverRoot, '..');

export function findExisting(...candidates) {
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

export function databaseFile(name) {
  const found = findExisting(
    path.join(serverRoot, 'database', name),
    path.join(repoRoot, 'database', name),
  );
  if (!found) throw new Error(`Cannot find database/${name}.`);
  return found;
}

export function clientDistDir() {
  return findExisting(
    path.join(serverRoot, 'public'),
    path.join(repoRoot, 'client', 'dist'),
    path.join(repoRoot, 'public'),
  );
}
