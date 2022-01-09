import {
  test, expect, beforeEach,
  // jest,
} from '@jest/globals';

import os from 'os';
import fs from 'fs/promises';
import nock from 'nock';
import path from 'path';

import savePage from '../src/savePage.js';

import load from '../src/loader.js';

const getFixturesFile = (filename) => {
  const filepath = path.join('__fixtures__', filename);
  return fs.readFile(filepath, 'utf8');
};

const nockedUrl = (url, response, data = '/') => {
  nock(url)
    .get(data)
    .reply(200, response);
};

nock.disableNetConnect();

let dirpath;
let response;
// let mock;

beforeEach(async () => {
  dirpath = await fs
    .mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  response = await getFixturesFile('data.html');

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
  const url = 'https://ru.hexlet.io';
  nockedUrl(url, response, '/');

  const filepath = await savePage(dirpath, url);
  const result = await fs.readFile(filepath, 'utf8');

  expect(result).toEqual(response);
});
