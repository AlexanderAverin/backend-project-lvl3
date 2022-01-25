import {
  test, expect, beforeEach,
} from '@jest/globals';

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import nock from 'nock';

import savePage from '../src/pageSaver';

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

  url = 'https://ru.hexlet.io';
  response = await getFixturesFile('pageBefore.html');

  imagePath = '/assets/professions/nodejs.png';
  exampleImage = await getFixturesFile('nodejs.png', 'binary');

  nockedUrl(url, '/', response);
  nockedUrl(url, imagePath, exampleImage);
});

test('Test that function create html file', async () => {
  await savePage(dirpath, url);
  const filesList = await fs.readdir(dirpath);

  expect(filesList.includes('ru-hexlet-io.html')).toBeTruthy();
  expect(!filesList.includes('https://ru.hexlet.io.html')).toBeTruthy();
  expect(!filesList.includes('ru.hexlet.io.html')).toBeTruthy();
});

test('Test that function save page', async () => {
  const htmlFilepath = await savePage(dirpath, url);
  const savedData = await fs.readFile(htmlFilepath, 'utf8');

  expect(savedData).toEqual(response);
});

test('Test that fuction create directory with page images', async () => {
  await savePage(dirpath, url);
  const filesList = await fs.readdir(dirpath);

  const dirs = filesList.filter(async (name) => {
    const stat = await fs.stat(path.join(dirpath, name));
    return stat.isDirectory();
  });

  expect(dirs.includes('ru-hexlet-io_files')).toBeTruthy();
});

// test('Test that function changes links in .html file', async () => {
//   const htmlFilepath = await savePage(dirpath, url);
//   const readenData = await fs.readFile(htmlFilepath, 'utf8');
//   const htmlAfter = await getFixturesFile('pageAfter.html');

//   expect(readenData).toEqual(htmlAfter);
// });

// test('Test that main function correctly download image', async () => {
//   await savePage(dirpath, url);

//   const imagesList = await fs.readdir(path.join(dirpath, 'ru-hexlet-io_files'));
//   // const downloadedImagePath = path.join(dirpath, 'ru-hexlet-io_files', imagesList[0]);

//   // const binaryData = await fs.readFile(downloadedImagePath, 'binary');

//   expect(imagesList).toEqual('a');
// });
