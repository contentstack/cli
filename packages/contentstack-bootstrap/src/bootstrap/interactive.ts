import * as inquirer from 'inquirer'
import cli from 'cli-ux'
import * as path from 'path'

/**
 * Inquire starter app
 */

export async function inquireStarterApp(apps: Array<any>): Promise<string> {
  const starterAppNames: Array<string> = apps.map(app => app.displayName)
  const actions = [{
    type: 'list',
    name: 'name',
    message: 'Select an App',
    choices: [...starterAppNames, 'Exit'],
  }]
  const selectedApp = await inquirer.prompt(actions)
  if (selectedApp.name === 'Exit') {
    cli.log('Exiting...')
    throw new Error('Exit')
  }
  return selectedApp.name
}

/**
 * Inquire clone destination directory
 */

export async function inquireCloneDirectory(): Promise<string> {
  const actions = [{
    type: 'list',
    name: 'path',
    message: 'Where do you want to copy the source code ?',
    choices: ['Current Folder', 'Other'],
  }]

  const selectedPath = await inquirer.prompt(actions)
  if (selectedPath.path === 'Current Folder') {
    return process.cwd()
  }

  // Ask for the custom path
  let selectedCustomPath = await inquirer.prompt([{ type: 'string', name: 'path', message: 'Provide the destionation path' }])
  selectedCustomPath = path.join(process.cwd(), selectedCustomPath.path)
  return selectedCustomPath
}
