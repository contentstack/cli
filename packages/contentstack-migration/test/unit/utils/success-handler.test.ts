import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import * as loggerModule from '../../../src/utils/logger';
import successHandler from '../../../src/utils/success-handler';

describe('Success Handler', () => {
  let logStub: SinonStub;

  beforeEach(() => {
    restore();
    logStub = stub(loggerModule, 'success');
  });

  afterEach(() => {
    restore();
  });

  it('should call success with default message when data, type, or method is missing', () => {
    successHandler(null, 'Content type', 'POST');

    expect(logStub.calledWith('Content type successfully completed')).to.be.true;
  });

  it('should call success with default message when data is missing', () => {
    successHandler(undefined, 'Entry', 'GET');

    expect(logStub.calledWith('Entry successfully completed')).to.be.true;
  });

  it('should call success with default message when type is missing', () => {
    successHandler({ id: '123' }, '', 'PUT');

    expect(logStub.calledWith(' successfully completed')).to.be.true;
  });

  it('should call success with default message when method is missing', () => {
    successHandler({ id: '123' }, 'Entry', '');

    expect(logStub.calledWith('Entry successfully completed')).to.be.true;
  });

  it('should not call success when all parameters are provided (commented out)', () => {
    successHandler({ id: '123' }, 'Entry', 'POST');

    // The success call with message is commented out in the code
    // So success should NOT be called when all parameters are provided
    expect(logStub.called).to.be.false;
  });
});
