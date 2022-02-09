/* eslint-disable func-names */
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';

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

const getFilename = (mainUrl, resUrl = '') => {
  const searchRegexp = /[^\s\w\d]/g;
  const { hostname, pathname } = new URL(mainUrl);
  const formatedUrl = resUrl === ''
    ? path.join(hostname, pathname)
    : path.join(hostname, new URL(resUrl).pathname.replace(pathname, ''));

  const extnameFromUrl = path.extname(formatedUrl);
  const fileExtname = formatedUrl.endsWith('/') || path.extname(formatedUrl.split('/').slice(-1).join('')) === '' ? '.html' : extnameFromUrl;

  const urlWithoutExtname = formatedUrl.endsWith('/')
    ? formatedUrl.slice(0, -1)
    : formatedUrl.replace(fileExtname, '');

  return `${urlWithoutExtname.replaceAll(searchRegexp, '-')}${fileExtname}`;
};

const formatDocument = (mainUrl, document, filesDirpath) => {
  const $ = cheerio.load(document);
  const imagesList = [];
  // use imagesList: [<imageUrl>, <name>]
  // Add other files type
  $('img').each(function () {
    const { pathname } = new URL(mainUrl);
    const src = isAbsolutePath($(this).attr('src'))
      ? $(this).attr('src')
      : new URL(path.join(pathname, $(this).attr('src')), mainUrl).href;

    const name = getFilename(mainUrl, src);
    imagesList.push({ src, name });
    $(this).attr('src', path.join(filesDirpath, name));
  });
  return { formatedDocument: $.html(), imagesList };
};

const savePage = (url, dirpath) => {
  const htmlFilepath = path.join(dirpath, getFilename(url));
  return load(url).then(({ data }) => {
    const filesDirectoryPath = htmlFilepath.replace('.html', '_files');
    const { formatedDocument, imagesList } = formatDocument(url, data, filesDirectoryPath);
    fs.writeFile(htmlFilepath, formatedDocument);
    fs.mkdir(filesDirectoryPath);

    imagesList.forEach(({ src, name }) => {
      load(src).then((image) => {
        const imageFilepath = path.join(filesDirectoryPath, name);
        fs.writeFile(imageFilepath, image.data);
      });
    });
  })
    .then(() => Promise.resolve(htmlFilepath));
};

export default savePage;

// const mapping = {
//   img: 'src',
//   link: 'href',
// };
