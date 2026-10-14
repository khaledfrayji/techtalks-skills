import path from 'node:path';
import { skillNames, version } from './catalog.js';
import { install, status } from './installer.js';

const help = `TechTalks Skills ${version}

Usage: techtalks-skills [init|update|remove|list|doctor] [options]

  init       Install all ten skills for supported agents (default)
  update     Refresh installed skills from this package version
  remove     Remove unmodified files owned by this installer
  list       List the bundled skills
  doctor     Inspect installation integrity

Options:
  --cwd PATH          Use a specific existing project directory
  --skills a,b        Select skills (default: all for init; installed for update)
  --dry-run           Preview changes without writing files
  --json              Print machine-readable results
  --help, -h          Show help
  --version, -v       Show version

No account, model API key, agent selection, or network call is needed to install.
`;

export async function run(args, output = console.log) {
  let command = 'init';
  let cwd = process.cwd();
  let names;
  let dryRun = false;
  let json = false;
  if (args.includes('--help') || args.includes('-h')) return output(help);
  if (args.includes('--version') || args.includes('-v')) return output(version);
  const rest = [...args];
  if (rest.length && !rest[0].startsWith('-')) command = rest.shift();
  if (!['init', 'update', 'remove', 'list', 'doctor'].includes(command)) throw new Error(`Unknown command: ${command}. Run --help.`);
  while (rest.length) {
    const option = rest.shift();
    if (option === '--dry-run') dryRun = true;
    else if (option === '--json') json = true;
    else if (option === '--cwd' || option === '--skills') {
      const value = rest.shift();
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${option}`);
      if (option === '--cwd') cwd = path.resolve(value);
      else {
        names = [...new Set(value.split(',').map(n => n.trim()))];
        if (names.some(n => !skillNames.includes(n))) throw new Error(`Invalid skill selection: ${value}`);
      }
    } else throw new Error(`Unknown option: ${option}. Run --help.`);
  }
  if (command === 'list') return output(json ? JSON.stringify({ skills: skillNames }) : skillNames.join('\n'));
  if (command === 'doctor') {
    const report = await status(cwd);
    output(json ? JSON.stringify(report) : report.files.length ? report.files.map(f => `${f.status}: ${f.file}`).join('\n') : 'No managed skills installed. Run init.');
    if (report.files.some(f => f.status !== 'installed')) process.exitCode = 1;
    return;
  }
  if (command === 'update' && !names) {
    const report = await status(cwd);
    names = [...new Set(report.files.map(f => f.file.split('/')[2]))];
    if (!names.length) throw new Error('No managed skills installed. Run init first.');
  }
  const result = await install(cwd, { names, dryRun, remove: command === 'remove' });
  output(json ? JSON.stringify(result) : `${dryRun ? 'Preview' : 'Complete'}: ${result.changes.length} file changes.\n${result.changes.map(c => `${c.action}: ${c.file}`).join('\n')}`);
  if (!json && command !== 'remove') output('Use the skills in your agent. If they do not appear, reload its session. See README for invocation examples.');
}
