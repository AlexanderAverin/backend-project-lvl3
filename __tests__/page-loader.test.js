import {
  test, expect, beforeEach
} from '@jest/globals'
import nock from 'nock'
import debug from 'debug'

import os from 'os'
import fs from 'fs/promises'
import path from 'path'

import savePage from '../src/pageSaver.js'

nock.disableNetConnect()

const logThis = debug('test')
logThis.color = 270

class NoErrorThrownError extends Error {}

const getError = async (checkingFunction) => {
  try {
    await checkingFunction()

    throw new NoErrorThrownError()
  } catch (error) {
    return error
  }
}

const getFixturesFile = (filename) => {
  const filepath = path.join('__fixtures__', filename)
  return fs.readFile(filepath, 'utf8')
}

let dirpath

beforeEach(async () => {
  dirpath = await fs
    .mkdtemp(path.join(os.tmpdir(), 'page-loader-'))
  const pageBefore = await getFixturesFile('pageBefore.html')
  nock('https://ru.hexlet.io')
    .persist()
    .get(/.*/)
    .reply(200, pageBefore)

  nock('https://ru.example404.io')
    .get(/.*/)
    .reply(404, null)

  nock('https://ru.example500.io')
    .get(/.*/)
    .reply(500, null)
})

test('Testing function return html filepath', async () => {
  const { htmlFilepath } = await savePage('https://ru.hexlet.io/courses', dirpath)
  expect(htmlFilepath).toEqual(path.join(dirpath, 'ru-hexlet-io-courses.html'))
})

test('Testing that function create directory with page resourses', async () => {
  await savePage('https://ru.hexlet.io/courses', dirpath)
  const directoryList = fs.readdir(dirpath)
  expect((await directoryList).includes('ru-hexlet-io-courses_files')).toBe(true)
})

test('Testing that function change html file', async () => {
  const pageAfter = await getFixturesFile('pageAfter.html')
  const { htmlFilepath } = await savePage('https://ru.hexlet.io/courses', dirpath)
  const changedHtmlFile = await fs.readFile(htmlFilepath, 'utf8')

  expect(changedHtmlFile).toEqual(pageAfter)
})

// Errors thowing tests (funcs must throw error)

test('Testing that function throws file system error (EEXIST)', async () => {
  await savePage('https://ru.hexlet.io/courses', dirpath)
  const error = await getError(async () => savePage('https://ru.hexlet.io/courses', dirpath))
  expect(error).toHaveProperty('code', 'EEXIST')
})

test('Testing that function throw 404 axios error', async () => {
  const error = await getError(async () => savePage('https://ru.example404.io', dirpath))
  expect(error).toHaveProperty('response.status', 404)
})

test('Testing that function throw 500 axios error', async () => {
  const error = await getError(async () => savePage('https://ru.example500.io', dirpath))
  expect(error).toHaveProperty('response.status', 500)
})
