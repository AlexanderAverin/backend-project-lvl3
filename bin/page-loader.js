#!/usr/bin/env node

import { Command } from 'commander/esm.mjs';

import savePage from '../src/savePage.js';

const program = new Command();

program
  .description('Page loader utility')
  .option('-V, --version', 'output the version number')
  .option('-o --output [dir]', 'output dir (default: "/home/user/current-dir', process.cwd())
  .arguments('<url>')

  .action((url) => {
    const options = program.opts();

    const { output } = options;

    savePage(output, url).then(console.log);
  });

program.parse(process.argv);