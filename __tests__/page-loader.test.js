import {
  test, expect, beforeEach,
  // jest,
} from '@jest/globals';

import os from 'os';
import fs from 'fs/promises';
import nock from 'nock';
import path from 'path';

import htmlData from '../__fixtures__/htmlData.js';

import savePage from '../src/savePage.js';

import load from '../src/loader.js';

// const getFixturesFilepath = (filename) => path
// .join('__fixtures__', filename);

const nockedUrl = (url, response, data = '/') => {
  nock(url)
    .get(data)
    .reply(200, response);
};

nock.disableNetConnect();

let dirpath;
// let mock;

beforeEach(async () => {
  dirpath = await fs
    .mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  // mock = jest.fn();
});

test('Test load fucntion', async () => {
  const url = 'https://ru.hexlet.io';
  nockedUrl(url, 'data', '/');

  const data = await load(url);
  expect(data).not.toBe(undefined);
  expect(data).not.toBe(null);
});

test('Test savePage function', async () => {
  const response = htmlData.trim();
  const url = 'https://ru.hexlet.io';
  nockedUrl(url, response, '/');

  const filepath = await savePage(dirpath, url);
  const result = await fs.readFile(filepath, 'utf8');

  expect(result).toEqual(response);
});
