#!/usr/bin/env node

import Listr from 'listr'
import { Command } from 'commander/esm.mjs'

import savePage from '../src/pageSaver.js'

const program = new Command()

// const makeColor = (text) => `\u001b[31m${text}\u001b[0m`

const isAxiosError = (error) => (error.isAxiosError)

const isFileSystemError = (error) => (error.code !== undefined)

const handAxiosError = (error) => {
  const problemUrl = error.config.url
  const { status } = error.response ?? { status: 'undefined code' }
  console.error(`Axios error ${status} with ${problemUrl}`)
  process.exit(1)
}

const handFsError = (error) => {
  const problemPath = error.path
  const errorCode = error.code
  console.error(`File system error ${errorCode} with ${problemPath}`)
  process.exit(1)
}

const handDefaultError = () => {
  console.error('Undefined error')
  process.exit(1)
}

const errorHandler = (error) => {
  if (isAxiosError(error)) {
    handAxiosError(error)
  }
  if (isFileSystemError(error)) {
    handFsError(error)
  }
  return handDefaultError(error)
}

program
  .description('Page loader utility')
  .option('-V, --version', 'output the version number')
  .option('-o --output [dir]', 'output dir (default: "/home/user/current-dir', process.cwd())
  .arguments('<url>')

  .action((url) => {
    const options = program.opts()
    const { output } = options

    savePage(url, output)
      .then(({ htmlFilepath, tasksListForListr }) => {
        const tasks = new Listr(tasksListForListr, { concurrent: true })

        tasks.run().then(() => {
          console.log(`Page was successfully downloaded into ${htmlFilepath}`)
        })
      })
      .catch((error) => {
        errorHandler(error)
      })
  })

program.parse(process.argv)
