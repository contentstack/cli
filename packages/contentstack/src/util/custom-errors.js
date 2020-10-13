
module.exports.NotLoggedIn = () => {
  this.message = 'You are not logged in. Please login with command csdx auth:login'
  this.toString = function () {
    return this.message
  }
}
