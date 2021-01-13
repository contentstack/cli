const Generator = require('yeoman-generator')
const chalk = require('chalk')
const yosay = require('yosay')
const _ = require('lodash')
const path = require('path')
const sortPjson = require('sort-pjson')
const fixpack = require('@oclif/fixpack')
const fs = require('fs')
const nps = require('nps-utils')

const isWindows = process.platform === 'win32'
const rmrf = isWindows ? 'rimraf' : 'rm -rf'
const rmf = isWindows ? 'rimraf' : 'rm -f'

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts)
    this.path = opts.path
  }

	pjson = {
		scripts: {},
		engines: {},
		devDependencies: {},
		dependencies: {},
		oclif: {},
	};

	get _ext() {
    return this.ts ? 'ts' : 'js'
  }

  get _bin() {
    let bin = (this.pjson.oclif && (this.pjson.oclif.bin || this.pjson.oclif.dirname)) || this.pjson.name
    if (bin.includes('/')) bin = bin.split('/').pop()
    return bin
  }

	_gitignore() {
		const existing = this.fs.exists(this.destinationPath('.gitignore')) ? this.fs.read(this.destinationPath('.gitignore')).split('\n') : []
    return _([
      '*-debug.log',
      '*-error.log',
      'node_modules',
      '/tmp',
      '/dist',
      '/.nyc_output',
      '/package-lock.json'
    ])
    .concat(existing)
    .compact()
    .uniq()
    .sort()
    .join('\n') + '\n'
	}

	_writePlugin() {	
    const bin = this._bin
    const cmd = `${bin} hello`
    const opts = {...this, _, bin, cmd}
    this.fs.copyTpl(this.templatePath('plugin/bin/run'), this.destinationPath('bin/run'), opts)
    this.fs.copyTpl(this.templatePath('bin/run.cmd'), this.destinationPath('bin/run.cmd'), opts)
    const commandPath = this.destinationPath(`src/commands/hello.${this._ext}`)
    if (!fs.existsSync('src/commands')) {
      this.fs.copyTpl(this.templatePath(`src/command.${this._ext}.ejs`), commandPath, {...opts, name: 'hello', path: commandPath.replace(process.cwd(), '.')})
    }
    if (this.ts) {
      this.fs.copyTpl(this.templatePath('plugin/src/index.ts'), this.destinationPath('src/index.ts'), opts)
    }
    if (this.mocha && !fs.existsSync('test')) {
      this.fs.copyTpl(this.templatePath(`test/command.test.${this._ext}.ejs`), this.destinationPath(`test/commands/hello.test.${this._ext}`), {...opts, name: 'hello'})
    }
  }

  _writeExtension(type) {

    let baseDir = path.join(__dirname, '../my-templates/', type)

    // copy base files
    this.fs.copy(this.templatePath(`base/LICENSE`), this.destinationPath('LICENSE'))
    this.fs.copy(this.templatePath(`base/.eslintrc.json`), this.destinationPath('.eslintrc.json'))
    this.fs.copy(this.templatePath(`base/gulpfile.js`), this.destinationPath('gulpfile.js'))
    this.fs.copy(this.templatePath(`base/README.md`), this.destinationPath('README.md'))

    switch(type) {
      case 'dashboard-widget':
      case 'custom-widget':
        this.fs.copy(this.templatePath(path.join(baseDir, 'source/index.html')), this.destinationPath('source/index.html'))
        // this.fs.copyTpl(this.templatePath(path.join(baseDir, 'source/index.ejs')), this.destinationPath('source/index.html'), this.answers)
        this.fs.copy(this.templatePath(path.join(baseDir, 'source/index.js')), this.destinationPath('source/index.js'))
        this.fs.copy(this.templatePath(path.join(baseDir, 'source/style.css')), this.destinationPath('source/style.css'))
        break
      case 'custom-field':
        this.fs.copyTpl(this.templatePath('custom-field/source/index.ejs'), this.destinationPath('source/index.html'), this.answers)
        this.fs.copy(this.templatePath(`custom-field/js/${this.answers.dataType}.js`), this.destinationPath(`source/${this.answers.dataType}.js`))
        this.fs.copy(this.templatePath(path.join(baseDir, 'source/style.css')), this.destinationPath('source/style.css'))
        break
      }

    // debugger
    
    // copy type specific files
    
    // this.fs.copy(this.templatePath(path.join(baseDir, 'source/index.html')), this.destinationPath('source/index.html'))
    // this.fs.copyTpl(this.templatePath(path.join(baseDir, 'source/index.ejs')), this.destinationPath('source/index.html'), this.answers)   
    
    // this.fs.copy(this.templatePath(path.join(baseDir, 'source/index.js')), this.destinationPath('source/index.js'))
    // this.fs.copy(this.templatePath(path.join(baseDir, 'source/style.css')), this.destinationPath('source/style.css'))
  }

	async prompting() {
		const defaults = {
			name: 'extension-template',
      description: 'A starter template for creating an experience extension',
			version: '0.0.0',
			license: 'MIT',
      dependencies: {},
			engines: {
        node: '>=8.0.0',
        ...this.pjson.engines,
      }
		}

    if (this.path) {
      this.destinationRoot(path.resolve(this.path))
      process.chdir(this.destinationRoot())
    }

		let prompts = [
			{
				type: 'input',
				name: 'name',
				message: 'npm package name',
				default: defaults.name,
				when: !this.pjson.name,
			},
			{
				type: 'input',
				name: 'description',
				message: 'description',
				default: defaults.description,
				when: !this.pjson.description,
			},
			{
				type: 'input',
				name: 'version',
				message: 'version',
				default: defaults.version,
				when: !this.pjson.version,
			},
			{
				type: 'input',
				name: 'license',
				message: 'license',
				default: defaults.license,
				when: !this.pjson.license,
			},
			{
				type: 'input',
				name: 'author',
				message: 'author',
				default: defaults.author,
				when: !this.pjson.author,
			},
			{
        type: 'list',
        name: 'type',
        message: 'Select the type of widget to be created',
        choices: [
          {name: 'Dashboard widget', value: 'dashboard-widget'},
          {name: 'Custom Field', value: 'custom-field'},
          {name: 'Custom Widget', value: 'custom-widget'},
        ],
      },
      {
				type: 'list',
				name: 'width',
				message: 'Select the width',
				choices: [
          {name: 'Half', value: 'half'},
          {name: 'Full', value: 'full'},
        ],
				when: (answers) => answers.type === 'dashboard-widget',
			},
      {
        type: 'list',
        name: 'dataType',
        message: 'Select the data type',
        choices: [
          {name: 'Number', value: 'number'},
          {name: 'JSON', value: 'json'},
          {name: 'Boolean', value: 'boolean'},
          {name: 'File', value: 'file'},
          {name: 'Text', value: 'text'},
          {name: 'Reference', value: 'reference'},
          {name: 'Date', value: 'date'},
        ],
        when: (answers) => answers.type === 'custom-field',
      }
		]

		this.answers = await this.prompt(prompts)

    this.pjson.scripts.build = 'npx gulp build'

		this.pjson.keywords = defaults.keywords || 'contentstack'

		this.pjson.name = this.answers.name || defaults.name
    this.pjson.description = this.answers.description || defaults.description
    this.pjson.license = this.answers.license || defaults.license
    this.pjson.version = this.answers.version || defaults.version
    this.pjson.main = 'gulpfile.js'
    this.pjson.author = this.answers.author || defaults.author
    this.pjson.engines.node = defaults.engines.node
	}

	writing() {
    if (!this.path) {
  		let dir = path.join(process.cwd(), this.answers.name)
  		// if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  		this.destinationRoot(dir)
  		process.chdir(this.destinationRoot())
    }

		this.sourceRoot(path.join(__dirname, '../my-templates'))

		this.pjson.oclif = {
      commands: `./${this.ts ? 'lib' : 'src'}/commands`,
      ...this.pjson.oclif,
    }

		if(!this.pjson.oclif.devPlugins) {
			this.pjson.oclif.devPlugins = [
        '@oclif/plugin-help',
      ]
		}

		if(!this.pjson.oclif.plugins) {
			this.pjson.oclif.plugins = [
        '@oclif/plugin-help',
      ]
		}

		if (this.pjson.oclif && Array.isArray(this.pjson.oclif.plugins)) {
      this.pjson.oclif.plugins.sort()
    }

    if (this.fs.exists(this.destinationPath('./package.json'))) {
      fixpack(this.destinationPath('./package.json'), require('@oclif/fixpack/config.json'))
    }

    if (_.isEmpty(this.pjson.oclif)) delete this.pjson.oclif
    this.pjson.files = _.uniq((this.pjson.files || []).sort())

    this.fs.writeJSON(this.destinationPath('./package.json'), sortPjson(this.pjson))
    this._writeExtension(this.answers.type)
	}

	install() {
		// const dependencies = []
		const devDependencies = []

		const dev = {'save-dev': true}
		const save = {save: true}

    devDependencies.push(
      "@babel/cli@^7.5.0",
      "@babel/core@^7.5.4",
      "@babel/preset-env@^7.5.4",
      "eslint@^7.15.0",
      "eslint-config-airbnb-base@^13.1.0",
      "eslint-config-standard@^16.0.2",
      "eslint-plugin-import@^2.22.1",
      "eslint-plugin-node@^11.1.0",
      "eslint-plugin-promise@^4.2.1",
      "gulp@^4.0.0",
      "gulp-babel@^8.0.0",
      "gulp-clean-css@^4.2.0",
      "gulp-eslint@^6.0.0",
      "gulp-inline@^0.1.3",
      "gulp-stylelint@^7.0.0",
      "gulp-uglify@^3.0.0",
      "stylelint@^13.2.0",
      "stylelint-config-standard@^20.0.0"
    )

    return Promise.all([
    	// this.npmInstall(dependencies, {...save}),
    	this.npmInstall(devDependencies, {...dev, ignoreScripts: true}),
    ]).then(() => {})
	}

	end() {
  	this.spawnCommandSync(path.join('.', 'node_modules/.bin/oclif-dev'), ['readme'])
    console.log(`\nCreated ${this.pjson.name} in ${this.destinationRoot()}`)
  }
}