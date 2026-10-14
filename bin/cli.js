#!/usr/bin/env node
import { run } from '../src/cli.js';

try {
  await run(process.argv.slice(2));
} catch (error) {
  console.error(`TechTalks Skills: ${error.message}`);
  process.exitCode = 1;
}
