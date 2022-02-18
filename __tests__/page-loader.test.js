/* eslint-disable func-names */
import {
  test, expect, beforeEach, jest,
} from '@jest/globals';

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';
import nock from 'nock';
import debug from 'debug';

import savePage from '../src/pageSaver.js';

const log = debug('page-loader');

log.color = 270;

const getFixturesFile = (filename, encoding = 'utf8') => {
  const filepath = path.join('__fixtures__', filename);
  return fs.readFile(filepath, encoding);
};

const nockedUrl = (url, urlPath, response, returnsCode = 200) => {
  nock(url)
    .get(urlPath)
    .reply(returnsCode, response);
};

nock.disableNetConnect();

let dirpath;
let response;
let url;
let mainUrl;
let imagePath;
let exampleImage;

beforeEach(async () => {
  dirpath = await fs
    .mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  mainUrl = 'https://ru.hexlet.io';
  url = 'https://ru.hexlet.io/courses';
  response = await getFixturesFile('pageBefore.html');
  imagePath = '/courses/assets/professions/nodejs.png';
  exampleImage = await getFixturesFile('nodejs.png', 'binary');
  nockedUrl(mainUrl, '/courses', response);
  nockedUrl(mainUrl, imagePath, exampleImage);
  nockedUrl('https://cdn2.hexlet.io', '/assets/menu.css', '');
  nockedUrl(mainUrl, '/courses/assets/application.css', '');
  nockedUrl(mainUrl, '/courses', '');
  nockedUrl('https://js.stripe.com', '/v3', '');
  nockedUrl('https://ru.hexlet.io', '/packs/js/runtime.js', '');

  const spy = jest.spyOn(process, 'cwd');
  spy.mockReturnValue(dirpath);
});

test('Test that function create html file', async () => {
  await savePage(url, dirpath);
  const filesList = await fs.readdir(dirpath);
  log('files list', filesList);
  expect(filesList.includes('ru-hexlet-io-courses.html')).toBeTruthy();
});

test('Test that fuction create directory with page resourses', async () => {
  await savePage(url, dirpath);
  const filesList = await fs.readdir(dirpath);
  const dirs = filesList.filter(async (name) => {
    const stat = await fs.stat(path.join(dirpath, name));
    return stat.isDirectory();
  });
  expect(dirs.includes('ru-hexlet-io-courses_files')).toBeTruthy();
});

test('Test that function save and changes links in .html file', async () => {
  const [htmlFilepath] = await savePage(url, dirpath);
  log('Html filepath is', htmlFilepath);
  const readenData = await fs.readFile(htmlFilepath, 'utf8');
  const htmlFileAfter = await getFixturesFile('pageAfter.html');

  const $ = cheerio.load(htmlFileAfter);
  const tagsList = ['img', 'link', 'script'];

  const mapping = {
    img: 'src',
    script: 'src',
    link: 'href',
  };
    // Change paths in expected html (dirpath + <name>)
  tagsList.forEach((tag) => {
    $(tag).each(function () {
      const resourseUrl = $(this).attr(mapping[tag]);
      const filepath = path.join(dirpath, resourseUrl);
      log('Resourse url is', resourseUrl);
      if (!resourseUrl.startsWith('https://')) {
        $(this).attr(mapping[tag], filepath);
      }
    });
  });

  const expectedResult = $.html();

  expect(readenData).toEqual(expectedResult);
});

// Errors handling tests

test('Test that fucntion throw error becouse catch 404 error', async () => {
  nockedUrl(url, '/404Error', response, 404);
  await savePage(path.join(url, '404Error'), dirpath).catch((error) => {
    expect(error).not.toEqual(undefined);
  });
});

test('Test that function throw error becouse catch 500 error', async () => {
  nockedUrl(url, '/500Error', response, 500);
  await savePage(path.join(url, '500Error'), dirpath).catch((error) => {
    expect(error).not.toEqual(undefined);
  });
});

test('Test that function throw error becouse _files directory has already exist', async () => {
  await savePage(url, dirpath);
  await savePage(url, dirpath).catch((err) => {
    expect(err.code).toEqual('EEXIST');
  });
});

test('Test that function throw error becouse directory not exist', async () => {
  await savePage(url, path.join(dirpath, 'downloads')).catch((error) => {
    expect(error.code).toEqual('ENOENT');
  });
});
