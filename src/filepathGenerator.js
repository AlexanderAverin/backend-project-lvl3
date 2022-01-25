import path from 'path';

const getFilepath = (url, dirpath, fileExtension = 'html') => {
  const urlData = new URL(url);
  const { hostname } = urlData;

  const regexp = /[^\s\w\d]/g;
  const formatedHostname = hostname.replaceAll(regexp, '-');
  const filename = `${formatedHostname}.${fileExtension}`;

  return path
    .join(dirpath, filename);
};

export default getFilepath;
