const Generator = require('yeoman-generator')
const chalk = require('chalk')
const yosay = require('yosay')
const _ = require('lodash')
const path = require('path')
const sortPjson = require('sort-pjson')
const fs = require('fs')
const nps = require('nps-utils')

const isWindows = process.platform === 'win32'
const rmrf = isWindows ? 'rimraf' : 'rm -rf'
const rmf = isWindows ? 'rimraf' : 'rm -f'

module.exports = class extends Generator {
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

	async prompting() {
		const defaults = {
			name: 'name',
			version: '0.0.0',
			license: 'MIT',
      dependencies: {},
			engines: {
        node: '>=8.0.0',
        ...this.pjson.engines,
      }
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
        type: 'confirm',
        name: 'typescript',
        message: 'TypeScript',
        default: () => true,
      }
		]

		this.answers = await this.prompt(prompts)

		this.options = {
			typescript: this.answers.typescript
		}

		this.ts = this.options.typescript

		if (this.ts) {
      this.pjson.scripts.prepack = nps.series(`${rmrf} lib`, 'tsc -b')
      if (this.eslint) {
        this.pjson.scripts.posttest = 'eslint . --ext .ts --config .eslintrc'
      }
    }

		this.pjson.keywords = defaults.keywords || 'contentstack'
    this.pjson.homepage = defaults.homepage || `https://github.com/${this.pjson.repository}`
    this.pjson.bugs = defaults.bugs || `https://github.com/${this.pjson.repository}/issues`

		this.pjson.name = this.answers.name || defaults.name
    this.pjson.description = this.answers.description || defaults.description
    this.pjson.license = this.answers.license || defaults.license
    this.pjson.version = this.answers.version || defaults.version
    this.pjson.author = this.answers.author || defaults.author
    this.pjson.engines.node = defaults.engines.node
	}

	writing() {
		let dir = path.join(process.cwd(), this.answers.name)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir)

		this.destinationRoot(dir)
		process.chdir(this.destinationRoot())

		this.sourceRoot(path.join(__dirname, '../templates'))

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

    if (this.ts) {
      this.fs.copyTpl(this.templatePath('tsconfig.json'), this.destinationPath('tsconfig.json'), this)
    }

    if (this.fs.exists(this.destinationPath('./package.json'))) {
      fixpack(this.destinationPath('./package.json'), require('@oclif/fixpack/config.json'))
    }

    if (_.isEmpty(this.pjson.oclif)) delete this.pjson.oclif
    this.pjson.files = _.uniq((this.pjson.files || []).sort())

    this.fs.writeJSON(this.destinationPath('./package.json'), sortPjson(this.pjson))
    this.fs.copyTpl(this.templatePath('editorconfig'), this.destinationPath('.editorconfig'), this)
    this.fs.copyTpl(this.templatePath('README.md.ejs'), this.destinationPath('README.md'), this)

    if (this.pjson.license === 'MIT') {
      this.fs.copyTpl(this.templatePath('LICENSE.mit'), this.destinationPath('LICENSE'), this)
    }

    this.fs.write(this.destinationPath('.gitignore'), this._gitignore())
    this._writePlugin()
	}

	install() {
		const dependencies = []
		const devDependencies = []

		const dev = {'save-dev': true}
		const save = {save: true}

		dependencies.push(	
      '@contentstack/cli-command',
      '@oclif/config@^1',
      '@oclif/command@^1',
    )

    devDependencies.push(
      '@oclif/dev-cli@^1',
      '@oclif/plugin-help@^3',
      'globby@^10',
    )

    devDependencies.push(
      'mocha@^5',
      'nyc@^14',
      'chai@^4',
      '@oclif/test@^1',  
    )

    if (this.ts) {
      dependencies.push(
        'tslib@^1',
      )
      devDependencies.push(
        '@types/node@^10',
        'typescript@^3.3',
        'ts-node@^8',
      )
    }

    return Promise.all([
    	this.npmInstall(dependencies, {...save}),
    	this.npmInstall(devDependencies, {...dev, ignoreScripts: true}),
    ]).then(() => {})
	}

	end() {
  	this.spawnCommandSync(path.join('.', 'node_modules/.bin/oclif-dev'), ['readme'])
    console.log(`\nCreated ${this.pjson.name} in ${this.destinationRoot()}`)
  }
}