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

test('Test that function return html filepath', async () => {
  const { htmlFilepath } = await savePage('https://ru.hexlet.io/courses', dirpath);
  expect(htmlFilepath).toEqual(path.join(dirpath, 'ru-hexlet-io-courses.html'));
});

test('Test that function create directory with page resourses', async () => {
  await savePage('https://ru.hexlet.io/courses', dirpath);
  const directoryList = fs.readdir(dirpath);
  expect((await directoryList).includes('ru-hexlet-io-courses_files')).toBe(true);
});

test('Test that function change html file', async () => {
  const pageAfter = await getFixturesFile('pageAfter.html');
  const { htmlFilepath } = await savePage('https://ru.hexlet.io/courses', dirpath);
  const changedHtmlFile = await fs.readFile(htmlFilepath, 'utf8');

  expect(changedHtmlFile).toEqual(pageAfter);
});

// Errors thowing tests

test('Test that function throws file system error (EEXIST)', async () => {
  await savePage('https://ru.hexlet.io/courses', dirpath);
  try {
    await savePage('https://ru.hexlet.io/courses', dirpath);
  } catch (error) {
    expect(error.code).toEqual('EEXIST');
  }
});

test('Test that function throw 404 axios error', async () => {
  nock('https://ru.example404.io')
    .get(/.*/)
    .reply(404, null);

  try {
    await savePage('https://ru.example404.io', dirpath);
  } catch (error) {
    expect(error.response.status).toEqual(404);
  }
});

test('Test that function throw 500 axios error', async () => {
  nock('https://ru.example500.io')
    .get(/.*/)
    .reply(500, null);

  try {
    await savePage('https://ru.example500.io', dirpath);
  } catch (error) {
    expect(error.response.status).toEqual(500);
  }
});
