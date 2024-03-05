import * as path from 'path';
const inquirer = require('inquirer');
import { cliux, pathValidator } from '@contentstack/cli-utilities';

import messageHandler from '../messages';

/**
 * @description Inquire starter app
 */

export async function inquireApp(apps: Array<any>): Promise<any> {
  const appsPreview = apps.map((app) => {
    return {
      name: app.displayName,
      value: app,
    };
  });
  const actions = [
    {
      type: 'list',
      name: 'app',
      message: messageHandler.parse('CLI_BOOTSTRAP_APP_SELECTION_ENQUIRY'),
      choices: [...appsPreview, 'Exit'],
    },
  ];
  const selectedApp = await inquirer.prompt(actions);
  if (selectedApp.app === 'Exit') {
    cliux.print('Exiting...');
    throw new Error('Exit');
  }
  return selectedApp.app;
}

/**
 * @description Inquire clone destination directory
 */

export async function inquireCloneDirectory(): Promise<string> {
  const actions = [
    {
      type: 'list',
      name: 'path',
      message: messageHandler.parse('CLI_BOOTSTRAP_APP_COPY_SOURCE_CODE_DESTINATION_TYPE_ENQUIRY'),
      choices: ['Current Folder', 'Other'],
    },
  ];

  const selectedPath = await inquirer.prompt(actions);
  if (selectedPath.path === 'Current Folder') {
    return process.cwd();
  }

  // Ask for the custom path
  let selectedCustomPath = await inquirer.prompt([
    {
      type: 'string',
      name: 'path',
      message: messageHandler.parse('CLI_BOOTSTRAP_APP_COPY_SOURCE_CODE_DESTINATION_ENQUIRY'),
    },
  ]);
  selectedCustomPath = pathValidator(selectedCustomPath.path);
  return selectedCustomPath;
}

export async function inquireGithubAccessToken(): Promise<any> {
  // Ask for the access token
  const accessToken = await inquirer.prompt([
    {
      type: 'string',
      name: 'token',
      message: messageHandler.parse('CLI_BOOTSTRAP_NO_ACCESS_TOKEN_CREATED'),
    },
  ]);
  return accessToken.token;
}

export async function inquireAppType(): Promise<string> {
  const actions = [
    {
      type: 'list',
      name: 'type',
      message: messageHandler.parse('CLI_BOOTSTRAP_TYPE_OF_APP_ENQUIRY'),
      choices: [
        { name: 'Sample App', value: 'sampleapp' },
        { name: 'Starter App', value: 'starterapp' },
      ],
    },
  ];

  const appType = await inquirer.prompt(actions);
  return appType.type;
}

export async function inquireLivePreviewSupport() {
  const { livePreviewEnabled } = await inquirer.prompt({
    type: 'confirm',
    name: 'livePreviewEnabled',
    message: 'Enable live preview?',
  });
  return livePreviewEnabled;
}

export async function continueBootstrapCommand() {
  const { shouldContinue } = await inquirer.prompt({
    type: 'list',
    name: 'shouldContinue',
    message: `To continue with the Bootstrap command without Live Preview, please select Yes.`,
    choices: ['yes', 'no'],
    loop: false,
  });
  return shouldContinue;
}