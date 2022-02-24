#!/usr/bin/env node

import Listr from 'listr';
import { Command } from 'commander/esm.mjs';

import savePage from '../src/pageSaver.js';

const program = new Command();

const isAxiosError = (error) => (error.isAxiosError);

const isFileSystemError = (error) => (error.code !== undefined);

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
    ENOENT: () => {
      console.error(`ERROR:\n\t${error.path} is not exist`);
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
    EROFS: () => {
      console.error(`ERROR:\n\t${error.path} read only (system files and directories)`);
      process.exit(1);
    },
    default: () => {
      console.error('Undefined error');
      process.exit(1);
    },
  };
  if (isAxiosError(error) && !error.response) {
    console.error('Axios error');
    process.exit(1);
  }
  if (isAxiosError(error)) {
    return mapping[error.response.status]();
  }
  if (isFileSystemError(error)) {
    return mapping[error.code]();
  }
  return mapping.default();
};

program
  .description('Page loader utility')
  .option('-V, --version', 'output the version number')
  .option('-o --output [dir]', 'output dir (default: "/home/user/current-dir', process.cwd())
  .arguments('<url>')

  .action((url) => {
    const options = program.opts();
    const { output } = options;

    savePage(url, output)
      .then(({ htmlFilepath, tasksListForListr }) => {
        const tasks = new Listr(tasksListForListr, { concurrent: true });
        tasks.run().then(() => {
          console.log(`Page was successfully downloaded into ${htmlFilepath}`);
        });
      })
      .catch((error) => {
        errorHandler(error);
      });
  });

program.parse(process.argv);
