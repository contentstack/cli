const { cli } = require('cli-ux')
const inquirer = require('inquirer')
const chalk = require('chalk')

let client = {}

class AuthHandler {
  constructor(opts) {
    client = opts.contentstackClient
  }

  /**
    *
    * Login into Contentstack
    * @param {string} email Contentstack email address
    * @param {string} password User's password for contentstack account
    * @returns {Promise} Promise object returns authtoken on success
   */
  async login(email, password, tfaToken) {
    const loginPayload = {
      email,
      password
    };
    if (tfaToken) {
      loginPayload.tfa_token = tfaToken;
    }
    return new Promise( (resolve, reject) => {
      if (email && password) {
        client.login(loginPayload).then(async result => {
          // 2FA enabled
          if (result.error_code === 294) {
            const twoFactorResult = await this.twoFactorAuthentication(loginPayload);
            resolve(twoFactorResult);
          } else {
            resolve(result.user);
          }
        }).catch(error => {
          reject(error)
        })
      }
    })
  }

  async twoFactorAuthentication(loginPayload) {
    const actions = [{
      type: 'list',
      name: 'otpChannel',
      message: "Two factor authentication enabled, please select a way to get the security code",
      choices: [
        { name: 'Authy App', value: 'authy' },
        { name: 'SMS', value: 'sms' },
      ],
    }];
  
    const channelResponse = await inquirer.prompt(actions)

    // need to send sms to the mobile
    if (channelResponse.otpChannel === 'sms') {
      await client.axiosInstance.post('/user/request_token_sms', { user: loginPayload });
      cli.log(chalk.yellow("Security code sent to your mobile"))
    }

    const tokenResponse = await inquirer.prompt({
      type: 'input',
      message: 'Please provide the security code',
      name: 'tfaToken',
    });
    
    return this.login(loginPayload.email, loginPayload.password, tokenResponse.tfaToken);
  }
  
  /**
    *
    * Logout from Contentstack
    * @param {string} authtoken authtoken that needs to invalidated when logging out
    * @returns {Promise} Promise object returns response object from Contentstack
  */
  async logout(authtoken) {
    return new Promise(function (resolve, reject) {
      if (authtoken) {
        client.logout(authtoken).then(function (response) {
          return resolve(response)
        }).catch(error => {
          reject(error)
        })
      } else {
        return resolve()
      }
    })
  }

  async validateAuthtoken(authtoken) {
    return new Promise(function (resolve, reject) {
      if (authtoken) {
        client.login({token: authtoken})
        client.getUser()
        .then(user => {
          return resolve(user)
        }).catch(error => reject(error))
      }
      return resolve()
    })
  }
}

module.exports = {
  AuthHandler, client,
}
