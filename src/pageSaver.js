/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable func-names */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';

// Unused import (axiois debug)
import axiosDebug from 'axios-debug-log';

const pageLoaderLog = debug('page-loader');
pageLoaderLog.color = 270;

const union = (pathname, resourseUrl) => {
  const splitPathname = pathname.split(path.sep);
  const splitResourseUrl = resourseUrl.split(path.sep);

  const mergedArrays = [...splitPathname, ...splitResourseUrl].reduce((acc, item) => (
    !acc.includes(item) && item !== '' ? [...acc, item] : acc), []).join('/');
  return mergedArrays;
};

const load = (url) => {
  const mapping = {
    json: () => axios.get(url),
    stream: () => axios.get(url, { responseType: 'stream' }),
  };
  const binaryDataExtnames = ['.png', '.jpg', '.svg'];
  const { pathname } = new URL(url);
  const dataType = binaryDataExtnames.includes(path.extname(pathname)) ? 'stream' : 'json';

  return mapping[dataType]();
};

const isAbsolutePath = (filepath) => {
  const isStartsWithHttp = filepath.startsWith('http://');
  const isStartsWithHttps = filepath.startsWith('https://');

  return isStartsWithHttp || isStartsWithHttps;
};

const getFilename = (url) => {
  const searchRegexp = /[^\s\w\d]/g;
  const { hostname, pathname } = new URL(url);

  const formatedUrl = path.join(hostname, pathname);
  const extnameFromUrl = path.extname(formatedUrl);
  const fileExtname = formatedUrl.endsWith('/') || path.extname(formatedUrl.split('/').slice(-1).join('')) === '' ? '.html' : extnameFromUrl;

  const urlWithoutExtname = formatedUrl.endsWith('/')
    ? formatedUrl.slice(0, -1)
    : formatedUrl.replace(fileExtname, '');

  return `${urlWithoutExtname.replace(searchRegexp, '-')}${fileExtname}`;
};

const formatDocument = (mainUrl, document, filesDirectoryName) => {
  const $ = cheerio.load(document);
  let resoursesList = [];
  const mapping = {
    img: 'src',
    script: 'src',
    link: 'href',
  };
  // resoursesList: [<imageUrl>, <name>]
  const tags = ['img', 'script', 'link'];
  tags.forEach((tag) => {
    $(tag).each(function () {
      const { pathname, origin } = new URL(mainUrl);
      const resourseData = $(this).attr(mapping[tag]) ?? '';
      pageLoaderLog('Original path or url: %o', resourseData);
      pageLoaderLog('Is absolute path %o', isAbsolutePath(resourseData));
      const resourse = isAbsolutePath(resourseData)
        ? resourseData
        : new URL(resourseData, origin).href;
      pageLoaderLog('Resourse: %o', resourse);

      // Check that main url host equal resourse url host
      if ((new URL(mainUrl).hostname === new URL(resourse).hostname && resourse !== '') || !isAbsolutePath(resourseData)) {
        const name = getFilename(resourse);
        pageLoaderLog('name is %o', name);
        resoursesList = [...resoursesList, { resourseUrl: resourse, name }];
        $(this).attr(mapping[tag], path.join(filesDirectoryName, name));
      }
    });
  });

  return { htmlData: $.html(), resoursesList };
};

const savePage = (url, dirpath = process.cwd()) => {
  const htmlFilepath = getFilename(url);
  const resoursesDirectoryPath = htmlFilepath.replace('.html', '_files');
  let tasksListForListr = [];

  return load(url)
    .then(({ data }) => {
      const { htmlData, resoursesList } = formatDocument(url, data, resoursesDirectoryPath);

      return fs.writeFile(path.join(dirpath, htmlFilepath), htmlData)
        .then(() => fs.mkdir(path.join(dirpath, resoursesDirectoryPath)))
        .then(() => resoursesList);
    })
    .then((list) => list.forEach(({ name, resourseUrl }) => {
      const loadPromise = load(resourseUrl).then(({ data }) => {
        const resourseFilepath = path.join(resoursesDirectoryPath, name);
        return fs.writeFile(path.join(dirpath, resourseFilepath), data);
      });
      tasksListForListr = [...tasksListForListr, { title: name, task: () => loadPromise }];
      return loadPromise;
    }))
    .then(() => ({ htmlFilepath: path.join(dirpath, htmlFilepath), tasksListForListr }))
    .catch((error) => Promise.reject(error));
};

export default savePage;
