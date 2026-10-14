import { createHash } from 'node:crypto';
import { channel } from 'node:diagnostics_channel';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { catalog, skillNames, targets, version } from './catalog.js';

const stateDirectory = '.techtalks-skills';
const manifestName = `${stateDirectory}/manifest.json`;
const lockName = `${stateDirectory}/install.lock`;
const mutationEvents = channel('techtalks-skills:mutation');
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function info(file) {
  try { return await lstat(file); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

// Never traverse links in destinations, including intermediate directories.
async function safePath(root, relative) {
  if (path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(p => !p || p === '.' || p === '..')) {
    throw new Error(`Invalid managed path: ${relative}`);
  }
  const parts = relative.split('/');
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const stat = await info(current);
    if (stat?.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${relative}`);
    if (stat && i < parts.length - 1 && !stat.isDirectory()) throw new Error(`Expected directory: ${relative}`);
    if (stat && i === parts.length - 1 && !stat.isFile()) throw new Error(`Expected regular file: ${relative}`);
  }
  return current;
}

async function bytes(root, relative) {
  const file = await safePath(root, relative);
  try { return await readFile(file); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

function validManagedPath(p) {
  return targets.some(t => p.startsWith(`${t}/`)) &&
    skillNames.includes(p.split('/')[2]) &&
    !p.split('/').some(part => !part || part === '.' || part === '..') && !p.includes('\\');
}

async function manifest(root) {
  const raw = await bytes(root, manifestName);
  if (!raw) return { schemaVersion: 1, package: 'techtalks-skills', version, files: {} };
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Invalid installation manifest. Restore it before making changes.'); }
  if (data.schemaVersion !== 1 || data.package !== 'techtalks-skills' ||
      !data.files || typeof data.files !== 'object' || Array.isArray(data.files) ||
      Object.entries(data.files).some(([p, digest]) => !validManagedPath(p) || !/^[a-f0-9]{64}$/.test(digest))) {
    throw new Error('Invalid installation manifest. No files were changed.');
  }
  return data;
}

async function assertCurrent(root, relative, expected) {
  const current = await bytes(root, relative);
  if (current === null ? expected !== null : expected === null || !current.equals(expected)) {
    throw new Error(`File changed during installation; preserved concurrent work: ${relative}`);
  }
}

async function atomicWrite(root, relative, content, expected) {
  const file = await safePath(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  let created = false;
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    created = true;
    if (expected !== undefined) await assertCurrent(root, relative, expected);
    await rename(temporary, file);
  } finally { if (created) await rm(temporary, { force: true }); }
}

export async function status(root) {
  const state = await manifest(root);
  const results = [];
  for (const [file, digest] of Object.entries(state.files)) {
    const current = await bytes(root, file);
    results.push({ file, status: !current ? 'missing' : hash(current) === digest ? 'installed' : 'modified' });
  }
  return { version: state.version, files: results };
}

export async function install(root, { names = skillNames, dryRun = false, remove = false } = {}) {
  root = path.resolve(root);
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Project must be a regular directory.');
  for (const name of names) if (!skillNames.includes(name)) throw new Error(`Unknown skill: ${name}`);
  if (dryRun) return transact(root, { names, dryRun, remove });
  const lock = await safePath(root, lockName);
  await mkdir(path.dirname(lock), { recursive: true });
  try { await writeFile(lock, `${process.pid}\n`, { flag: 'wx' }); }
  catch (e) {
    if (e.code === 'EEXIST') throw new Error('Another installation may be running. If it stopped, remove .techtalks-skills/install.lock and retry.');
    throw e;
  }
  try { return await transact(root, { names, dryRun, remove }); }
  finally { await rm(lock, { force: true }); }
}

async function transact(root, { names, dryRun, remove }) {
  const state = await manifest(root);
  const planned = [];
  const conflicts = [];
  const next = { ...state, version, files: { ...state.files } };
  const wanted = await catalog(names);
  if (remove) {
    for (const [file, digest] of Object.entries(state.files)) {
      if (!names.includes(file.split('/')[2])) continue;
      const previous = await bytes(root, file);
      if (previous && hash(previous) !== digest) conflicts.push(file);
      else {
        if (previous) planned.push({ file, action: 'remove', previous });
        delete next.files[file];
      }
    }
  } else {
    for (const [file, content] of wanted) {
      const previous = await bytes(root, file);
      const owned = state.files[file];
      // Even identical untracked files belong to the user, not the installer.
      if (previous && (!owned || hash(previous) !== owned)) { conflicts.push(file); continue; }
      next.files[file] = hash(content);
      if (!previous || !previous.equals(content)) planned.push({ file, action: 'write', content, previous });
    }
    // Remove resources retired in a new release only if still unmodified.
    for (const [file, digest] of Object.entries(state.files)) {
      if (!names.includes(file.split('/')[2]) || wanted.has(file)) continue;
      const previous = await bytes(root, file);
      if (previous && hash(previous) !== digest) conflicts.push(file);
      else {
        if (previous) planned.push({ file, action: 'remove', previous });
        delete next.files[file];
      }
    }
  }
  if (conflicts.length) throw new Error(`Existing or modified files were preserved. Resolve these conflicts and retry:\n${conflicts.map(f => `  ${f}`).join('\n')}`);
  if (dryRun) return { changes: planned.map(({ file, action }) => ({ file, action })), dryRun: true };
  const oldManifest = await bytes(root, manifestName);
  const completed = [];
  try {
    for (const item of planned) {
      mutationEvents.publish({ phase: 'before', root, file: item.file, action: item.action });
      if (item.action === 'remove') {
        await assertCurrent(root, item.file, item.previous);
        await rm(await safePath(root, item.file));
      } else await atomicWrite(root, item.file, item.content, item.previous);
      completed.push(item);
      mutationEvents.publish({ phase: 'after', root, file: item.file, action: item.action });
    }
    await atomicWrite(root, manifestName, `${JSON.stringify(next, null, 2)}\n`, oldManifest);
  } catch (error) {
    const failures = [];
    for (const item of completed.reverse()) {
      try {
        mutationEvents.publish({ phase: 'rollback', root, file: item.file, action: item.action });
        const written = item.action === 'remove' ? null : item.content;
        if (item.previous) await atomicWrite(root, item.file, item.previous, written);
        else {
          await assertCurrent(root, item.file, written);
          await rm(await safePath(root, item.file), { force: true });
        }
      } catch (rollbackError) { failures.push(`${item.file}: ${rollbackError.message}`); }
    }
    // Manifest replacement is the final operation; if it fails, preserve any
    // independently edited manifest rather than restoring over concurrent work.
    if (failures.length) throw new Error(`${error.message}\nRollback incomplete: ${failures.join('; ')}`);
    throw error;
  }
  return { changes: planned.map(({ file, action }) => ({ file, action })), dryRun: false };
}
