import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';

import TextConstructor from './class.js';

const getExtension = (filepath) => path.extname(filepath);

const isImage = (url) => {
  const isJpgImage = url.endsWith('.jpg', url.length);
  const isPngImage = url.endsWith('.png', url.length);
  return isJpgImage || isPngImage;
};

const formatPath = (url, filepath = '/') => {
  const { protocol, hostname } = new URL(url);
  if (filepath.startsWith(protocol)) {
    return filepath;
  }
  return new URL(filepath, `${protocol}//${hostname}`).href;
};

const getTagsWithImages = (url, htmlData) => {
  const dom = cheerio.load(htmlData);

  const namesAndValuesTags = Object.entries(dom('img'));
  return namesAndValuesTags.flatMap((([, tagValue]) => {
    const parsedAttrs = tagValue.attribs ? Object.entries(tagValue.attribs) : [];
    const [attributName, attributValue] = parsedAttrs
      .find(([, value]) => isImage(value)) ?? [null, null];

    return attributName && attributValue
      ? { name: tagValue.name, attributName, attributValue }
      : [];
  }));
};

const load = (url, options = { responseType: 'json' }) => {
  const response = axios.get(url, options)
    .catch((err) => {
      if (err) {
        throw err;
      }
    });
  return response;
};

const savePage = (dirpath, url) => {
  const parsedUrl = new TextConstructor(url, '.html');
  const htmlFilepath = parsedUrl.getPath(dirpath);

  return load(url).then((response) => {
    const { data } = response;

    const tagsWithImages = getTagsWithImages(url, data);

    if (tagsWithImages.length !== 0) {
      parsedUrl.resetExtension('_files');
      const docLib = cheerio.load(data);

      const imagesDirPath = parsedUrl.getPath(dirpath);
      fs.mkdir(imagesDirPath);

      tagsWithImages.forEach((tag) => {
        const { name, attributName, attributValue } = tag;
        const imageName = new TextConstructor(attributValue, getExtension(attributValue));

        const tagPath = imageName.getPath(imagesDirPath);

        load(formatPath(url, attributValue), { responseType: 'stream' }).then((resp) => {
          const image = resp.data;
          fs.writeFile(tagPath, image);
          docLib(name).attr(attributName, tagPath);
        });
      });
      fs.writeFile(htmlFilepath, docLib.html());
    }
    const promise = fs.writeFile(htmlFilepath, data);
    return promise.then(() => Promise.resolve(htmlFilepath));
  });
};

export default savePage;
