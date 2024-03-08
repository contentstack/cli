import { cliux, validatePath } from '@contentstack/cli-utilities';
import * as path from 'path';

export const askPassword = async () => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'CLI_AUTH_LOGIN_ENTER_PASSWORD',
    name: 'password',
    transformer: (pswd: string) => {
      let pswdMasked = '';
      for (let i = 0; i < pswd.length; i++) {
        pswdMasked += '*';
      }
      return pswdMasked;
    },
  });
};

export const askOTPChannel = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'list',
    name: 'otpChannel',
    message: 'CLI_AUTH_LOGIN_ASK_CHANNEL_FOR_OTP',
    choices: [
      { name: 'Authy App', value: 'authy' },
      { name: 'SMS', value: 'sms' },
    ],
  });
};

export const askOTP = async (): Promise<string> => {
  return cliux.inquire({
    type: 'input',
    message: 'CLI_AUTH_LOGIN_ENTER_SECURITY_CODE',
    name: 'tfaToken',
  });
};

export const askUsername = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'CLI_AUTH_LOGIN_ENTER_EMAIL_ADDRESS',
    name: 'username',
  });
};

export const askExportDir = async (): Promise<string> => {
  let result = await cliux.inquire<string>({
    type: 'input',
    message: 'Enter the path for storing the content: (current folder)',
    name: 'dir',
    validate: validatePath,
  });
  if (!result) {
    return process.cwd();
  } else {
    result = result.replace(/['"]/g, '');
    return path.resolve(result);
  }
};

export const askAPIKey = async (): Promise<string> => {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'Enter the stack api key',
    name: 'apiKey',
  });
};
