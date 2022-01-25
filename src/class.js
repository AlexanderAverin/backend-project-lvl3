import path from 'path';

const getFilename = (text) => {
  const type = text.startsWith('http') ? 'url' : 'path';
  const mapping = {
    url: (url) => {
      const urlData = new URL(url);
      const { hostname, pathname } = urlData;
      return `${hostname}${pathname}`;
    },
    path: (textpath) => textpath.slice(0, textpath.length - 4),
  };

  const data = mapping[type](text);
  const regexp = /[^\s\w\d]/g;

  const formatedText = data.replaceAll(regexp, '-');
  if (formatedText.endsWith('-')) {
    return formatedText.slice(0, formatedText.length - 1);
  }
  return formatedText;
};

class TextConstructor {
  constructor(text, extension) {
    this.text = text;
    this.filename = getFilename(text);
    this.extension = extension;
  }

  toString() {
    return this.text;
  }

  getPath(dirpath) {
    const filenameWithExtension = `${this.filename}${this.extension}`;
    return path
      .join(dirpath, filenameWithExtension);
  }

  getName() {
    return this.filename;
  }

  resetExtension(newExtension) {
    this.extension = newExtension;
  }
}

export default TextConstructor;
