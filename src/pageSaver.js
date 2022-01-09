import fs from 'fs/promises';

import getFilepath from './filepathGenerator.js';
import load from './loader.js';

const savePage = (dirpath, url) => {
  const filepath = getFilepath(url, dirpath);

  return load(url).then((response) => {
    const promise = fs.writeFile(filepath, response.data);
    return promise.then(() => Promise.resolve(filepath));
  });
};

export default savePage;
