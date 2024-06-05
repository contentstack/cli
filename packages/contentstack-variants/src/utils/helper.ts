import { FsUtility, cliux } from '@contentstack/cli-utilities';

export const formatError = function (error: any) {
  try {
    if (typeof error === 'string') {
      error = JSON.parse(error);
    } else {
      error = JSON.parse(error.message);
    }
  } catch (e) {}
  let message = error.errorMessage || error.error_message || error.message || error;
  if (error.errors && Object.keys(error.errors).length > 0) {
    Object.keys(error.errors).forEach((e) => {
      let entity = e;
      if (e === 'authorization') entity = 'Management Token';
      if (e === 'api_key') entity = 'Stack API key';
      if (e === 'uid') entity = 'Content Type';
      if (e === 'access_token') entity = 'Delivery Token';
      message += ' ' + [entity, error.errors[e]].join(' ');
    });
  }
  return message;
};

export const fsUtil = new FsUtility();

export const askProjectName = async (defaultValue: unknown): Promise<string> => {
  return await cliux.inquire({
    type: 'input',
    name: 'name',
    default: defaultValue,
    message: 'Enter the project name:',
  });
};
