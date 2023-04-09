import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, assert, createSandbox } from 'sinon';
import BranchDiffUtility from '../../../src/utils/branch-diff-utility';
import { cliux, HttpClient } from '@contentstack/cli-utilities';
import { mockData } from "../mock/data"

let baseUrl = 'http://dev16-branches.csnonprod.com/api/compare';

describe('Branch Diff Utility', () => {
  let utilityClient =  new BranchDiffUtility(mockData.flags);
  let apiRequestStub;
  before(function () {
    // runs once before the first test in this block
    //const httpClientStub = stub(HttpClient.prototype, 'get');
     apiRequestStub = stub().callsFake(function (baseUrl) {
      if (baseUrl) {
        return Promise.resolve(mockData.branchDiff);
      } else {
        return Promise.reject({ errorMessage: 'invalid credentials' });
      }
    });
  });
  after(function () {
    // runs once before the first test in this block
    apiRequestStub.restore();
  });
    it('API request with valid details, should be successful', async function () {
      const stub1 = stub(BranchDiffUtility.prototype, 'apiRequest').resolves(mockData.branchDiff);
      expect(stub1.calledOnce).to.be.true;
      stub1.restore();
    });

    it('Fetch Branch diff with valid details, should be successful', async function () {
      const stub1 = stub(BranchDiffUtility.prototype, 'fetchBranchesDiff');
     // const result = await utilityClient.apiRequest(baseUrl);
      expect(stub1.calledOnce).to.be.true;
      //expect(result).to.be.equal(mockData.branchDiff);
      stub1.restore();
    });
});

// const result = await authHandler.login(credentials.email, credentials.password);
// expect(result).to.be.equal(user);