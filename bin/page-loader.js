#!/usr/bin/env node

import Listr from 'listr';
import { Command } from 'commander/esm.mjs';

import savePage from '../src/pageSaver.js';

const program = new Command();

const isAxiosError = (error) => (error.isAxiosError);

const isFileSystemError = (error) => (error.code !== undefined);

const getDefaultError = () => {
  console.error('Undefined error');
  process.exit(1);
};

const errorHandler = (error) => {
  const axiosErrorsMapping = {
    404: () => {
      console.error(`ERROR:\n\t${error.config.url} not found (error 404)`);
      process.exit(1);
    },
    500: () => {
      console.error(`ERROR:\n\t${error.config.url} internal server error`);
      process.exit(1);
    },
    default: () => {
      console.error('Axios error');
      process.exit(1);
    },
  };
  const fsErrorsMapping = {
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
    ENOTDIR: () => {
      console.error(`ERROR:\n\t${error.path} is not a directory`);
      process.exit(1);
    },
    default: () => {
      console.error('Undefined file system error');
      process.exit(1);
    },
  };
  if (isAxiosError(error)) {
    const status = error.response ? error.response.status : 'default';
    return axiosErrorsMapping[status]();
  }
  if (isFileSystemError(error)) {
    return fsErrorsMapping[error.code ?? 'default']();
  }
  return getDefaultError();
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
