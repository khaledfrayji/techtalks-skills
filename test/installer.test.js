import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { writeFileSync } from 'node:fs';
import { channel } from 'node:diagnostics_channel';
import path from 'node:path';
import { install, status, hash } from '../src/installer.js';
import { catalog, targets } from '../src/catalog.js';

async function project(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'techtalks-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const scopeFile = '.agents/skills/scope/SKILL.md';

test('one install places identical portable skills in both discovery roots', async t => {
  const root = await project(t);
  const result = await install(root);
  assert.equal(result.changes.length, 60);
  const expected = await catalog();
  for (const [file, content] of expected) assert.deepEqual(await readFile(path.join(root, file)), content);
  assert.equal((await status(root)).files.filter(f => f.status === 'installed').length, 60);
  assert.deepEqual(await readFile(path.join(root, scopeFile)), await readFile(path.join(root, '.claude/skills/scope/SKILL.md')));
});

test('reinstallation is idempotent', async t => {
  const root = await project(t);
  await install(root);
  assert.equal((await install(root)).changes.length, 0);
});

test('dry-run writes nothing', async t => {
  const root = await project(t);
  assert.equal((await install(root, { dryRun: true })).changes.length, 60);
  await assert.rejects(readFile(path.join(root, '.techtalks-skills/manifest.json')), { code: 'ENOENT' });
});

test('untracked conflicts stop the whole installation without overwriting', async t => {
  const root = await project(t);
  await mkdir(path.dirname(path.join(root, scopeFile)), { recursive: true });
  await writeFile(path.join(root, scopeFile), 'user workflow');
  await assert.rejects(install(root), /conflicts/);
  assert.equal(await readFile(path.join(root, scopeFile), 'utf8'), 'user workflow');
  await assert.rejects(readFile(path.join(root, '.claude/skills/architect/SKILL.md')), { code: 'ENOENT' });
});

test('identical untracked files are not adopted', async t => {
  const root = await project(t);
  await mkdir(path.dirname(path.join(root, scopeFile)), { recursive: true });
  await writeFile(path.join(root, scopeFile), (await catalog(['scope'])).get(scopeFile));
  await assert.rejects(install(root), /conflicts/);
});

test('edited managed files are preserved on update and remove', async t => {
  const root = await project(t);
  await install(root);
  await writeFile(path.join(root, scopeFile), 'my customization');
  assert.equal((await status(root)).files.find(f => f.file === scopeFile).status, 'modified');
  await assert.rejects(install(root), /modified files/);
  await assert.rejects(install(root, { remove: true }), /modified files/);
  assert.equal(await readFile(path.join(root, scopeFile), 'utf8'), 'my customization');
});

test('update replaces unmodified older managed content', async t => {
  const root = await project(t);
  await install(root, { names: ['scope'] });
  const manifestFile = path.join(root, '.techtalks-skills/manifest.json');
  const state = JSON.parse(await readFile(manifestFile, 'utf8'));
  await writeFile(path.join(root, scopeFile), 'previous release');
  state.files[scopeFile] = hash('previous release');
  await writeFile(manifestFile, JSON.stringify(state));
  assert.equal((await install(root, { names: ['scope'] })).changes.length, 1);
  assert.deepEqual(await readFile(path.join(root, scopeFile)), (await catalog(['scope'])).get(scopeFile));
});

test('missing managed files can be repaired', async t => {
  const root = await project(t);
  await install(root);
  await rm(path.join(root, scopeFile));
  assert.equal((await status(root)).files.find(f => f.file === scopeFile).status, 'missing');
  assert.equal((await install(root)).changes.length, 1);
});

test('remove only deletes managed files and preserves unrelated resources', async t => {
  const root = await project(t);
  await install(root);
  const custom = path.join(root, '.agents/skills/scope/custom.md');
  await writeFile(custom, 'keep me');
  assert.equal((await install(root, { remove: true })).changes.length, 60);
  assert.equal((await status(root)).files.length, 0);
  assert.equal(await readFile(custom, 'utf8'), 'keep me');
});

test('selected install and removal preserve other managed skills', async t => {
  const root = await project(t);
  await install(root, { names: ['scope', 'debug'] });
  assert.equal((await status(root)).files.length, 12);
  await install(root, { names: ['scope'], remove: true });
  assert.equal((await status(root)).files.length, 6);
});

test('malformed manifest fails closed', async t => {
  const root = await project(t);
  await mkdir(path.join(root, '.techtalks-skills'));
  await writeFile(path.join(root, '.techtalks-skills/manifest.json'), '{');
  await assert.rejects(install(root), /Invalid installation manifest/);
});

test('manifest cannot manage paths outside known skill directories', async t => {
  const root = await project(t);
  await mkdir(path.join(root, '.techtalks-skills'));
  await writeFile(path.join(root, '.techtalks-skills/manifest.json'), JSON.stringify({ schemaVersion: 1, package: 'techtalks-skills', files: { '../outside': hash('x') } }));
  await assert.rejects(install(root, { remove: true }), /Invalid installation manifest/);
});

test('linked destination directories are rejected, including Windows junctions', async t => {
  const root = await project(t);
  const outside = await project(t);
  await symlink(outside, path.join(root, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(install(root), /symbolic link/);
});

test('symbolic-link destination files are rejected when the OS permits creating them', async t => {
  const root = await project(t);
  const outside = await project(t);
  await mkdir(path.dirname(path.join(root, scopeFile)), { recursive: true });
  await writeFile(path.join(outside, 'target'), 'untouched');
  try {
    await symlink(path.join(outside, 'target'), path.join(root, scopeFile), 'file');
  } catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) {
      t.skip('Windows requires Developer Mode or elevated privileges to create a file symlink. Directory junction protection is still tested.');
      return;
    }
    throw error;
  }
  await assert.rejects(install(root), /symbolic link/);
  assert.equal(await readFile(path.join(outside, 'target'), 'utf8'), 'untouched');
});

test('a lock prevents overlapping mutation', async t => {
  const root = await project(t);
  await mkdir(path.join(root, '.techtalks-skills'));
  await writeFile(path.join(root, '.techtalks-skills/install.lock'), 'other');
  await assert.rejects(install(root), /Another installation/);
});

test('unknown skill selection fails before writes', async t => {
  const root = await project(t);
  await assert.rejects(install(root, { names: ['../../bad'] }), /Unknown skill/);
});

test('a failed write rolls back prior files and preserves an existing temporary file', async t => {
  const root = await project(t);
  const file = path.join(root, '.claude/skills/scope/SKILL.md');
  await mkdir(path.dirname(file), { recursive: true });
  const existing = `${file}.${process.pid}.tmp`;
  await writeFile(existing, 'user temporary file');
  await assert.rejects(install(root, { names: ['scope'] }), { code: 'EEXIST' });
  await assert.rejects(readFile(path.join(root, scopeFile)), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(root, '.techtalks-skills/manifest.json')), { code: 'ENOENT' });
  assert.equal(await readFile(existing, 'utf8'), 'user temporary file');
});

