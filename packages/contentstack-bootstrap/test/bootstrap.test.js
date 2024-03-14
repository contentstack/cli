const { expect, test } = require('@oclif/test')
const messages = require('../messages/index.json')

const {
    inquireAppType,
    inquireApp,
    inquireCloneDirectory
} = require('../lib/bootstrap/interactive')

describe("cm:bootstrap", function () {
    test
    .stdout()
    .stub(inquireAppType, () => new Promise(resolve => resolve({name: 'Sample App', value: 'sampleapp'})))
    .stub(inquireApp, () => new Promise(resolve => resolve({ displayName: 'React JS', configKey: 'reactjs' })))
    .stub(inquireCloneDirectory, () => new Promise(resolve => resolve(process.cwd())))
    .command(['cm:bootstrap'])
    .it('Bootrap a sample react app in current working directory', ctx => {
        expect(ctx.stdout).to.contain(messages.CLI_BOOTSTRAP_SUCCESS)
    })
})