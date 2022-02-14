/* eslint-disable func-names */
import {
  test, expect, beforeEach,
} from '@jest/globals';

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';
import nock from 'nock';
import debug from 'debug';

import savePage from '../src/pageSaver.js';

const log = debug('page-loader-test');

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
  nockedUrl('https://cdn2.hexlet.io', '/assets/menu.css', '');
  nockedUrl(url, '/assets/application.css', '');
  nockedUrl(url, '/courses', '');
  nockedUrl('https://js.stripe.com', '/v3', '');
  nockedUrl('https://ru.hexlet.io', '/packs/js/runtime.js', '');
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

test('Test that function hand fs write file error', async () => {
  nockedUrl('https://ru.hexlet.io', '/null', null);
  await savePage('https://ru.hexlet.io/null', dirpath).catch((err) => {
    expect(err).not.toBe(undefined);
  });
});

test('Test that fucntion throw error becouse catch 404 error', async () => {
  nockedUrl('https://ru.hexlet.io', '/abc', response, 404);
  await savePage('https://ru.hexlet.io/abc', dirpath).catch((err) => {
    expect(err).not.toBe(undefined);
  });
});

test('Test that function throw error becouse catch 500 error', async () => {
  nockedUrl('https://ru.hexlet.io', '/a', response, 500);
  await savePage('https://ru.hexlet.io/a', dirpath).catch((err) => {
    expect(err).not.toBe(undefined);
  });
});

test('Test that function throw error becouse _files directory has already exist', async () => {
  await savePage(url, dirpath);
  await savePage(url, dirpath).catch((err) => {
    expect(err).not.toBe(undefined);
  });
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

test('Test that function normal work with null response', async () => {
  nockedUrl('https://ru.hexlet.io', '/b', undefined);
  await savePage('https://ru.hexlet.io/b', dirpath).catch((err) => {
    expect(err).toEqual(new Error('no response'));
  });
});
