/* eslint-disable no-unused-vars */
/* eslint-disable consistent-return */
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

const deleteBreaks = (text) => text.replace(/(\r\n|\n|\r)/gm, '');

const get = (url) => {
  const mapping = {
    json: () => axios.get(url, { responseType: 'json' }),
    arraybuffer: () => axios.get(url, { responseType: 'arraybuffer' }),
  };
  const binaryDataExtnames = ['.png', '.jpg', '.svg'];
  const { pathname } = new URL(url);
  const dataType = binaryDataExtnames.includes(path.extname(pathname)) ? 'arraybuffer' : 'json';

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

const getTasksList = (list) => {
  let tasks = [];
  list.forEach((resourseUrl) => {
    const task = () => get(resourseUrl);
    const title = getFilename(resourseUrl);
    tasks = [...tasks, { title, task }];
  });
  return tasks;
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
      const { origin } = new URL(mainUrl);
      const resourseData = $(this).attr(mapping[tag]) ?? '';
      // pageLoaderLog('Original path or url: %o', resourseData);
      // pageLoaderLog('Is absolute path %o', isAbsolutePath(resourseData));
      const resourse = isAbsolutePath(resourseData)
        ? resourseData
        : new URL(resourseData, origin).href;
      // pageLoaderLog('Resourse: %o', resourse);

      // Check that main url host equal resourse url host
      if ((new URL(mainUrl).hostname === new URL(resourse).hostname && resourse !== '') || !isAbsolutePath(resourseData)) {
        pageLoaderLog('name is %o', getFilename(resourse));
        resoursesList = [...resoursesList, resourse];
        $(this).attr(mapping[tag], path.join(filesDirectoryName, getFilename(resourse)));
      }
    });
  });

  return { htmlData: $.root().html(), resoursesList };
};

const savePage = (url, dirpath = process.cwd()) => {
  const htmlFilepath = getFilename(url);
  const resoursesDirectoryPath = htmlFilepath.replace('.html', '_files');
  let tasksListForListr = [];

  return get(url)
    .then(({ data }) => {
      const { htmlData, resoursesList } = formatDocument(url, data, resoursesDirectoryPath);
      return fs.writeFile(path.join(dirpath, htmlFilepath), htmlData)
        .then(() => fs.mkdir(path.join(dirpath, resoursesDirectoryPath)))
        .then(() => resoursesList);
    })

    .then((list) => {
      tasksListForListr = getTasksList(list);
      const promises = tasksListForListr.map(({ task }) => task());
      return Promise.all(promises);
    })

    .then((files) => files.forEach((response) => {
      const { data, config } = response;
      const resourseFilepath = path
        .join(dirpath, resoursesDirectoryPath, getFilename(config.url));

      const dataToWrite = config.responseType === 'json' ? deleteBreaks(data).trim() : data;

      return fs.writeFile(resourseFilepath, dataToWrite);
    }))

    .then(() => ({ htmlFilepath: path.join(dirpath, htmlFilepath), tasksListForListr }))
    .catch((error) => Promise.reject(error));
};

export default savePage;
