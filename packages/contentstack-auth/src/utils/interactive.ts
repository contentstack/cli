import { cliux } from '@contentstack/cli-utilities';

export const askPassword = async () => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'CLI_AUTH_LOGIN_ENTER_PASSWORD',
    name: 'password',
    transformer: (pswd: string) => {
      return '*'.repeat(pswd.length);
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

export const askTokenType = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'list',
    name: 'tokenType',
    message: 'CLI_SELECT_TOKEN_TYPE',
    choices: [
      { name: 'Management Token', value: 'management'},
      { name: 'Delivery Token', value: 'delivery'},
    ]
  });
}