test('retired resources are removed only while unmodified', async t => {
  const root = await project(t);
  await install(root);
  const old = `${targets[0]}/scope/retired.md`;
  await writeFile(path.join(root, old), 'retired');
  const mf = path.join(root, '.techtalks-skills/manifest.json');
  const state = JSON.parse(await readFile(mf, 'utf8'));
  state.files[old] = hash('retired');
  await writeFile(mf, JSON.stringify(state));
  assert.equal((await install(root)).changes.find(f => f.file === old).action, 'remove');
  await assert.rejects(readFile(path.join(root, old)), { code: 'ENOENT' });
});

test('an edit after preflight is preserved and previous writes are rolled back', async t => {
  const root = await project(t);
  await install(root, { names: ['scope'] });
  const mf = path.join(root, '.techtalks-skills/manifest.json');
  const state = JSON.parse(await readFile(mf, 'utf8'));
  for (const file of Object.keys(state.files)) {
    await writeFile(path.join(root, file), 'older release');
    state.files[file] = hash('older release');
  }
  await writeFile(mf, JSON.stringify(state));
  const target = path.join(root, '.claude/skills/scope/references/project-contract.md');
  let edited = false;
  const events = channel('techtalks-skills:mutation');
  const observer = event => {
    if (event.root === root && event.phase === 'after' && event.file === scopeFile && !edited) {
      edited = true;
      writeFileSync(target, 'concurrent developer edit');
    }
  };
  events.subscribe(observer);
  t.after(() => events.unsubscribe(observer));
  await assert.rejects(install(root, { names: ['scope'] }), /File changed during installation/);
  assert.equal(edited, true);
  assert.equal(await readFile(target, 'utf8'), 'concurrent developer edit');
  assert.equal(await readFile(path.join(root, scopeFile), 'utf8'), 'older release');
});

test('a file created after preflight is not replaced', async t => {
  const root = await project(t);
  const events = channel('techtalks-skills:mutation');
  const observer = event => {
    if (event.root === root && event.phase === 'before' && event.file === scopeFile) {
      writeFileSync(path.join(root, scopeFile), 'new developer file');
    }
  };
  // The parent must exist for the simulated editor to create its file.
  await mkdir(path.dirname(path.join(root, scopeFile)), { recursive: true });
  events.subscribe(observer);
  t.after(() => events.unsubscribe(observer));
  await assert.rejects(install(root, { names: ['scope'] }), /File changed during installation/);
  assert.equal(await readFile(path.join(root, scopeFile), 'utf8'), 'new developer file');
});

test('rollback preserves edits to a file already written by the installer', async t => {
  const root = await project(t);
  const second = '.claude/skills/scope/SKILL.md';
  await mkdir(path.dirname(path.join(root, second)), { recursive: true });
  const events = channel('techtalks-skills:mutation');
  const observer = event => {
    if (event.root === root && event.phase === 'after' && event.file === scopeFile) {
      writeFileSync(path.join(root, scopeFile), 'edit after installer write');
      writeFileSync(path.join(root, second), 'new conflicting file');
    }
  };
  events.subscribe(observer);
  t.after(() => events.unsubscribe(observer));
  await assert.rejects(install(root, { names: ['scope'] }), /Rollback incomplete/);
  assert.equal(await readFile(path.join(root, scopeFile), 'utf8'), 'edit after installer write');
  assert.equal(await readFile(path.join(root, second), 'utf8'), 'new conflicting file');
});
