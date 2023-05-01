/* eslint-disable no-unused-vars */
// Disable this rule becouse 'axiosDebug' should`t be use it

import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import cheerio from 'cheerio'
import debug from 'debug'

// Unused import (axiois debug)
import axiosDebug from 'axios-debug-log'

const pageLoaderLog = debug('page-loader')
pageLoaderLog.color = 270

const get = (url) => {
  const mapping = {
    json: () => axios.get(url, { responseType: 'json' }),
    arraybuffer: () => axios.get(url, { responseType: 'arraybuffer' })
  }
  const binaryDataExtnames = ['.png', '.jpg', '.svg']
  const { pathname } = new URL(url)
  const dataType = binaryDataExtnames.includes(path.extname(pathname)) ? 'arraybuffer' : 'json'

  return mapping[dataType]()
}

const isAbsolutePath = (filepath) => {
  const isStartsWithHttp = filepath.startsWith('http://')
  const isStartsWithHttps = filepath.startsWith('https://')

  return isStartsWithHttp || isStartsWithHttps
}

const getFilename = (url) => {
  const searchRegexp = /[^\s\w\d]/g
  const { hostname, pathname } = new URL(url)

  const formatedUrl = path.join(hostname, pathname)
  const extnameFromUrl = path.extname(formatedUrl)
  const fileExtname = formatedUrl.endsWith('/') || path.extname(formatedUrl.split('/').slice(-1).join('')) === '' ? '.html' : extnameFromUrl

  const urlWithoutExtname = formatedUrl.endsWith('/')
    ? formatedUrl.slice(0, -1)
    : formatedUrl.replace(fileExtname, '')

  return `${urlWithoutExtname.replace(searchRegexp, '-')}${fileExtname}`
}

const getTasksList = (list) => {
  let tasks = []
  list.forEach((resourseUrl) => {
    const task = () => get(resourseUrl)
    const title = getFilename(resourseUrl)
    tasks = [...tasks, { title, task }]
  })
  return tasks
}

const formatDocument = (mainUrl, document, filesDirectoryName) => {
  const $ = cheerio.load(document)
  let resoursesList = []
  const tagTypeMapping = { img: 'src', script: 'src', link: 'href' }

  const tags = ['img', 'script', 'link']
  tags.forEach((tag) => {
    $(tag).each(function () {
      const { origin } = new URL(mainUrl)
      const resourseData = $(this).attr(tagTypeMapping[tag]) ?? ''
      const resourse = isAbsolutePath(resourseData)
        ? resourseData
        : new URL(resourseData, origin).href

      // Check that main url host equal resourse url host
      if ((new URL(mainUrl).hostname === new URL(resourse).hostname && resourse !== '') || !isAbsolutePath(resourseData)) {
        // Debug: pageLoaderLog('name is %o', getFilename(resourse));
        resoursesList = [...resoursesList, resourse]
        $(this).attr(tagTypeMapping[tag], path.join(filesDirectoryName, getFilename(resourse)))
      }
    })
  })
  return { htmlData: $.root().html(), resoursesList }
}

const savePage = (url, dirpath) => {
  const htmlFilePath = getFilename(url)
  const resoursesDirectoryPath = htmlFilePath.replace('.html', '_files')
  let tasksListForListr = []

  return get(url)
    .then(({ data }) => {
      const { htmlData, resoursesList } = formatDocument(url, data, resoursesDirectoryPath)
      return fs.writeFile(path.join(dirpath, htmlFilePath), htmlData)
        .then(() => fs.mkdir(path.join(dirpath, resoursesDirectoryPath)))
        .then(() => resoursesList)
    })

    .then((list) => {
      tasksListForListr = getTasksList(list)
      const axiosPromieses = tasksListForListr.map(({ task }) => task())
      return Promise.all(axiosPromieses)
    })

    .then((files) => files.forEach((response) => {
      const { data, config } = response
      const filename = getFilename(config.url)
      const resourseFilepath = path
        .join(dirpath, resoursesDirectoryPath, filename)
      // If resourse is css save it in utf8 with BOM (\ufeff before data)
      const dataToWrite = path.extname(filename) === '.css' ? `\ufeff${data}` : data
      return fs.writeFile(resourseFilepath, dataToWrite)
    }))

    .then(() => ({ htmlFilepath: path.join(dirpath, htmlFilePath), tasksListForListr }))
    .catch((error) => Promise.reject(error))
}

export default savePage
