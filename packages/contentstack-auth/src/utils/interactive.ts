import cliux from './cli-ux';

export const askPassword = async () => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'Enter your password',
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
