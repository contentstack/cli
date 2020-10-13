let localDep = {
  '@contentstack/auth': 'file:./contentstack-auth.tgz',
  '@contentstack/contentstack-export': 'file:./contentstack-contentstack-export.tgz',
  '@contentstack/contentstack-import': 'file:./contentstack-contentstack-import.tgz',
  '@contentstack/contentstack-bulk-publish': 'file:./contentstack-contentstack-bulk-publish.tgz',
  '@contentstack/contentstack-management': 'file:../../dependency/contentstack-contentstack-management-0.1.0.tgz',
}
const shell = require('shelljs')
let fs = require('fs')
// eslint-disable-next-line node/no-unsupported-features/node-builtins
fs.copyFileSync('./package.json', './package.json-bck')
// eslint-disable-next-line no-console
console.log('Took backup for original package.json to package.json-bck')
let packageJSON = fs.readFileSync('./package.json')

packageJSON = JSON.parse(packageJSON)
Object.keys(localDep).forEach(function (key) {
  packageJSON.dependencies[key] = localDep[key]
  shell.mkdir('-p', '../../build/@contentstack/packages')
  let from = `../../build/${key.replace('/', '-').replace('@', '')}-*.tgz`
  let to = `../../build/@contentstack/packages/${key.replace('/', '-').replace('@', '')}.tgz`
  shell.mv(from, to)
})
let data = JSON.stringify(packageJSON)
fs.writeFileSync('./package.json', data)
// eslint-disable-next-line no-console
console.log('Pointed cli packages to local tar ball.')
shell.exec('npm pack')
shell.mv('./package.json-bck', './package.json')

// shell.mv('../../build/contentstack-contentstack-bulk-publish-*.tgz', '../../build/contentstack-contentstack-bulk-publish.tgz')
// shell.mv('../../build/contentstack-contentstack-import-*.tgz', '../../build/contentstack-contentstack-import.tgz')
shell.mv('./contentstack-cli-*.tgz', '../../build/@contentstack/packages/contentstack-cli.tgz')
// shell.mv('../../build/contentstack-contentstack-export-*.tgz', '../../build/contentstack-contentstack-export.tgz')
// shell.mv('../../build/contentstack-auth-*.tgz', '../../build/contentstack-auth.tgz')
