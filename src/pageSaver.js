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

const load = (url) => {
  const mapping = {
    json: () => axios.get(url, { responseType: 'json' }),
    stream: () => axios.get(url, { responseType: 'stream' }),
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
  pathsLog('File extname is %o', fileExtname);

  const urlWithoutExtname = formatedUrl.endsWith('/')
    ? formatedUrl.slice(0, -1)
    : formatedUrl.replace(fileExtname, '');

  return `${urlWithoutExtname.replaceAll(searchRegexp, '-')}${fileExtname}`;
};

const formatDocument = (mainUrl, document, filesDirpath) => {
  const $ = cheerio.load(document);
  const resoursesList = [];
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
      pathsLog('Path %o', resourseData);
      const resourse = isAbsolutePath(resourseData)
        ? resourseData
        : new URL(path.join(pathname, resourseData), mainUrl).href;
      // Check that main url host equal resourse url host
      if ((new URL(mainUrl).hostname === new URL(resourse).hostname && resourse !== '') || !isAbsolutePath(resourseData)) {
        const name = getFilename(mainUrl, resourse);
        resoursesList.push({ resourseUrl: resourse, name });
        $(this).attr(mapping[tag], path.join(filesDirpath, name));
      }
    });
  });

  return { formatedDocument: $.html(), resoursesList };
};

const savePage = (url, dirpath) => {
  const htmlFilepath = path.join(dirpath, getFilename(url));
  return load(url).then(({ data }) => {
    const filesDirectoryPath = htmlFilepath.replace('.html', '_files');
    const { formatedDocument, resoursesList } = formatDocument(url, data, filesDirectoryPath);

    fs.writeFile(htmlFilepath, formatedDocument);
    fs.mkdir(filesDirectoryPath);

    resoursesList.forEach(({ resourseUrl, name }) => {
      if (path.extname(resourseUrl) === '.html') {
        return savePage(resourseUrl);
      }
      return load(resourseUrl).then((resurseResponse) => {
        const imageFilepath = path.join(filesDirectoryPath, name);
        fs.writeFile(imageFilepath, resurseResponse.data).catch();
      });
    });
  })
    .then(() => Promise.resolve(htmlFilepath));
};

export default savePage;
