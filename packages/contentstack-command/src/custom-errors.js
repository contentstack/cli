class TokenNotFound extends Error {
  constructor(value) {
    super()
    this.value = value
    this.message = 'Token not found'
    this.toString = function () {
      return this.value + this.message
    }
  }
}

class NotLoggedIn extends Error {
  constructor() {
    super()
    this.message = 'You are not logged in. Please login with command $ csdx auth:login'
    this.toString = function () {
      return this.message
    }
  }
}

module.exports.TokenNotFound = TokenNotFound
module.exports.NotLoggedIn = NotLoggedIn
