import * as inquirer from 'inquirer'
import cli from 'cli-ux'
import * as path from 'path'
import { AppConfig } from '../config'

/**
 * @description Inquire starter app
 */

export async function inquireApp(apps: Array<any>): Promise<any> {
  const appsPreview = apps.map(app => {
    return {
      name: app.displayName,
      value: app,
    }
  })
  const actions = [{
    type: 'list',
    name: 'app',
    message: 'Select an App',
    choices: [...appsPreview, 'Exit'],
  }]
  const selectedApp = await inquirer.prompt(actions)
  if (selectedApp.app === 'Exit') {
    cli.log('Exiting...')
    throw new Error('Exit')
  }
  return selectedApp.app
}

/**
 * @description Inquire clone destination directory
 */

export async function inquireCloneDirectory(): Promise<string> {
  const actions = [{
    type: 'list',
    name: 'path',
    message: 'Where do you want to copy the source code?',
    choices: ['Current Folder', 'Other'],
  }]

  const selectedPath = await inquirer.prompt(actions)
  if (selectedPath.path === 'Current Folder') {
    return process.cwd()
  }

  // Ask for the custom path
  let selectedCustomPath = await inquirer.prompt([{ type: 'string', name: 'path', message: 'Provide the destionation path' }])
  selectedCustomPath = path.resolve(selectedCustomPath.path)
  return selectedCustomPath
}

export async function  inquireGithubAccessToken(): Promise<any> {
  // Ask for the access token
  const accessToken = await inquirer.prompt([{ type: 'string', name: 'token', message: 'Note: Access token not created already, check out this link https://github.com/settings/tokens \n Provide github access token' }])
  return accessToken.token
}

export async function inquireAppType(): Promise<string> {
  const actions = [{
    type: 'list',
    name: 'type',
    message: 'Which type of app you want to clone?',
    choices: [{name: 'Sample App', value: 'sampleapp'}, {name: 'Starter App', value: 'starterapp'}],
  }]

  const appType = await inquirer.prompt(actions)
  return appType.type
}