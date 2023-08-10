'use strict';

const inquirer = require('inquirer');

const COMMAND_CODE_MAP = {
  'Publish Entries': 0,
  'Publish Assets': 1,
  'Publish Entries and Assets': 2,
};

const getSelectedCommand = async () => {
  const inquirerOptions = [{
    type: 'list',
    message: 'Choose one of the following task to execute.',
    choices: Object.keys(COMMAND_CODE_MAP),
    name: 'selectedOption',
    loop: false,
  }];
  const selectedOption = await inquirer.prompt(inquirerOptions);
  return COMMAND_CODE_MAP[selectedOption];
};

module.exports = {
  getSelectedCommand,
};