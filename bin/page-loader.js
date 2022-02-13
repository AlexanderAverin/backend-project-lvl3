#!/usr/bin/env node

import { Command } from 'commander/esm.mjs';

import savePage from '../src/pageSaver.js';

const program = new Command();

program
  .description('Page loader utility')
  .option('-V, --version', 'output the version number')
  .option('-o --output [dir]', 'output dir (default: "/home/user/current-dir', process.cwd())
  .arguments('<url>')

  .action((url) => {
    const options = program.opts();

    const { output } = options;

    savePage(url, output).catch((err) => {
      // Axios error handlers
      if (err.response) {
        if (err.response.status === 404) {
          console.error(`ERROR\n ${err.config.url} not found (error 404)`);
          process.exit();
        }
        if (err.response.status === 500) {
          console.error(`ERROR\n ${err.config.url} internal server error`);
          process.exit();
        }
      }
      // Fs errors handlers
      if (err) {
        if (err.code === 'EEXIST') {
          console.error(`ERROR\n ${err.path} directory has already exist`);
          process.exit();
        }
      }
    }).then(console.log);
  });

program.parse(process.argv);
