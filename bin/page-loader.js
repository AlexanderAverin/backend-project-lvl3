#!/usr/bin/env node

import Listr from 'listr';
import { Command } from 'commander/esm.mjs';

import savePage from '../src/pageSaver.js';

const program = new Command();

const isAxiosError = (error) => (error.config !== undefined);

const isFileSystemError = (error) => (error.code !== undefined);

const errorHandler = (error) => {
  const mapping = {
    404: () => {
      console.error(`ERROR\n${error.config.url} not found (error 404)`);
      process.exit(1);
    },
    500: () => {
      console.error(`ERROR\n${error.config.url} internal server error`);
      process.exit(1);
    },
    EEXIST: () => {
      console.error(`ERROR\n${error.path} directory has already exist`);
      process.exit(1);
    },
  };
  let errorCode;
  if (isAxiosError(error)) {
    errorCode = error.response.status;
  } else if (isFileSystemError(error)) {
    errorCode = error.code;
  }

  mapping[errorCode]();
};

program
  .description('Page loader utility')
  .option('-V, --version', 'output the version number')
  .option('-o --output [dir]', 'output dir (default: "/home/user/current-dir', process.cwd())
  .arguments('<url>')

  .action((url) => {
    const options = program.opts();

    const { output } = options;

    savePage(url, output).catch((error) => {
      errorHandler(error);
    })
      .then(([htmlFilepath, tasksList]) => {
        new Listr(tasksList, { concurrent: true }).run();
        console.log(`Page was successfully downloaded into ${htmlFilepath}`);
      });
  });

program.parse(process.argv);
