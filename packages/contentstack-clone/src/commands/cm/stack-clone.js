const {Command} = require('@contentstack/cli-command')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')
const {CloneHandler} = require('../../lib/util/clone-handler')
let config = require('../../lib/util/dummyConfig.json')
const path = require('path')
const rimraf = require('rimraf')
let pathdir = path.join(__dirname.split('src')[0], 'contents')
const forEach = require('lodash/forEach')
const { readdirSync } = require('fs')

class StackCloneCommand extends Command { 
  async run() {
    try {
      await this.removeContentDirIfNotEmptyBeforeClone(pathdir) // NOTE remove if folder not empty before clone

      this.registerCleanupOnInterrupt(pathdir)
      let _authToken = credStore.get('authtoken')
      if (_authToken && _authToken !== undefined) {
        config.auth_token = _authToken
        config.host = this.cmaHost
        config.cdn  = this.cdaHost
        const cloneHandler = new CloneHandler(config)
        await cloneHandler.start()
        let successMessage = 'Stack cloning process have been completed successfully'
        await this.cleanUp(pathdir, successMessage)
      } else {
        console.log("AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login");
      }
    } catch (error) {
      await this.cleanUp(pathdir)
      // eslint-disable-next-line no-console
      console.log(error.message || error)
    }
  }

  async removeContentDirIfNotEmptyBeforeClone(dir) {
    try {
      const dirNotEmpty = readdirSync(dir).length

      if (dirNotEmpty) {
        await this.cleanUp(dir)
      }
    } catch (error) {
      const omit = ['ENOENT'] // NOTE add emittable error codes in the array

      if (!omit.includes(error.code)) {
        console.log(error.message)
      }
    }
  }

  async cleanUp(pathDir, message) {
    return new Promise(resolve => {
      rimraf(pathDir, function (err) {
        if (err)
          throw err
        if (message) {
          // eslint-disable-next-line no-console
          console.log(message)
        }
        resolve()
      })
    })
  }

  registerCleanupOnInterrupt(pathDir) {
    const interrupt = ['SIGINT', 'SIGQUIT', 'SIGTERM']
    const exceptions = ['unhandledRejection', 'uncaughtException']

    const cleanUp = async (exitOrError = null) => {
      // eslint-disable-next-line no-console
      console.log('\nCleaning up')
      await this.cleanUp(pathDir)
      // eslint-disable-next-line no-console
      console.log('done')
      // eslint-disable-next-line no-process-exit

      if (exitOrError instanceof Promise) {
        exitOrError.catch(error => {
          console.log(error && error.message || '')
        })
      } else if (exitOrError && exitOrError.message) {
        console.log(exitOrError.message)
      }

      if (exitOrError === true) process.exit()
    }

    forEach(exceptions, event => process.on(event, cleanUp))
    forEach(interrupt, signal => process.on(signal, () => cleanUp(true)))
  }
}

StackCloneCommand.description = `Clone data (structure or content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in a few steps.
`

StackCloneCommand.examples = [
  'csdx cm:stack-clone',
]

module.exports = StackCloneCommand
