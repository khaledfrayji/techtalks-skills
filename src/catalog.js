import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const skillNames = Object.freeze([
  'scope', 'architect', 'develop', 'audit', 'sync',
  'verify', 'test', 'review', 'document', 'debug',
]);
export const targets = Object.freeze(['.agents/skills', '.claude/skills']);
export const version = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')).version;

export async function catalog(names = skillNames) {
  const files = new Map();
  for (const name of names) {
    if (!skillNames.includes(name)) throw new Error(`Unknown skill: ${name}`);
    const directory = path.join(packageRoot, 'skills', name);
    async function walk(dir, relative = '') {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const rel = path.posix.join(relative, entry.name);
        if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel);
        else if (entry.isFile()) {
          const content = await readFile(path.join(dir, entry.name));
          for (const target of targets) files.set(`${target}/${name}/${rel}`, content);
        } else throw new Error(`Unsupported packaged file: ${rel}`);
      }
    }
    await walk(directory);
  }
  return files;
}
