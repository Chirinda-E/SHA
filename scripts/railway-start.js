import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const candidates = [
  path.resolve('hosting', 'src', 'index.js'),
  path.resolve('src', 'index.js'),
];
const entry = candidates.find((file) => existsSync(file));
if (!entry) {
  console.error('Cannot find hosting/src/index.js or src/index.js');
  process.exit(1);
}
console.log('Starting', entry);
const child = spawn(process.execPath, [entry], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
