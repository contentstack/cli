const Generator = require('yeoman-generator')
const chalk = require('chalk')
const yosay = require('yosay')

module.exports = class extends Generator {
	method1() {
		this.log('method 1 just ran')
	}

	method2() {
		this.log('method 2 just ran')
	}
}