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
  async login(email, password) {
    return new Promise(function (resolve, reject) {
      if (email && password) {
        client.login({email: email, password: password}).then(result => {
          return resolve(result.user)
        }).catch(error => {
          return reject(error)
        })
      }
    })
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
