import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { packageRoot } from '../src/catalog.js';

async function checkout(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'techtalks-validation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const entry of ['package.json', 'scripts', 'src', 'bin', 'skills']) {
    await cp(path.join(packageRoot, entry), path.join(root, entry), { recursive: true });
  }
  return root;
}

async function convertDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await convertDirectory(file);
    else {
      const content = await readFile(file, 'utf8');
      await writeFile(file, content.replace(/\r?\n/g, '\r\n'));
    }
  }
}

const check = root => spawnSync(process.execPath, ['scripts/check.js'], { cwd: root, encoding: 'utf8' });

test('release validation accepts a full CRLF checkout', async t => {
  const root = await checkout(t);
  await convertDirectory(root);
  const result = check(root);
  assert.equal(result.status, 0, result.stderr);
});

test('release validation accepts mixed endings in equivalent shared references', async t => {
  const root = await checkout(t);
  const file = path.join(root, 'skills/scope/references/project-contract.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace(/\r?\n/g, '\r\n'));
  const result = check(root);
  assert.equal(result.status, 0, result.stderr);
});

test('CRLF normalization still rejects invalid skill metadata', async t => {
  const root = await checkout(t);
  await convertDirectory(root);
  const file = path.join(root, 'skills/scope/SKILL.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace('name: scope', 'name: wrong'));
  assert.equal(check(root).status, 1);
});
