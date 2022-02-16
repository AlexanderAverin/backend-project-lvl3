#!/usr/bin/env node

import Listr from 'listr';
import { Command } from 'commander/esm.mjs';

import path from 'path';
import savePage from '../src/pageSaver.js';

const program = new Command();

const isAxiosError = (error) => (error.response !== undefined);

const isFileSystemError = (error) => (error.code !== undefined);

const isAbsoluteDirpath = (dirpath) => dirpath.startsWith(process.cwd());

const errorHandler = (error) => {
  const mapping = {
    404: () => {
      console.error(`ERROR:\n\t${error.config.url} not found (error 404)`);
      process.exit(1);
    },
    500: () => {
      console.error(`ERROR:\n\t${error.config.url} internal server error`);
      process.exit(1);
    },
    EEXIST: () => {
      console.error(`ERROR:\n\t${error.path} directory has already exist`);
      process.exit(1);
    },

    EPERM: () => {
      console.error(`ERROR:\n\t${error.path} operation not permised`);
      process.exit(1);
    },
  };
  if (isAxiosError(error)) {
    return mapping[error.response.status]();
  }
  if (isFileSystemError(error)) {
    return mapping[error.code]();
  }
  throw error;
};

program
  .description('Page loader utility')
  .option('-V, --version', 'output the version number')
  .option('-o --output [dir]', 'output dir (default: "/home/user/current-dir', process.cwd())
  .arguments('<url>')

  .action((url) => {
    const options = program.opts();

    const { output } = options;
    const dirpath = isAbsoluteDirpath(output) ? output : path.join(process.cwd(), output);

    savePage(url, dirpath).catch((error) => {
      errorHandler(error);
    })
      .then(([htmlFilepath, tasksListForListr]) => {
        const tasks = new Listr(tasksListForListr, { concurrent: true });
        tasks.run().then(() => {
          console.log(`Page was successfully downloaded into ${htmlFilepath}`);
        });
      });
  });

program.parse(process.argv);
