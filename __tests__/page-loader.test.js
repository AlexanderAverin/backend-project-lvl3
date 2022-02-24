/* eslint-disable func-names */
import {
  test, expect, beforeEach,
} from '@jest/globals';

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import nock from 'nock';
import debug from 'debug';

import savePage from '../src/pageSaver.js';

const logThis = debug('test');

logThis.color = 270;

class NoErrorThrownError extends Error {}

const getError = async (call) => {
  try {
    await call();

    throw new NoErrorThrownError();
  } catch (error) {
    return error;
  }
};

const getFixturesFile = (filename) => {
  const filepath = path.join('__fixtures__', filename);
  return fs.readFile(filepath, 'utf8');
};

nock.disableNetConnect();

let dirpath;

beforeEach(async () => {
  dirpath = await fs
    .mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  const pageBefore = await getFixturesFile('pageBefore.html');
  nock('https://ru.hexlet.io')
    .persist()
    .get(/.*/)
    .reply(200, pageBefore);
});

test('Testing function return html filepath', async () => {
  const { htmlFilepath } = await savePage('https://ru.hexlet.io/courses', dirpath);
  expect(htmlFilepath).toEqual(path.join(dirpath, 'ru-hexlet-io-courses.html'));
});

test('Testing that function create directory with page resourses', async () => {
  await savePage('https://ru.hexlet.io/courses', dirpath);
  const directoryList = fs.readdir(dirpath);
  expect((await directoryList).includes('ru-hexlet-io-courses_files')).toBe(true);
});

test('Testing that function change html file', async () => {
  const pageAfter = await getFixturesFile('pageAfter.html');
  const { htmlFilepath } = await savePage('https://ru.hexlet.io/courses', dirpath);
  const changedHtmlFile = await fs.readFile(htmlFilepath, 'utf8');

  expect(changedHtmlFile).toEqual(pageAfter);
});

// Errors thowing tests

test('Testing that function throws file system error (EEXIST)', async () => {
  await savePage('https://ru.hexlet.io/courses', dirpath);
  const error = await getError(async () => savePage('https://ru.hexlet.io/courses', dirpath));
  expect(error).toHaveProperty('code', 'EEXIST');
});

test('Testing that function throw 404 axios error', async () => {
  nock('https://ru.example404.io')
    .get(/.*/)
    .reply(404, null);
  const error = await getError(async () => savePage('https://ru.example404.io', dirpath));
  expect(error).toHaveProperty('response.status', 404);
});

test('Testing that function throw 500 axios error', async () => {
  nock('https://ru.example500.io')
    .get(/.*/)
    .reply(500, null);

  const error = await getError(async () => savePage('https://ru.example500.io', dirpath));
  expect(error).toHaveProperty('response.status', 500);
});
