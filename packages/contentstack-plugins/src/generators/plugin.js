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

const versionRegex = /^(\d+\.)?(\d+\.)?(\*|\d+)$/; // https://stackoverflow.com/questions/82064/a-regex-for-version-number-parsing

const invalidNameError = 'Please enter a name without spaces, use \'-\' or \'_\' instead'

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
    
    if (this.mocha && !fs.existsSync('test')) {
      this.fs.copyTpl(this.templatePath(`test/command.test.${this._ext}.ejs`), this.destinationPath(`test/commands/hello.test.${this._ext}`), {...opts, name: 'hello'})
    }
  }

  _eslintignore() {
    const existing = this.fs.exists(this.destinationPath('.eslintignore')) ? this.fs.read(this.destinationPath('.eslintignore')).split('\n') : []
    return _([
      this.ts && '/lib',
    ])
    .concat(existing)
    .compact()
    .uniq()
    .sort()
    .join('\n') + '\n'
  } 

	async prompting() {
		const defaults = {
			name: 'plugin-template',
			version: '0.0.0',
			license: 'MIT',
      author: this.user.git.name(),
      dependencies: {},
			engines: {
        node: '>=8.0.0',
        ...this.pjson.engines,
      }
		}

    async function validateName(input) {
      if (input.split(' ').length > 1)
        return invalidNameError
      return true
    }

    async function validateVersion(input) {
      if (!input.match(versionRegex)) {
        return 'Please Enter a valid version number X.X.X where X is an integer'
      }
      return true
    }

    this.pjson = {
      scripts: {},
      engines: {},
      devDependencies: {},
      dependencies: {},
      oclif: {},
      // ...this.fs.readJSON('package.json', {}),
    }

		let prompts = [
			{
				type: 'input',
				name: 'name',
				message: 'npm package name',
				default: defaults.name,
        validate: validateName,
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
        validate: validateVersion,
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
				message: 'Who is the GitHub owner of repository (https://github.com/OWNER/repo)',
				default: defaults.author,
				when: !this.pjson.author,
			},
      {
        type: 'input',
        name: 'repository',
        message: 'What is the GitHub name of repository (https://github.com/owner/REPO)',
        default: (answers) => (this.pjson.repository || answers.name || this.pjson.name).split('/').pop(),
        when: !this.pjson.repository,
      },
			{
        type: 'confirm',
        name: 'typescript',
        message: 'TypeScript',
        default: () => true,
      },
      {
        type: 'confirm',
        name: 'eslint',
        message: 'Do you want to use ESLint',
        default: () => true,
      },
      {
        type: 'confirm',
        name: 'mocha',
        message: 'Do you want to use Mocha',
        default: () => true,
      }
		]

		this.answers = await this.prompt(prompts)

		this.options = {
			typescript: this.answers.typescript,
      mocha: this.answers.mocha,
      eslint: this.answers.eslint
		}

		this.ts = this.options.typescript
    this.eslint = this.options.eslint
    this.mocha = this.options.mocha

    this.pjson.repository = `https://github.com/${this.answers.repository}` || `https://github.com/${defaults.repository}`
    this.pjson.keywords = defaults.keywords || ['contentstack', 'plugin', 'cli']
    this.pjson.homepage = defaults.homepage || `${this.pjson.repository}`
    this.pjson.bugs = defaults.bugs || `${this.pjson.repository}/issues`

    this.pjson.name = this.answers.name || defaults.name
    this.pjson.description = this.answers.description || defaults.description
    this.pjson.license = this.answers.license || defaults.license
    this.pjson.version = this.answers.version || defaults.version
    this.pjson.author = this.answers.author || defaults.author
    this.pjson.files = this.answers.files || defaults.files || [(this.ts ? '/lib' : '/src')]
    this.pjson.engines.node = defaults.engines.node

    if (this.eslint) {
      this.pjson.scripts.posttest = 'eslint .'
    }

    if (this.mocha) {
      this.pjson.scripts.test = `nyc ${this.ts ? '--extension .ts ' : ''}mocha --forbid-only "test/**/*.test.${this._ext}"`
    } else {
      this.pjson.scripts.test = 'echo NO TESTS'
    }

		if (this.ts) {
      this.pjson.scripts.prepack = nps.series(`${rmrf} lib`, 'tsc -b')
      if (this.eslint) {
        this.pjson.scripts.posttest = 'eslint . --ext .ts --config .eslintrc'
      }
    }

    this.pjson.scripts.prepack = nps.series(this.pjson.scripts.prepack, 'oclif-dev manifest', 'oclif-dev readme')
    this.pjson.scripts.postpack = `${rmf} oclif.manifest.json`
    this.pjson.scripts.version = nps.series('oclif-dev readme', 'git add README.md')
    this.pjson.files.push('/oclif.manifest.json')
    this.pjson.files.push('/npm-shrinkwrap.json')
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
      if (this.mocha) {
        this.fs.copyTpl(this.templatePath('test/tsconfig.json'), this.destinationPath('test/tsconfig.json'), this)
      }
    }

    if (this.eslint) {
      const eslintignore = this._eslintignore()
      if (eslintignore.trim()) this.fs.write(this.destinationPath('.eslintignore'), this._eslintignore())
      if (this.ts) {
        this.fs.copyTpl(this.templatePath('eslintrc.typescript'), this.destinationPath('.eslintrc'), this)
      } else {
        this.fs.copyTpl(this.templatePath('eslintrc'), this.destinationPath('.eslintrc'), this)
      }
    }
    
    if (this.mocha) {
      this.fs.copyTpl(this.templatePath('test/mocha.opts'), this.destinationPath('test/mocha.opts'), this)
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
      '@contentstack/cli-command@latest',
      '@oclif/config@^1',
      '@oclif/command@^1',
    )

    devDependencies.push(
      '@oclif/dev-cli@^1',
      '@oclif/plugin-help@^3',
      'globby@^10',
    )

    devDependencies.push(
      'mocha@^8.3.1',
      'nyc@^14',
      'chai@^4',
      '@oclif/test@^1',  
    )

    if (this.mocha) {
      devDependencies.push(
        'mocha@^8.3.1',
        'nyc@^14',
        'chai@^4',
      )
    }
    if (this.ts) {
      dependencies.push(
        'tslib@^1',
      )
      devDependencies.push(
        '@types/node@^10',
        'typescript@^3.3',
        'ts-node@^8',
      )
      if (this.mocha) {
        devDependencies.push(
          '@types/chai@^4',
          '@types/mocha@^5',
        )
      }
    }
    if (this.eslint) {
      devDependencies.push(
        'eslint@^5.13',
        'eslint-config-oclif@^3.1',
      )
      if (this.ts) {
        devDependencies.push(
          'eslint-config-oclif-typescript@^0.1',
        )
      }
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