import path from 'path';

const getFilename = (hostname) => {
  const regexp = /[^\s\w\d]/g;
  const formatedHostname = hostname.replaceAll(regexp, '-');
  const filename = `${formatedHostname}.html`;
  return filename;
};

const getFilepath = (dirpath, url) => {
  const myUrl = new URL(url);
  return path.join(dirpath, getFilename(myUrl.hostname));
};

export default getFilepath;
