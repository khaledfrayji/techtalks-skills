import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const invoke = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('help and version exit successfully', () => {
  assert.match(invoke('--help').stdout, /Usage:/);
  assert.equal(invoke('--version').status, 0);
});
test('list produces machine-readable catalog', () => {
  const result = invoke('list', '--json');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).skills.length, 10);
});
test('invalid command, option and missing values fail', () => {
  for (const args of [['wat'], ['--force'], ['init', '--cwd'], ['init', '--skills', 'nope']]) assert.equal(invoke(...args).status, 1);
});
test('CLI installs, updates and removes selected skills in a path with spaces', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'techtalks project '));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(invoke('update', '--cwd', root).status, 1);
  assert.equal(JSON.parse(invoke('init', '--cwd', root, '--skills', 'scope', '--json').stdout).changes.length, 6);
  assert.equal(invoke('doctor', '--cwd', root).status, 0);
  assert.equal(JSON.parse(invoke('update', '--cwd', root, '--json').stdout).changes.length, 0);
  assert.equal(JSON.parse(invoke('remove', '--cwd', root, '--json').stdout).changes.length, 6);
});
