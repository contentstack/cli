import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, spy, assert } from 'sinon';
import Functions from '../../../src/commands/launch/functions';
import { FunctionsDirectoryNotFoundError } from '../../../src/util/cloud-function/errors/cloud-function.errors';
import fs from 'fs';

describe('Functions Command', () => {
  const doesFunctionsFolderExist = fs.existsSync('./functions');
  it('should throw an error if functions folder does not exist in root directory or should log folder exists', async () => {
    const errorFunction = spy(() => {
      throw new FunctionsDirectoryNotFoundError(process.cwd());
    });
    const successFunction = () => console.log('Functions folder exists');

    if (doesFunctionsFolderExist === false) {
      expect(errorFunction).to.throw(Error, `No functions directory found at '${process.cwd()}'`);
    } else {
      successFunction();
    }
  });

  it('Should show "No Serverless functions detected" when no files are there in functions folder or "Detected Serverless functions" if files are detected', async () => {
    if (doesFunctionsFolderExist === false) {
      fs.mkdirSync('./functions');
    }
    const processStub = stub(process, 'exit');
    const logStub = stub(console, 'log');
    const doFilesExistInFolder = fs.readdirSync('./functions');
    await Functions.run(['-p', '4050']);
    if (doFilesExistInFolder.length === 0) {
      assert.calledOnce(processStub);
      fs.writeFileSync(
        './functions/user.js',
        `export default function user(req, res) {
            res.json({ data: 'Welcome' });
          }
          `,
      );
    } else {
      assert.notCalled(processStub);
      assert.calledWithExactly(logStub, 'Detected Serverless functions...');
      assert.calledWithExactly(logStub, `Serving on port 4050`);
    }
    processStub.restore();
    logStub.restore();
  });
});
