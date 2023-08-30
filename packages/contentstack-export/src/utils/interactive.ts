import { cliux } from '@contentstack/cli-utilities';
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
  const result = await cliux.inquire<string>({
    type: 'input',
    message: 'Enter the path for storing the content: (current folder)',
    name: 'dir',
  });
  if (!result) {
    return process.cwd();
  } else {
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

export const askDeveloperHub = async(regionName: string): Promise<string> =>{
  return await cliux.inquire({
    type: 'input',
    name: 'name',
    validate: (url: string) => {
      if (!url) return "Developer-hub URL can't be empty.";
  
      return true;
    },
    message: `Enter the developer-hub base URL for the ${regionName} region - `,
  });
}
