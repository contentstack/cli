const messages = require('../messages/index.json')
const { fancy } = require('fancy-test');
const { expect } = require('chai');
const fs = require('fs');
const { runCommand } = require('@oclif/test')
const sinon = require('sinon');
const inquirer = require('inquirer');
const { PassThrough } = require('stream');
const {
    inquireAppType,
    inquireApp,
    inquireCloneDirectory
} = require('../lib/bootstrap/interactive')

describe("cm:bootstrap", function () {
    
    sandbox = sinon.createSandbox()
    sandbox.stub(fs, 'createWriteStream').returns(new PassThrough())
    sandbox.stub(process, 'chdir').returns(undefined);
    sandbox.stub(inquirer, 'registerPrompt').returns(undefined);
    sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
    name: 'React JS',
    }));
    it('Bootrap a sample react app in current working directory', async () => {
        const { stdout } = await runCommand(['cm:bootstrap', "--project-dir", process.cwd()]);
        console.log("🚀 ~ it ~ stdout:", stdout)
        expect(stdout).to.equal('messages.CLI_BOOTSTRAP_SUCCESS');
      });
    sandbox.restore();
})