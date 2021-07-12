import cliux from './cli-ux';

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
