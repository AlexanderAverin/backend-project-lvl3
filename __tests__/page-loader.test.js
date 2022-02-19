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
});

test('Test that function create html file', async () => {
  const pageBefore = await getFixturesFile('pageBefore.html');
  // nock('https://ru.hexlet.io')
  //   .get('/courses')
  //   .reply(200, pageBefore);

  nock('https://ru.hexlet.io')
    .persist()
    .get(/.*/)
    .reply(200, pageBefore);

  await savePage('https://ru.hexlet.io/courses', dirpath);
  const filesList = await fs.readdir(dirpath);
  logThis('files list', filesList);
  expect(filesList.includes('ru-hexlet-io-courses.html')).toBe(true);
});

test('Test that fuction create directory with page resourses', async () => {
  const pageBefore = await getFixturesFile('pageBefore.html');
  // nock('https://ru.hexlet.io')
  //   .get('/courses')
  //   .reply(200, pageBefore);

  nock('https://ru.hexlet.io')
    .persist()
    .get(/.*/)
    .reply(200, pageBefore);

  await savePage('https://ru.hexlet.io/courses', dirpath);
  const filesList = await fs.readdir(dirpath);
  const dirs = filesList.filter(async (name) => {
    const stat = await fs.stat(path.join(dirpath, name));
    return stat.isDirectory();
  });
  expect(dirs.includes('ru-hexlet-io-courses_files')).toBe(true);
});

test('Test that function save and changes links in .html file', async () => {
  const pageBefore = await getFixturesFile('pageBefore.html');
  // nock('https://ru.hexlet.io')
  //   .get('/courses')
  //   .reply(200, pageBefore);

  nock('https://ru.hexlet.io')
    .persist()
    .get(/.*/)
    .reply(200, pageBefore);

  const [htmlFilepath] = await savePage('https://ru.hexlet.io/courses', dirpath);
  logThis('Html filepath is', htmlFilepath);
  const readenData = await fs.readFile(htmlFilepath, 'utf8');
  const expectedResult = await getFixturesFile('pageAfter.html');

  expect(readenData).toEqual(expectedResult);
});

// Errors handling tests

test('Test that fucntion throw error becouse catch 404 error', async () => {
  // nock('https://ru.hexlet.io')
  //   .get('/courses')
  //   .reply(404, null);

  nock('https://ru.hexlet.io')
    .persist()
    .get(/.*/)
    .reply(404, null);

  try {
    await savePage('https://ru.hexlet.io/courses', dirpath);
  } catch (error) {
    expect(error.response.status).toEqual(404);
  }
});

test('Test that function throw error becouse catch 500 error', async () => {
  // nock('https://ru.hexlet.io')
  //   .get('/courses')
  //   .response(500, null);
  nock('https://ru.hexlet.io')
    .persist()
    .get(/.*/)
    .reply(500, null);

  try {
    await savePage('https://ru.hexlet.io/courses', dirpath);
  } catch (error) {
    expect(error.response.status).toEqual(500);
  }
});

// test('Test that function throw error becouse _files directory has already exist', async () => {
//   nock('https://ru.hexlet.io')
//     .get('/courses')
//     .response(200, null);

//   await savePage('https://ru.hexlet.io/courses', dirpath);
//   try {
//     await savePage('https://ru.hexlet.io/courses', dirpath);
//   } catch (error) {
//     expect(error.code).toEqual('EEXIST');
//   }
// });

// test('Test that function throw error becouse directory not exist', async () => {
//   // nock('https://ru.hexlet.io')
//   //   .get('/courses')
//   //   .response(200, null);

//   nock('https://ru.hexlet.io')
//     .persist()
//     .get(/.*/)
//     .reply(200, '');

//   try {
//     await savePage('https://ru.hexlet.io/courses', 'downloads');
//   } catch (error) {
//     expect(error.code).toEqual('ENOENT');
//   }
// });
