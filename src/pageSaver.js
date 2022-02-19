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

const pathsLog = debug('page-loader');
pathsLog.color = 270;

const union = (pathname, resourseUrl) => {
  const splitPathname = pathname.split(path.sep);
  const splitResourseUrl = resourseUrl.split(path.sep);

  pathsLog('union %o', [...splitPathname, ...splitResourseUrl]);

  const mergedArrays = [...splitPathname, ...splitResourseUrl].reduce((acc, item) => (
    !acc.includes(item) && item !== '' ? [...acc, item] : acc), []).join('/');
  pathsLog('union after %o', mergedArrays);
  return mergedArrays;
};

const load = (url) => {
  const mapping = {
    json: () => axios.get(url, { responseType: 'json' }).catch((error) => {
      throw error;
    }),
    stream: () => axios.get(url, { responseType: 'stream' }).catch((error) => {
      throw error;
    }),
  };
  const binaryDataExtnames = ['.png', '.jpg', '.svg'];
  const urlObject = new URL(url);
  const dataType = binaryDataExtnames.includes(path.extname(urlObject.pathname)) ? 'stream' : 'json';

  return mapping[dataType]();
};

const isAbsolutePath = (filepath) => {
  const isStartsWithHttp = filepath.startsWith('http://');
  const isStartsWithHttps = filepath.startsWith('https://');

  return isStartsWithHttp || isStartsWithHttps;
};

const getFilename = (mainUrl, resourseUrl = '') => {
  const searchRegexp = /[^\s\w\d]/g;
  const { hostname, pathname } = new URL(mainUrl);
  // Check that resourse url not equal null and main url not equal resourse url
  const formatedUrl = resourseUrl === '' || new URL(mainUrl).href === new URL(resourseUrl).href || mainUrl === resourseUrl
    ? path.join(hostname, pathname)
    : path.join(hostname, new URL(resourseUrl).pathname.replace(pathname, ''));

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
      const { pathname } = new URL(mainUrl);
      const resourseData = $(this).attr(mapping[tag]) ?? '';
      pathsLog('Original path or url: %o', resourseData);
      const resourse = isAbsolutePath(resourseData)
        ? resourseData
        : new URL(union(pathname, resourseData), new URL(mainUrl).origin).href;
      pathsLog('Resourse: %o', resourse);

      // Check that main url host equal resourse url host
      if ((new URL(mainUrl).hostname === new URL(resourse).hostname && resourse !== '') || !isAbsolutePath(resourseData)) {
        const name = getFilename(mainUrl, resourse);
        resoursesList = [...resoursesList, { resourseUrl: resourse, name }];
        $(this).attr(mapping[tag], path.join(filesDirectoryName, name));
      }
    });
  });

  return { formatedDocument: $.html(), resoursesList };
};

const savePage = (url, dirpath = process.cwd()) => {
  const initPromise = fs.readdir(dirpath).catch((error) => {
    throw error;
  });
  let tasksList = [];
  let fsPromises;
  const htmlFilepath = getFilename(url);
  return Promise.all([initPromise, load(url).then((response) => {
    const filesDirectoryPath = htmlFilepath.replace('.html', '_files');
    const {
      formatedDocument, resoursesList,
    } = formatDocument(url, response.data, filesDirectoryPath);

    const writeFilePromise = fs
      .writeFile(path.join(dirpath, htmlFilepath), formatedDocument).catch((error) => {
        throw error;
      });
    const makefFilesDirPromise = fs
      .mkdir(path.join(dirpath, filesDirectoryPath)).catch((error) => {
        throw error;
      });

    pathsLog('list: %o', resoursesList);

    resoursesList.forEach(({ resourseUrl, name }) => {
      if (path.extname(resourseUrl) === '.html') {
        return savePage(resourseUrl);
      }
      const promise = load(resourseUrl).then((resurseResponse) => {
        const resourseFilepath = path.join(dirpath, filesDirectoryPath, name);
        fs.writeFile(resourseFilepath, resurseResponse.data).catch((error) => {
          throw error;
        });
      });
      tasksList = [...tasksList, { title: name, task: () => promise }];
      return promise;
    });

    fsPromises = Promise.all([writeFilePromise, makefFilesDirPromise]);
  })])
    .then(() => Promise.all(
      [Promise.resolve(path.join(dirpath, htmlFilepath)), Promise.resolve(tasksList), fsPromises],
    ));
};

export default savePage;
