import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { packageRoot, skillNames } from '../src/catalog.js';

let contract;
for (const name of skillNames) {
  const folder = path.join(packageRoot, 'skills', name);
  const text = await readFile(path.join(folder, 'SKILL.md'), 'utf8');
  assert.match(text, new RegExp(`^---\\nname: ${name}\\ndescription: ".+"\\n---\\n`));
  assert.ok(text.length < 20000, `Skill too long: ${name}`);
  assert.ok(!text.includes('[TODO'), `Placeholder in ${name}`);
  assert.match(text, /references\/project-contract\.md/);
  const reference = await readFile(path.join(folder, 'references/project-contract.md'), 'utf8');
  if (contract === undefined) contract = reference;
  else assert.equal(reference, contract, `Shared contract drift: ${name}`);
  const metadata = await readFile(path.join(folder, 'agents/openai.yaml'), 'utf8');
  assert.ok(metadata.includes(`$${name}`), `Metadata mismatch: ${name}`);
}
for (const file of ['bin/cli.js', 'src/catalog.js', 'src/cli.js', 'src/installer.js']) {
  execFileSync(process.execPath, ['--check', path.join(packageRoot, file)]);
}
console.log('All ten skills, references, metadata and JavaScript syntax passed.');
