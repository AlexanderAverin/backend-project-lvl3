/* eslint-disable func-names */
import {
  test, expect, beforeEach,
} from '@jest/globals';

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';
import nock from 'nock';

import savePage from '../src/pageSaver.js';

const getFixturesFile = (filename, encoding = 'utf8') => {
  const filepath = path.join('__fixtures__', filename);
  return fs.readFile(filepath, encoding);
};

const nockedUrl = (url, urlPath, response) => {
  nock(url)
    .get(urlPath)
    .reply(200, response);
};

nock.disableNetConnect();

let dirpath;
let response;
let url;
let imagePath;
let exampleImage;

beforeEach(async () => {
  dirpath = await fs
    .mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  url = 'https://ru.hexlet.io/courses';
  response = await getFixturesFile('pageBefore.html');
  imagePath = '/assets/professions/nodejs.png';
  exampleImage = await getFixturesFile('nodejs.png', 'binary');
  nockedUrl(url, '', response);
  nockedUrl(url, imagePath, exampleImage);
});

test('Test that function create html file', async () => {
  await savePage(url, dirpath);
  const filesList = await fs.readdir(dirpath);

  expect(filesList.includes('ru-hexlet-io-courses.html')).toBeTruthy();
});

// change savePage arguments

test('Test that fuction create directory with page images', async () => {
  await savePage(url, dirpath);
  const filesList = await fs.readdir(dirpath);
  const dirs = filesList.filter(async (name) => {
    const stat = await fs.stat(path.join(dirpath, name));
    return stat.isDirectory();
  });

  expect(dirs.includes('ru-hexlet-io-courses_files')).toBeTruthy();
});

test('Test that function save and changes links in .html file', async () => {
  const htmlFilePath = await savePage(url, dirpath);
  const readenData = await fs.readFile(htmlFilePath, 'utf8');
  const htmlFileAfter = await getFixturesFile('pageAfter.html');

  const $ = cheerio.load(htmlFileAfter);

  $('img').each(function () {
    const src = $(this).attr('src');
    const newSrc = path.join(dirpath, src);
    $(this).attr('src', newSrc);
  });

  const expectedResult = $.html();

  expect(readenData).toEqual(expectedResult);
});
